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
      console.log(`[REDIS] Raw result for ${key}:`, JSON.stringify(result, null, 2));
      
      if (!result) {
        console.log(`[REDIS] No data found for key: ${key}`);
        return null;
      }
      
      // Log the type and structure of the result
      console.log(`[REDIS] Result type:`, typeof result);
      console.log(`[REDIS] Result keys:`, Object.keys(result));
      
      // If metadata exists as a string, try to parse it
      if (result.metadata && typeof result.metadata === 'string') {
        try {
          const parsed = JSON.parse(result.metadata);
          console.log(`[REDIS] Parsed metadata:`, parsed);
          result.metadata = parsed;
        } catch (e) {
          console.error(`[REDIS] Error parsing metadata for ${key}:`, e);
        }
      }
      
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

type UpdateResult = 
  | { success: true }
  | { success: false; error: string; details?: any };

export async function updateNewsletterReadStatus(id: string, isRead: boolean): Promise<UpdateResult | boolean> {
  const client = getRedisClient();
  // Handle both prefixed and non-prefixed IDs
  const key = id.startsWith('newsletter:') ? id : `newsletter:${id}`;
  
  console.log(`[DEBUG] === Starting updateNewsletterReadStatus ===`);
  console.log(`[DEBUG] Input - id: ${id}, isRead: ${isRead}, resolved key: ${key}`);
  
  try {
    // Get the existing data
    console.log(`[DEBUG] Fetching data from Redis for key: ${key}`);
    const data = await client.hgetall(key);
    
    if (!data) {
      const error = `No data returned from Redis for key: ${key}`;
      console.error(`[ERROR] ${error}`);
      return { success: false, error, details: { key } };
    }
    
    console.log(`[DEBUG] Retrieved data for ${key}:`, {
      keys: Object.keys(data),
      hasMetadata: 'metadata' in data,
      metadataType: data.metadata ? typeof data.metadata : 'undefined'
    });
    
    if (Object.keys(data).length === 0) {
      const error = `Empty data object returned from Redis for key: ${key}`;
      console.error(`[ERROR] ${error}`);
      return { 
        success: false, 
        error,
        details: { 
          key,
          availableFields: Object.keys(data) 
        } 
      };
    }
    
    // Parse the existing metadata
    let metadata: any = {};
    if (data.metadata) {
      try {
        metadata = typeof data.metadata === 'string' 
          ? JSON.parse(data.metadata) 
          : data.metadata;
        console.log(`[DEBUG] Successfully parsed metadata for ${key}`);
      } catch (e) {
        const error = `Failed to parse metadata for ${key}`;
        console.error(`[ERROR] ${error}:`, e);
        return { 
          success: false, 
          error,
          details: { 
            key,
            metadataRaw: data.metadata,
            error: e instanceof Error ? e.message : String(e)
          }
        };
      }
    } else {
      console.log(`[DEBUG] No metadata found for ${key}, initializing new metadata`);
    }
    
    // Prepare the update
    const updatedAt = new Date().toISOString();
    const updatedMetadata = {
      ...metadata,
      isRead,
      updatedAt,
      readAt: isRead ? (metadata.readAt || updatedAt) : null
    };
    
    console.log(`[DEBUG] Updating newsletter ${key} with:`, updatedMetadata);
    
    // Perform the update
    try {
      await client.hset(key, 'metadata', JSON.stringify(updatedMetadata));
      console.log(`[DEBUG] Successfully updated newsletter ${key}`);
      return { success: true };
    } catch (e) {
      const error = `Failed to update newsletter ${key}`;
      console.error(`[ERROR] ${error}:`, e);
      return { 
        success: false, 
        error,
        details: {
          key,
          error: e instanceof Error ? e.message : String(e)
        }
      };
    }
  } catch (error) {
    const errorMessage = 'Error updating newsletter read status';
    console.error(`[ERROR] ${errorMessage}:`, error);
    return { 
      success: false, 
      error: errorMessage,
      details: error instanceof Error ? error.message : String(error)
    };
  }
}
