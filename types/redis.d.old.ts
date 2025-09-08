import { Redis } from '.upstash/redis';

declare module '@/lib/redis' {
  // Redis client wrapper class
  class RedisClientWrapper {
    hgetall(key: string): Promise<Record<string, any> | null>;
    hset(key: string, ...args: any[]): Promise<number>;
    hdel(key: string, ...fields: string[]): Promise<number>;
    scan(cursor: number, options?: { match?: string; count?: number }): Promise<[string, string[]]>;
    get(key: string): Promise<string | null>;
    type(key: string): Promise<string>;
    set(key: string, value: string): Promise<void>;
    getRaw(key: string): Promise<{type: string, value: any}>;
    testConnection(): Promise<boolean>;
    testConnectionDetailed(): Promise<{ success: boolean; error?: string; pingTime?: number }>;
    lrange(key: string, start: number, end: number): Promise<string[]>;
  }

  // Export the client factory function
  export function getRedisClient(): RedisClientWrapper;
  
  // Export the newsletter read status function
  export function updateNewsletterReadStatus(
    id: string, 
    isRead: boolean
  ): Promise<boolean>;
}

export {};
