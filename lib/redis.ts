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

  async get(key: string): Promise<string | null> {
    try {
      console.log(`[REDIS] Getting string value for key: ${key}`);
      // Type assertion to access the underlying Redis client's get method
      const result = await (this.client as any).get(key) as string | null;
      console.log(`[REDIS] Get result for ${key}:`, result);
      return result;
    } catch (error) {
      console.error(`[REDIS] Error in get for key ${key}:`, error);
      throw error;
    }
  }

  async type(key: string): Promise<string> {
    try {
      console.log(`[REDIS] Getting type of key: ${key}`);
      // @ts-ignore - Using internal Redis command for TYPE
      const result = await this.client.sendCommand(['TYPE', key]);
      console.log(`[REDIS] Type of ${key}:`, result);
      return result as string;
    } catch (error) {
      console.error(`[REDIS] Error getting type for key ${key}:`, error);
      throw error;
    }
  }

  async getRaw(key: string): Promise<{type: string, value: any}> {
    try {
      console.log(`[REDIS] Getting raw value for key: ${key}`);
      // First get the type
      const type = await this.type(key);
      
      if (type === 'none') {
        return { type, value: null };
      }
      
      let value: any;
      
      // Get the value based on type
      if (type === 'string') {
        value = await this.get(key);
      } else if (type === 'hash') {
        value = await this.hgetall(key);
      } else if (type === 'list') {
        // @ts-ignore - Using internal Redis command for LRANGE
        value = await this.client.sendCommand(['LRANGE', key, '0', '-1']);
      } else if (type === 'set') {
        // @ts-ignore - Using internal Redis command for SMEMBERS
        value = await this.client.sendCommand(['SMEMBERS', key]);
      } else if (type === 'zset') {
        // @ts-ignore - Using internal Redis command for ZRANGE
        value = await this.client.sendCommand(['ZRANGE', key, '0', '-1', 'WITHSCORES']);
      } else {
        throw new Error(`Unsupported Redis type: ${type}`);
      }
      
      console.log(`[REDIS] Raw value for ${key} (${type}):`, value);
      return { type, value };
    } catch (error) {
      console.error(`[REDIS] Error getting raw value for key ${key}:`, error);
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
    // Get the raw value and its type
    console.log(`[DEBUG] Getting raw value for key: ${key}`);
    const { type: keyType, value: rawValue } = await client.getRaw(key);
    
    if (keyType === 'none') {
      console.error(`[ERROR] Key does not exist: ${key}`);
      return { 
        success: false, 
        error: 'Newsletter not found',
        details: { key, keyType }
      };
    }
    
    console.log(`[DEBUG] Retrieved raw value for ${key} (${keyType}):`, rawValue);
    
    // Prepare the metadata update
    const updatedAt = new Date().toISOString();
    const readAt = isRead ? (rawValue?.readAt || updatedAt) : null;
    
    // Create the updated metadata
    const updatedMetadata = {
      ...(typeof rawValue === 'object' ? rawValue : {}),
      isRead,
      updatedAt,
      readAt
    };
    
    console.log(`[DEBUG] Updating ${key} with:`, updatedMetadata);
    
    // Save the updated metadata based on the key type
    if (keyType === 'hash') {
      // For hash type, use HSET to update just the metadata field
      await client.hset(key, 'metadata', JSON.stringify(updatedMetadata));
    } else {
      // For other types, convert to string and update
      await client.hset(key, { 
        content: typeof rawValue === 'string' ? rawValue : JSON.stringify(rawValue),
        metadata: JSON.stringify(updatedMetadata)
      });
    }
    
    console.log(`[DEBUG] Successfully updated ${key}`);
    return { success: true };
  } catch (error) {
    const errorMessage = 'Error updating newsletter read status';
    console.error(`[ERROR] ${errorMessage}:`, error);
    
    // More detailed error information
    let keyType = 'unknown';
    try {
      keyType = await client.type(key);
    } catch (e) {
      console.error(`[ERROR] Failed to get key type for ${key}:`, e);
    }
    
    const errorDetails = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      key,
      isRead,
      keyType
    };
    
    return { 
      success: false, 
      error: errorMessage,
      details: errorDetails
    };
  }
}
