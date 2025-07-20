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
    const client = getRedisClient();
    const key = `newsletter:${id}`;
    
    console.log(`[DEBUG] Updating read status for newsletter:`, { id, key, isRead });
    
    // Get the existing data
    const data = await client.hgetall(key);
    console.log(`[DEBUG] Retrieved data from Redis:`, data);
    
    if (!data || Object.keys(data).length === 0) {
      console.error(`[ERROR] Newsletter ${id} not found in Redis. Key: ${key}`);
      // Try to list all newsletter keys to help with debugging
      try {
        // @ts-ignore - Using internal Redis commands for debugging
        const keys = await client.keys('newsletter:*');
        console.log(`[DEBUG] Available newsletter keys:`, keys);
      } catch (e) {
        console.error('[DEBUG] Could not list newsletter keys:', e);
      }
      return false;
    }
    
    // Parse the metadata or initialize if it doesn't exist
    const metadata = data.metadata ? JSON.parse(data.metadata as string) : {};
    console.log(`[DEBUG] Current metadata:`, metadata);
    
    // Update the read status and timestamp
    const now = new Date().toISOString();
    const updatedMetadata = {
      ...metadata,
      isRead,
      updatedAt: now,
      ...(isRead && { readAt: now })
    };
    
    console.log(`[DEBUG] Updating metadata to:`, updatedMetadata);
    
    // Update the hash
    const result = await client.hset(key, 'metadata', JSON.stringify(updatedMetadata));
    console.log(`[DEBUG] Redis HSET result:`, result);
    
    // Verify the update
    const updatedData = await client.hgetall(key);
    console.log(`[DEBUG] Verification - Updated data:`, updatedData);
    
    return true;
  } catch (error) {
    console.error('[ERROR] Error updating newsletter read status:', error);
    return false;
  }
}
