declare module '@/lib/redis' {
  interface RedisClient {
    hgetall: (key: string) => Promise<Record<string, any> | null>;
    hset: (key: string, ...args: any[]) => Promise<number>;
    hdel: (key: string, ...fields: string[]) => Promise<number>;
    scan: (cursor: number, options: { match: string; count: number }) => Promise<[string, string[]]>;
  }

  export function getRedisClient(): RedisClient;
  
  export function updateNewsletterReadStatus(
    id: string, 
    isRead: boolean
  ): Promise<boolean>;
}
