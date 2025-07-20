declare module '@/lib/redis' {
  interface RedisClient {
    hgetall: (key: string) => Promise<Record<string, any> | null>;
    hset: (key: string, ...args: any[]) => Promise<number>;
  }

  export function getRedisClient(): RedisClient;
  
  export function updateNewsletterReadStatus(
    id: string, 
    isRead: boolean
  ): Promise<boolean>;
}
