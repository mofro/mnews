// This file helps TypeScript understand path aliases
// Add path aliases here to match your tsconfig.json paths

// Base path aliases
declare module "@/*" {
  const value: any;
  export default value;
}

declare module "@/components/*" {
  const value: any;
  export default value;
}

declare module "@/lib/*" {
  const value: any;
  export default value;
}

declare module "@/utils/*" {
  const value: any;
  export default value;
}

declare module "@/types/*" {
  const value: any;
  export default value;
}

declare module "@/context/*" {
  const value: any;
  export default value;
}

// Specific module declarations to resolve TypeScript errors
declare module "@/lib/redisClient" {
  import { Redis as UpstashRedis } from "@upstash/redis";

  export const redisClient: UpstashRedis & {
    client: UpstashRedis;
  };

  export function getRedisClient(): Promise<UpstashRedis>;
  export function closeRedisClient(): Promise<void>;
  export function isRedisConnected(): boolean;
  export function updateNewsletterContent(
    id: string,
    content: any,
  ): Promise<void>;
  export function updateNewsletterReadStatus(
    id: string,
    read: boolean,
  ): Promise<void>;
}

declare module "@/types/newsletter" {
  export interface NewsletterMetadata {
    id: string;
    subject: string;
    from: string;
    date: string;
    read?: boolean;
    archived?: boolean;
    tags?: string[];
  }

  export interface NewsletterContent extends NewsletterMetadata {
    body: string;
    html?: string;
    text?: string;
    rawContent?: string;
    compressionRatio?: number;
  }

  export interface ProcessableNewsletter extends NewsletterMetadata {
    id: string;
    subject: string;
    rawContent: string;
  }
}

declare module "@/lib/parser" {
  export class NewsletterParser {
    static parse(html: string, options?: any): Promise<any>;
  }
}

declare module "@/lib/cleaners/contentCleaner" {
  export function cleanNewsletterContent(content: string): {
    cleanedContent: string;
    removedItems: string[];
  };
}

declare module "@/utils/logger" {
  const logger: {
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
    debug(message: string, ...args: any[]): void;
  };
  export default logger;
}

declare module "@/utils/dateService" {
  export function parseDateToISOString(date: Date | string | number): string;
  export function formatDate(date: Date | string, format?: string): string;
}

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
