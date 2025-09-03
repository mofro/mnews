import { Redis } from '@upstash/redis';
import logger from '../utils/logger';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Get environment variables
const url = process.env.KV_REST_API_URL;
const token = process.env.KV_REST_API_TOKEN;

if (!url || !token) {
  throw new Error('Missing required Redis environment variables: KV_REST_API_URL and KV_REST_API_TOKEN must be set');
}

type RedisConfig = {
  url: string;
  token: string;
};

type ConnectionTestResult = {
  success: boolean;
  error?: string;
  pingTime?: number;
};

type UpdateResult<T = undefined> = 
  | { success: true; data?: T }
  | { success: false; error: string; details?: any };

interface ContentUpdateResult {
  contentUpdated: boolean;
  previewText?: string;
  timestamp: string;
}

class RedisClient {
  public readonly client: Redis;
  private config: RedisConfig;

  constructor() {
    this.config = { url: url!, token: token! };
    this.client = new Redis(this.config);
    
    // Test the connection on initialization
    this.testConnection()
      .then(success => {
        if (success) {
          logger.info('Redis client initialized successfully');
        } else {
          logger.error('Failed to connect to Redis');
        }
      })
      .catch(error => {
        logger.error('Error initializing Redis client:', error);
      });
  }

  /**
   * Tests the Redis connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis connection test failed:', error);
      return false;
    }
  }

  /**
   * Tests the Redis connection with detailed results
   */
  async testConnectionDetailed(): Promise<ConnectionTestResult> {
    const start = Date.now();
    try {
      const result = await this.client.ping();
      const pingTime = Date.now() - start;
      
      if (result !== 'PONG') {
        return { success: false, error: 'Unexpected ping response', pingTime };
      }
      
      return { success: true, pingTime };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Redis connection test failed:', error);
      return { 
        success: false, 
        error: errorMessage,
        pingTime: Date.now() - start
      };
    }
  }

  // Core Key-Value Operations
  async get<T = string>(key: string): Promise<T | null> {
    try {
      return (await this.client.get(key)) as unknown as T;
    } catch (error) {
      logger.error(`Error getting key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Remove elements from a list
   * @param key The key of the list
   * @param count The number of occurrences to remove
   * @param value The value to remove
   * @returns The number of elements removed
   */
  async lrem(key: string, count: number, value: string): Promise<number> {
    try {
      type RedisWithLRem = typeof this.client & {
        lrem: (key: string, count: number, value: string) => Promise<number>;
      };
      const client = this.client as RedisWithLRem;
      return await client.lrem(key, count, value);
    } catch (error) {
      logger.error(`Error removing elements from list ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get JSON data from Redis
   */
  // Set Operations - Using the Redis client's sMembers method
  async smembers(key: string): Promise<string[]> {
    try {
      // The Upstash Redis client provides sMembers as a method
      // @ts-expect-error - The sMembers method exists on the Redis instance at runtime; types may not include it
      const result = await this.client.sMembers(key);
      return Array.isArray(result) ? result.map(String) : [];
    } catch (error) {
      logger.error(`Error getting set members for key ${key}:`, error);
      return [];
    }
  }

  /**
   * Get JSON data from Redis
   */
  async getJson<T = any>(key: string): Promise<T | null> {
    try {
      const data = await this.client.get(key);
      if (!data) return null;
      return JSON.parse(data as string) as T;
    } catch (error) {
      logger.error(`Error getting/parsing JSON for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set JSON data in Redis with optional TTL
   */
  async setJson(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      const options = ttlSeconds ? { ex: ttlSeconds } : undefined;
      await this.client.set(key, serialized, options);
    } catch (error) {
      logger.error(`Error setting JSON for key ${key}:`, error);
      throw error;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      const options = ttlSeconds ? { ex: ttlSeconds } : undefined;
      await this.client.set(key, value, options);
    } catch (error) {
      logger.error(`Error setting key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get the time to live for a key
   */
  async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      logger.error(`Error getting TTL for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete a key from Redis
   */
  async delete(key: string): Promise<number> {
    try {
      return await this.client.del(key);
    } catch (error) {
      logger.error(`Error deleting key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Check if a key exists in Redis
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Error checking if key exists ${key}:`, error);
      throw error;
    }
  }

  // Hash Operations
  async hgetall<T extends Record<string, any> = Record<string, any>>(key: string): Promise<T | null> {
    logger.debug(`[RedisClient] hgetall called for key: ${key}`);
    
    try {
      return await this.client.hgetall(key) as T | null;
    } catch (error) {
      logger.error(`[RedisClient] Error in hgetall for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Set hash field(s) in Redis
   * @param key Redis key
   * @param field Field name or object of field-value pairs
   * @param value Field value (if field is a string)
   * @param args Additional field-value pairs
   */
  async hset(key: string, field: string | Record<string, any>, value?: any, ...args: any[]): Promise<number> {
    try {
      // Handle the new signature: hset(key, { field: value })
      if (typeof field === 'object' && field !== null && value === undefined) {
        return await this.client.hset(key, field);
      }
      
      // Handle the old signature: hset(key, field1, value1, field2, value2, ...)
      if (typeof field === 'string' && value !== undefined) {
        const fields: (string | number)[] = [field, value];
        if (args.length > 0) {
          fields.push(...args);
        }
        // @ts-expect-error - The Redis client supports this signature
        return await this.client.hset(key, ...fields);
      }
      
      throw new Error('Invalid arguments for hset');
    } catch (error) {
      logger.error(`Error setting hash ${key}:`, error);
      throw error;
    }
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    try {
      return await this.client.hdel(key, ...fields);
    } catch (error) {
      logger.error(`Error deleting fields from hash ${key}:`, error);
      throw error;
    }
  }

  // List operations
  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    try {
      return await this.client.lrange(key, start, stop);
    } catch (error) {
      logger.error(`Error getting list range for ${key}:`, error);
      throw error;
    }
  }

  async lpush(key: string, ...elements: (string | number)[]): Promise<number> {
    try {
      return await this.client.lpush(key, ...elements);
    } catch (error) {
      logger.error(`Error pushing to list ${key}:`, error);
      throw error;
    }
  }

  // Utility Methods
  async keys(pattern: string = '*'): Promise<string[]> {
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      logger.error(`Error getting keys with pattern ${pattern}:`, error);
      throw error;
    }
  }

  /**
   * Scan for keys matching a pattern
   */
  async scan(cursor: number, options: { match?: string; count?: number } = {}): Promise<[number, string[]]> {
    try {
      const result = await this.client.scan(cursor, {
        match: options.match || '*',
        count: options.count || 10
      });
      
      return [Number(result[0]), result[1]];
    } catch (error) {
      logger.error('Error scanning keys:', error);
      throw error;
    }
  }

  /**
   * Gets the type of the value stored at key
   */
  async type(key: string): Promise<string> {
    try {
      return await this.client.type(key);
    } catch (error) {
      logger.error(`Error getting type of key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Gets the raw value of a key, automatically handling different types
   */
  async getRaw(key: string): Promise<{ type: string; value: any }> {
    try {
      const type = await this.type(key);
      let value;

      switch (type) {
        case 'string':
          value = await this.get(key);
          break;
        case 'hash':
          value = await this.hgetall(key);
          break;
        case 'list':
          value = await this.lrange(key, 0, -1);
          break;
        default:
          value = null;
      }

      return { type, value };
    } catch (error) {
      logger.error(`Error getting raw value for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Updates the content of a newsletter in Redis
   * @param id The ID of the newsletter to update
   * @param content The new content for the newsletter
   * @param previewText Optional preview text for the newsletter
   * @returns A promise that resolves to the update result
   */
  /**
   * Updates the read status of a newsletter in Redis
   * @param id The ID of the newsletter to update
   * @param isRead Whether the newsletter should be marked as read
   * @returns A promise that resolves to true if successful, false otherwise
   */
  async updateNewsletterReadStatus(
    id: string,
    isRead: boolean
  ): Promise<boolean> {
    try {
      const key = id.startsWith('newsletter:') ? id : `newsletter:${id}`;
      
      // Get existing metadata to preserve it
      const existingData = await this.hgetall<{ metadata?: string }>(key);
      let metadata: Record<string, any> = {};
      
      if (existingData?.metadata) {
        try {
          metadata = typeof existingData.metadata === 'string' 
            ? JSON.parse(existingData.metadata) 
            : existingData.metadata;
        } catch (e) {
          logger.error(`Error parsing metadata for ${key}:`, e);
        }
      }
      
      // Update the read status in the newsletter's metadata
      const updatedMetadata = {
        ...metadata,
        isRead,
        readTimestamp: new Date().toISOString()
      };
      
      await this.hset(key, {
        metadata: JSON.stringify(updatedMetadata)
      });
      
      logger.debug(`Updated read status for ${key} to ${isRead}`);
      return true;
    } catch (error) {
      logger.error('Error updating newsletter read status:', error);
      return false;
    }
  }

  /**
   * Updates the content of a newsletter in Redis
   * @param id The ID of the newsletter to update
   * @param content The new content for the newsletter
   * @param previewText Optional preview text for the newsletter
   * @returns A promise that resolves to the update result
   */
  async updateNewsletterContent(
    id: string,
    content: string,
    previewText?: string
  ): Promise<UpdateResult<ContentUpdateResult>> {
    const timestamp = new Date().toISOString();
    
    try {
      if (process.env.NODE_ENV === 'development') {
        logger.debug(`Updating content for newsletter: ${id}`);
      }
      
      // Get the existing newsletter data
      const newsletterKey = id.startsWith('newsletter:') ? id : `newsletter:${id}`;
      const existingData = await this.hgetall<Record<string, any>>(newsletterKey);
      
      if (!existingData) {
        logger.error(`Newsletter not found: ${id}`);
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
            logger.error(`Error parsing metadata for ${id}:`, e);
          }
        } else if (typeof existingMetadata === 'object' && existingMetadata !== null) {
          metadata = { ...(existingMetadata as Record<string, any>) };
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
      await this.hset(newsletterKey, updateData);
      
      logger.debug(`Successfully updated content for newsletter: ${id}`);
      
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
      logger.error(`Error updating content for ${id}:`, error);
      return {
        success: false,
        error: `Failed to update content: ${errorMessage}`,
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

// Create a singleton instance
const redisClient = new RedisClient();

// For backward compatibility
const getRedisClient = () => redisClient;

// Export the instance and individual methods for backward compatibility
export {
  redisClient,
  getRedisClient,
  redisClient as default
};

// Export bound methods
export const updateNewsletterContent = redisClient.updateNewsletterContent.bind(redisClient);
export const updateNewsletterReadStatus = redisClient.updateNewsletterReadStatus.bind(redisClient);
export const testRedisConnection = redisClient.testConnectionDetailed.bind(redisClient);
