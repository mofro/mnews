// Type definitions for module resolution

declare module "*.upstash/redis" {
  export * from "@upstash/redis";
}

declare module "*.json" {
  const value: any;
  export default value;
}

// Allow CSS modules
declare module "*.module.css" {
  const classes: { [key: string]: string };
  export default classes;
}

// Allow image imports
declare module "*.png";
declare module "*.jpg";
declare module "*.jpeg";
declare module "*.gif";
declare module "*.svg" {
  import React from "react";
  export const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  const src: string;
  export default src;
}

// Global type declarations
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: "development" | "production" | "test";
    KV_REST_API_URL: string;
    KV_REST_API_TOKEN: string;
    // Add other environment variables as needed
  }
}

// Redis client types
declare module "@/lib/redisClient" {
  import { Redis as UpstashRedis } from "@upstash/redis";

  export const redisClient: UpstashRedis & {
    client: UpstashRedis;
  };

  export function getRedisClient(): Promise<UpstashRedis>;
  export function closeRedisClient(): Promise<void>;
  export function isRedisConnected(): boolean;
}

// Newsletter types
declare module "@/types/newsletter" {
  export interface Newsletter {
    id: string;
    title?: string;
    subject?: string;
    sender?: string;
    from?: string;
    publishDate?: string;
    date?: string;
    content?: string;
    cleanContent?: string;
    rawContent?: string;
    textContent?: string;
    url?: string;
    isRead?: boolean;
    isArchived?: boolean;
    tags?: string[];
    imageUrl?: string;
    metadata?: {
      processingVersion?: string;
      processedAt?: string;
      isRead?: boolean;
      archived?: boolean;
    };
    hasFullContent?: boolean;
  }
  export interface NewsletterMetadata {
    id: string;
    subject: string;
    from: string;
    date: string;
    read?: boolean;
    archived?: boolean;
    tags?: string[];
  }

  export interface NewsletterContent {
    id: string;
    subject: string;
    from: string;
    date: string;
    body: string;
    html?: string;
    text?: string;
    read?: boolean;
    archived?: boolean;
    tags?: string[];
    rawContent?: string;
    compressionRatio?: number;
  }

  export interface ProcessableNewsletter extends NewsletterMetadata {
    rawContent: string;
  }
}

// Content cleaner types
declare module "@/lib/cleaners/contentCleaner" {
  export function cleanNewsletterContent(content: string): {
    cleanedContent: string;
    removedItems: string[];
  };
}

// Parser types
declare module "@/lib/parser" {
  export class NewsletterParser {
    static parse(html: string, options?: any): Promise<any>;
  }
}

// Logger types
declare module "@/utils/logger" {
  export interface Logger {
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
    debug(message: string, ...args: any[]): void;
  }

  const logger: Logger;
  export default logger;
}

// Date service types
declare module "@/utils/dateService" {
  export function parseDateToISOString(date: Date | string | number): string;
  export function formatDate(date: Date | string, format?: string): string;
}

// Content processing types
declare module "@/utils/content" {
  import { NewsletterContent } from "@/types/newsletter";

  export function processNewsletterContent(
    content: string,
    options?: {
      cleanHtml?: boolean;
      extractText?: boolean;
      extractImages?: boolean;
    },
  ): Promise<{
    content: string;
    text?: string;
    images?: string[];
    metadata: Partial<NewsletterContent>;
  }>;
}

// Storage types
declare module "@/lib/storage" {
  import { NewsletterContent, NewsletterMetadata } from "@/types/newsletter";

  export class NewsletterStorage {
    static getNewsletter(id: string): Promise<NewsletterContent | null>;
    static saveNewsletter(id: string, data: NewsletterContent): Promise<void>;
    static deleteNewsletter(id: string): Promise<void>;
    static getAllNewsletters(): Promise<NewsletterMetadata[]>;
    static getNewslettersBySender(
      sender: string,
    ): Promise<NewsletterMetadata[]>;
    static getNewslettersByDateRange(
      startDate: Date,
      endDate: Date,
    ): Promise<NewsletterMetadata[]>;
    static getNewslettersByTag(tag: string): Promise<NewsletterMetadata[]>;
    static updateNewsletterReadStatus(id: string, read: boolean): Promise<void>;
    static updateNewsletterArchivedStatus(
      id: string,
      archived: boolean,
    ): Promise<void>;
  }
}
