import { Redis } from '@upstash/redis';

// Simple Redis client wrapper
class RedisClientWrapper {
  private client: Redis;
  
  constructor() {
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
      throw new Error('Missing Redis connection environment variables');
    }
    
    this.client = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });
  }
  
  async hgetall(key: string): Promise<Record<string, any> | null> {
    try {
      console.log(`[REDIS] Getting key: ${key}`);
      const result = await this.client.hgetall(key);
      console.log(`[REDIS] Got result for ${key}:`, result);
      return result as Record<string, any>;
    } catch (error) {
      console.error(`[REDIS] Error in hgetall for key ${key}:`, error);
      throw error;
    }
  }
  
  async hset(key: string, ...args: any[]): Promise<number> {
    try {
      console.log(`[REDIS] Setting key: ${key} with args:`, args);
      const fields: Record<string, string> = {};
      
      for (let i = 0; i < args.length; i += 2) {
        if (i + 1 < args.length) {
          const field = String(args[i]);
          const value = args[i + 1];
          fields[field] = typeof value === 'object' ? JSON.stringify(value) : String(value);
        }
      }
      
      const result = await this.client.hset(key, fields);
      console.log(`[REDIS] Set result for ${key}:`, result);
      return result;
    } catch (error) {
      console.error(`[REDIS] Error in hset for key ${key}:`, error);
      throw error;
    }
  }
  
  async hdel(key: string, ...fields: string[]): Promise<number> {
    try {
      console.log(`[REDIS] Deleting fields from ${key}:`, fields);
      const result = await this.client.hdel(key, ...fields);
      console.log(`[REDIS] Delete result for ${key}:`, result);
      return result;
    } catch (error) {
      console.error(`[REDIS] Error in hdel for key ${key}:`, error);
      throw error;
    }
  }
  
  async scan(cursor: number, options: { match?: string; count?: number } = {}): Promise<[string, string[]]> {
    try {
      console.log(`[REDIS] Scanning with cursor ${cursor}, match: ${options.match || '*'}`);
      // Prepare the options object with defaults
      const scanOptions = {
        match: options.match || '*',
        count: options.count || 10 // Default count if not specified
      };
      const result = await this.client.scan(cursor, scanOptions);
      console.log(`[REDIS] Scan result (cursor: ${cursor}):`, result);
      return result as [string, string[]];
    } catch (error) {
      console.error(`[REDIS] Error in scan:`, error);
      throw error;
    }
  }
}

// Singleton instance
let redisInstance: RedisClientWrapper | null = null;

export function getRedisClient(): RedisClientWrapper {
  if (!redisInstance) {
    redisInstance = new RedisClientWrapper();
  }
  return redisInstance;
}

// Type for newsletter data from Redis
interface NewsletterData {
  id: string;
  metadata?: string;
  [key: string]: any;
}

export async function updateNewsletterReadStatus(id: string, isRead: boolean): Promise<boolean> {
  try {
    const client = getRedisClient();
    const key = `newsletter:${id}`;
    
    console.log(`[DEBUG] Updating read status for newsletter:`, { id, key, isRead });
    
    // Get the existing data
    console.log(`[DEBUG] Fetching data from Redis for key: ${key}`);
    const data = await client.hgetall(key);
    console.log(`[DEBUG] Raw data from Redis for ${key}:`, JSON.stringify(data, null, 2));
    
    if (!data || Object.keys(data).length === 0) {
      console.error(`[ERROR] Newsletter ${id} not found in Redis. Key: ${key}`);
      
      // Get more detailed debug info
      try {
        console.log('[DEBUG] Attempting to scan for all newsletter keys...');
        const [cursor, keys] = await client.scan(0, { match: 'newsletter:*', count: 50 });
        console.log(`[DEBUG] Found ${keys.length} newsletter keys. First 10:`, keys.slice(0, 10));
        console.log(`[DEBUG] Next cursor: ${cursor}`);
        
        // Try to get one of the keys directly
        if (keys.length > 0) {
          const testKey = keys[0];
          console.log(`[DEBUG] Testing direct access to key: ${testKey}`);
          const testData = await client.hgetall(testKey);
          console.log(`[DEBUG] Direct access result for ${testKey}:`, JSON.stringify(testData, null, 2));
        }
      } catch (e) {
        console.error('[DEBUG] Error during debug operations:', e);
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
