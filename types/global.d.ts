// This file contains global type declarations for the application

// Import types from @upstash/redis
import { Redis as UpstashRedis } from "@upstash/redis";

// Extend the global NodeJS namespace with our custom types
declare global {
  namespace NodeJS {
    interface Global {
      __REDIS_CLIENT: UpstashRedis | null;
    }
  }
}

// Ensure this file is treated as a module
export {};
