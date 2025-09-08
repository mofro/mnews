import { Redis as UpstashRedis } from "@upstash/redis";

declare global {
  // Extend the global NodeJS namespace with our custom types
  namespace NodeJS {
    interface Global {
      __REDIS_CLIENT: UpstashRedis | null;
    }
  }
}

declare module "@/lib/redisClient" {
  import { Redis as UpstashRedis } from "@upstash/redis";

  export const redisClient: UpstashRedis & {
    client: UpstashRedis;
  };

  export function getRedisClient(): Promise<UpstashRedis>;
  export function closeRedisClient(): Promise<void>;
  export function isRedisConnected(): boolean;
}
