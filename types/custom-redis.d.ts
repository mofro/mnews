import { Redis } from '.upstash/redis';

declare module '@upstash/redis' {
  interface Redis {
    hgetall<T = Record<string, any>>(key: string): Promise<T | null>;
    hset(key: string, obj: Record<string, any>): Promise<number>;
    hdel(key: string, ...fields: string[]): Promise<number>;
    scan(cursor: number, options: { match: string; count: number }): Promise<[string, string[]]>;
  }
}

export {};
