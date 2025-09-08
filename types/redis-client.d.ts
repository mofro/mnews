import { Redis as RedisClient } from "@upstash/redis";

declare module "@/lib/redisClient" {
  export const redisClient: RedisClient;
  export function getRedisClient(): Promise<RedisClient>;
  export function closeRedisClient(): Promise<void>;
  export function isRedisConnected(): boolean;
}

declare module "@/lib/storage" {
  export class NewsletterStorage {
    static getNewsletter(id: string): Promise<any>;
    static saveNewsletter(id: string, data: any): Promise<void>;
    static deleteNewsletter(id: string): Promise<void>;
    static getAllNewsletters(): Promise<any[]>;
    static getNewslettersBySender(sender: string): Promise<any[]>;
    static getNewslettersByDateRange(
      startDate: Date,
      endDate: Date,
    ): Promise<any[]>;
    static getNewslettersByTag(tag: string): Promise<any[]>;
    static updateNewsletterReadStatus(id: string, read: boolean): Promise<void>;
    static updateNewsletterArchivedStatus(
      id: string,
      archived: boolean,
    ): Promise<void>;
  }
}
