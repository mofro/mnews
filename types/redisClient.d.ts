import { RedisClient } from '../lib/redisClient.js';

declare module '@/lib/redisClient' {
  interface RedisClient {
    // Core Methods
    testConnection(): Promise<boolean>;
    testConnectionDetailed(): Promise<{
      success: boolean;
      error?: string;
      pingTime?: number;
    }>;
    
    // Key-Value Operations
    get<T = string>(key: string): Promise<T | null>;
    set(key: string, value: any, ttlSeconds?: number): Promise<void>;
    delete(key: string): Promise<number>;
    exists(key: string): Promise<boolean>;
    
    // Hash Operations
    hgetall<T = Record<string, any>>(key: string): Promise<T | null>;
    hset(key: string, data: Record<string, any>): Promise<number>;
    hdel(key: string, ...fields: string[]): Promise<number>;
    
    // List Operations
    lrange(key: string, start: number, stop: number): Promise<string[]>;
    lpush(key: string, ...elements: (string | number)[]): Promise<number>;
    
    // Utility Methods
    keys(pattern?: string): Promise<string[]>;
    scan(cursor: number, options?: { match?: string; count?: number }): Promise<{ cursor: number; keys: string[] }>;
    type(key: string): Promise<string>;
    getRaw(key: string): Promise<{ type: string; value: any }>;
  }
}

declare const redisClient: RedisClient;
declare function getRedisClient(): RedisClient;

export { redisClient, getRedisClient };
export default redisClient;
