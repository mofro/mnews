// Type definitions for newsletter-related functionality

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
    id: string;
    subject: string;
    from: string;
    date: string;
    rawContent: string;
    read?: boolean;
    archived?: boolean;
    tags?: string[];
  }
}

declare module "@/lib/cleaners/contentCleaner" {
  export function cleanNewsletterContent(content: string): {
    cleanedContent: string;
    removedItems: string[];
  };
}

declare module "@/lib/parser" {
  export class NewsletterParser {
    static parse(html: string, options?: any): Promise<any>;
  }
}

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
