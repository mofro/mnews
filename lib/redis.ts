import { Redis } from '@upstash/redis';

// Simple Redis client wrapper
class RedisClientWrapper {
  private client: Redis;
  private connectionUrl: string;
  
  constructor() {
    // Clean and validate environment variables
    const url = process.env.KV_REST_API_URL?.trim();
    const token = process.env.KV_REST_API_TOKEN?.trim();
    
    if (!url || !token) {
      const missingVars = [];
      if (!url) missingVars.push('KV_REST_API_URL');
      if (!token) missingVars.push('KV_REST_API_TOKEN');
      throw new Error(`Missing required Redis environment variables: ${missingVars.join(', ')}`);
    }
    
    // Store cleaned URL for logging (without token)
    this.connectionUrl = new URL(url).origin;
    
    this.client = new Redis({
      url,
      token,
    });
  }
  
  /**
   * Tests the Redis connection by sending a PING command
   * @returns Promise that resolves to true if connection is successful, false otherwise
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('[REDIS] Testing connection...');
      const result = await this.client.ping();
      const isConnected = result === 'PONG';
      console.log(`[REDIS] Connection test ${isConnected ? 'succeeded' : 'failed'}`);
      return isConnected;
    } catch (error) {
      console.error('[REDIS] Connection test failed:', error);
      return false;
    }
  }

  /**
   * Tests the Redis connection by sending a PING command
   * @returns Promise with connection test results
   */
  async testConnectionDetailed(): Promise<{ success: boolean; error?: string; pingTime?: number }> {
    try {
      console.log(`[REDIS] Testing connection to ${this.connectionUrl}...`);
      const startTime = Date.now();
      const pong = await this.client.ping();
      const pingTime = Date.now() - startTime;
      
      if (pong !== 'PONG') {
        console.error('[REDIS] Unexpected PING response:', pong);
        return { success: false, error: 'Unexpected PING response' };
      }
      
      console.log(`[REDIS] Connection successful! Ping: ${pingTime}ms`);
      return { success: true, pingTime };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[REDIS] Connection test failed:', errorMessage);
      return { 
        success: false, 
        error: `Connection failed: ${errorMessage}` 
      };
    }
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
  
  /**
   * Get elements in a list by range
   * @param key The key of the list
   * @param start The start index (0-based)
   * @param stop The end index (-1 for all elements)
   * @returns Array of elements in the specified range
   */
  /**
   * Get elements in a list by range
   * @param key The key of the list
   * @param start The start index (0-based)
   * @param stop The end index (-1 for all elements)
   * @returns Array of elements in the specified range
   */
  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    try {
      console.log(`[REDIS] Getting list range ${start} to ${stop} for key: ${key}`);
      // Using the lrange method from @upstash/redis
      const result = await (this.client as any).lrange(key, start, stop);
      console.log(`[REDIS] LRANGE result for ${key}:`, result);
      return Array.isArray(result) ? result.map(String) : [];
    } catch (error) {
      console.error(`[REDIS] Error in lrange for key ${key}:`, error);
      throw error;
    }
  }
  
  /**
   * Insert all the specified values at the head of the list stored at key
   * @param key The key of the list
   * @param elements Elements to insert
   * @returns The length of the list after the push operations
   */
  async lpush(key: string, ...elements: (string | number)[]): Promise<number> {
    try {
      console.log(`[REDIS] Pushing ${elements.length} elements to list: ${key}`);
      // Using the lpush method from @upstash/redis
      const result = await (this.client as any).lpush(key, ...elements);
      console.log(`[REDIS] LPUSH result for ${key}:`, result);
      return typeof result === 'number' ? result : 0;
    } catch (error) {
      console.error(`[REDIS] Error in lpush for key ${key}:`, error);
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
      // Use the type method from @upstash/redis
      const result = await this.client.type(key);
      console.log(`[REDIS] Type of ${key}:`, result);
      return result;
    } catch (error) {
      console.error(`[REDIS] Error getting type for key ${key}:`, error);
      throw error;
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      console.log(`[REDIS] Setting key: ${key}`);
      // Use the set method from @upstash/redis
      await this.client.set(key, value);
      console.log(`[REDIS] Successfully set key: ${key}`);
    } catch (error) {
      console.error(`[REDIS] Error setting key ${key}:`, error);
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

/**
 * Tests the Redis connection
 * @returns Promise with connection test results
 */
export async function testRedisConnection() {
  try {
    const client = getRedisClient();
    const result = await client.testConnectionDetailed();
    return result;
  } catch (error) {
    console.error('Error in testRedisConnection:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      pingTime: -1
    };
  }
}

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

type UpdateResult<T = undefined> = 
  | { success: true; data?: T }
  | { success: false; error: string; details?: any };

interface ArchiveUpdateResult {
  isArchived: boolean;
  timestamp: string;
}

interface ContentUpdateResult {
  contentUpdated: boolean;
  previewText?: string;
  timestamp: string;
}

export async function updateNewsletterArchiveStatus(id: string, isArchived: boolean): Promise<UpdateResult<ArchiveUpdateResult>> {
  const client = getRedisClient();
  const timestamp = new Date().toISOString();
  const key = id.startsWith('newsletter:') ? id : `newsletter:${id}`;
  
  try {
    // First, check if the key exists and get its type
    const keyType = await client.type(key);
    console.log(`[DEBUG] Key type for ${key}: ${keyType}`);

    if (keyType === 'none') {
      console.error(`[ERROR] Key not found: ${key}`);
      return {
        success: false,
        error: 'Newsletter not found',
        details: { key, keyType: 'none' }
      };
    }

    // Create the updated metadata
    const metadata = {
      isArchived: isArchived ? 'true' : 'false',
      updatedAt: timestamp,
      ...(isArchived ? { archivedAt: timestamp } : { archivedAt: null })
    };

    console.log(`[DEBUG] Updating ${key} (${keyType}) with:`, metadata);
    
    if (keyType === 'hash') {
      // For hash type, update the metadata field
      console.log(`[DEBUG] Updating hash key: ${key} with metadata:`, metadata);
      
      // First, get the current hash to understand its structure
      const currentHash = await client.hgetall(key);
      if (!currentHash) {
        throw new Error('Failed to get current hash data');
      }
      
      console.log(`[DEBUG] Current hash for ${key}:`, JSON.stringify(currentHash, null, 2));
      
      // Update the hash with the new metadata
      await client.hset(key, { 
        ...currentHash,
        ...metadata
      });
      
      console.log(`[SUCCESS] Updated archive status for ${key}: isArchived=${isArchived}`);
      
      return {
        success: true,
        data: {
          isArchived,
          timestamp: timestamp
        }
      };
    } else if (keyType === 'string') {
      // For string type, update the entire value
      const currentValue = await client.get(key);
      console.log(`[DEBUG] Current value type for ${key}:`, typeof currentValue);
      console.log(`[DEBUG] Current value for ${key}:`, currentValue);
      
      let data: any = {};
      if (currentValue) {
        try {
          // Try to parse if it's a JSON string
          data = JSON.parse(currentValue);
          console.log(`[DEBUG] Parsed data:`, data);
        } catch (e) {
          console.error(`[ERROR] Failed to parse current value for ${key}:`, e);
          // If we can't parse the current value, create a new object with the content
          data = { content: currentValue };
        }
      }
      
      // Update the metadata
      data.metadata = metadata;
      
      console.log(`[DEBUG] Setting new value for ${key}:`, data);
      await client.set(key, JSON.stringify(data));
      
      return {
        success: true,
        data: {
          isArchived,
          timestamp: timestamp
        }
      };
    } else {
      // Handle other key types (list, set, zset)
      const errorMessage = `Unsupported key type: ${keyType}`;
      console.error(`[ERROR] ${errorMessage} for key: ${key}`);
      return {
        success: false,
        error: errorMessage,
        details: { key, keyType }
      };
    }
  } catch (error) {
    const errorMessage = 'Error updating newsletter archive status';
    console.error(`[ERROR] ${errorMessage}:`, error);
    
    // Simple error details
    const errorDetails = {
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
    
    return { 
      success: false, 
      error: errorMessage,
      details: errorDetails
    };
  }
}

export async function updateNewsletterContent(
  id: string,
  content: string,
  previewText?: string
): Promise<UpdateResult<ContentUpdateResult>> {
  const client = getRedisClient();
  const timestamp = new Date().toISOString();
  
  try {
    console.log(`[REDIS] Updating content for newsletter: ${id}`);
    
    // Get the existing newsletter data
    const newsletterKey = id.startsWith('newsletter:') ? id : `newsletter:${id}`;
    const existingData = await client.hgetall(newsletterKey);
    
    if (!existingData) {
      console.error(`[REDIS] Newsletter not found: ${id}`);
      return {
        success: false,
        error: 'Newsletter not found',
        details: { key: newsletterKey, keyType: 'none' }
      };
    }
    
    // Parse metadata if it's a string
    let metadata: Record<string, any> = {};
    const existingMetadata = existingData.metadata;
    if (existingMetadata) {
      if (typeof existingMetadata === 'string') {
        try {
          metadata = JSON.parse(existingMetadata);
        } catch (e) {
          console.error(`[REDIS] Error parsing metadata for ${id}:`, e);
        }
      } else if (typeof existingMetadata === 'object' && existingMetadata !== null) {
        metadata = { ...existingMetadata };
      }
    }
    
    // Update the content and metadata
    const updateData: Record<string, string | number> = {
      content: content,
      cleanContent: content, // Store cleaned content in cleanContent field
      updatedAt: timestamp,
      metadata: JSON.stringify({
        ...metadata,
        processingVersion: 'v2',
        processedAt: timestamp,
        wordCount: content.split(/\s+/).length,
      })
    };
    
    // Add preview text if provided
    if (typeof previewText === 'string') {
      updateData.previewText = previewText;
    }
    
    // Update the newsletter in Redis
    await client.hset(newsletterKey, updateData);
    
    console.log(`[REDIS] Successfully updated content for newsletter: ${id}`);
    
    return {
      success: true,
      data: {
        contentUpdated: true,
        previewText: previewText || '',
        timestamp: timestamp
      }
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[REDIS] Error updating content for ${id}:`, error);
    return {
      success: false,
      error: `Failed to update content: ${errorMessage}`,
      details: error instanceof Error ? error.message : String(error)
    };
  }
}
