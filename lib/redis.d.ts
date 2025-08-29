import { Redis } from 'ioredis';

declare module '@/lib/redis' {
  export function getRedisClient(): Redis;
  
  export interface RedisArticle {
    id: string;
    sender: string;
    subject: string;
    date: string;
    content?: string;
    cleanContent?: string;
    rawContent?: string;
    metadata?: {
      isRead?: boolean;
      archived?: boolean;
      imageUrl?: string;
      tags?: string[];
      redisIndex?: string;
    };
  }
}

declare module 'ioredis' {
  interface RedisCommander<Context> {
    hgetall(
      key: string,
      callback?: (err: Error | null, result: { [key: string]: string }) => void
    ): Promise<{ [key: string]: string } | null>;
  }
}
