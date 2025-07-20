import { Redis } from '@upstash/redis';

// Create a type for the Redis client instance
type RedisClient = {
  hgetall: (key: string) => Promise<Record<string, any> | null>;
  hset: (key: string, ...args: any[]) => Promise<number>;
};

// Type for newsletter data from Redis
interface NewsletterData {
  id: string;
  metadata?: string;
  [key: string]: any;
}

let redis: RedisClient | null = null;

export function getRedisClient(): RedisClient {
  if (!redis) {
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
      throw new Error('Missing Redis connection environment variables');
    }
    
    // Initialize the Redis client with type assertion
    const redisInstance = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });
    
    // Create a proxy object with just the methods we need
    redis = {
      hgetall: async (key: string) => {
        const result = await redisInstance.hgetall(key);
        return result ? (result as Record<string, any>) : null;
      },
      hset: async (key: string, ...args: any[]) => {
        // For hset, we'll use the pipeline approach which is more type-safe
        const pipeline = redisInstance.pipeline();
        
        // Process key-value pairs
        for (let i = 0; i < args.length; i += 2) {
          if (i + 1 < args.length) {
            const field = String(args[i]);
            let value = args[i + 1];
            
            // Stringify objects and arrays
            if (typeof value === 'object' && value !== null) {
              value = JSON.stringify(value);
            } else {
              value = String(value);
            }
            
            pipeline.hset(key, { [field]: value });
          }
        }
        
        // Execute the pipeline
        const results = await pipeline.exec();
        return results ? results.length : 0;
      }
    };
  }
  
  return redis;
}

export async function updateNewsletterReadStatus(id: string, isRead: boolean): Promise<boolean> {
  try {
    const redis = getRedisClient();
    if (!id) {
      console.error('Invalid newsletter ID:', id);
      return false;
    }
    
    const key = `newsletter:${id}`;
    const now = new Date().toISOString();
    
    // Get the current newsletter data
    const newsletter = await redis.hgetall(key);
    if (!newsletter) {
      console.error('Newsletter not found:', id);
      return false;
    }
    
    // Parse the current metadata or initialize if it doesn't exist
    const currentMetadata = newsletter.metadata 
      ? JSON.parse(newsletter.metadata as string)
      : {};
    
    // Update the read status and timestamp
    const updatedMetadata = {
      ...currentMetadata,
      isRead,
      readAt: isRead ? now : null,
      updatedAt: now
    };
    
    // Update the newsletter in Redis with the new metadata
    await redis.hset(key, 
      'metadata', JSON.stringify(updatedMetadata),
      'updatedAt', now
    );
    
    console.log(`Successfully ${isRead ? 'marked as read' : 'marked as unread'}:`, id);
    return true;
    
  } catch (error) {
    console.error('Error updating newsletter read status:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message, error.stack);
    }
    return false;
  }
}
