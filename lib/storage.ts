import { NewsletterContent } from '@/types/newsletter';
import { parseDateToISOString } from '@/utils/dateService';
import { redisClient } from '@/lib/redisClient';
import logger from '@/utils/logger';
import { SCHEMA } from './constants';

// Local type definitions
type Newsletter = {
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
  hasFullContent: boolean;
  cleanContent?: string;
  summary?: string;
  metadata?: {
    processingVersion?: string;
    processedAt?: string;
    isRead?: boolean;
    archived?: boolean;
  };
};

/**
 * Interface for newsletter metadata stored in Redis
 * This combines both schema versions for backward compatibility
 */
interface NewsletterMetadata {
  // Required fields
  id: string;
  subject: string;
  from: string;
  date: string;
  hasFullContent: boolean;
  
  // Optional fields
  sender?: string;  // Alias for 'from' in some contexts
  url?: string;     // Old schema field
  content?: string; // Old schema field
  read?: boolean;
  archived?: boolean;
  tags?: string[];
  summary?: string;
  cleanContent?: string;
  rawContent?: string;
  compressionRatio?: number;
  html?: string;
  text?: string;
  body?: string;
  processingVersion?: string;
  processedAt?: string;
  metadata?: {
    processingVersion?: string;
    processedAt?: string;
    isRead?: boolean;
    archived?: boolean;
  };
}

// Use the singleton Redis client instance
const redis = redisClient;

export class NewsletterStorage {
  /**
   * Helper function to safely parse boolean values from various formats
   */
  private static parseBoolean(value: unknown, defaultValue = false): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      if (value.toLowerCase() === 'true') return true;
      if (value.toLowerCase() === 'false') return false;
      return Boolean(parseInt(value));
    }
    if (typeof value === 'number') return value !== 0;
    return defaultValue;
  }

  /**
   * Generate a summary from content by stripping HTML tags and truncating
   */
  private static generateSummary(content: string, maxLength = 200): string {
    if (!content) return '';
    const plainText = content.replace(/<[^>]*>?/gm, '').trim();
    return plainText.length > maxLength 
      ? plainText.substring(0, maxLength) + '...' 
      : plainText;
  }

  /**
   * Combine newsletter metadata and content into a single Newsletter object
   */
  private static combineNewsletterData(
    metadata: Partial<NewsletterMetadata> | null,
    content: string | null = null
  ): Newsletter | null {
    if (!metadata || !metadata.id) {
      logger.warn('Invalid or missing metadata in combineNewsletterData');
      return null;
    }

    try {
      const now = new Date().toISOString();
      const isRead = metadata.read || false;
      const isArchived = metadata.archived || false;
      
      return {
        id: metadata.id,
        subject: metadata.subject || 'No subject',
        from: metadata.from || metadata.sender || 'Unknown sender',
        date: metadata.date || now,
        body: metadata.body || content || '',
        html: metadata.html,
        text: metadata.text,
        read: isRead,
        archived: isArchived,
        tags: metadata.tags || [],
        hasFullContent: metadata.hasFullContent ?? true,
        cleanContent: metadata.cleanContent || '',
        rawContent: metadata.rawContent || '',
        compressionRatio: metadata.compressionRatio || 1,
        summary: metadata.summary || '',
        metadata: {
          processingVersion: metadata.processingVersion || '1.0',
          processedAt: metadata.processedAt || now,
          isRead,
          archived: isArchived
        }
      };
    } catch (error) {
      logger.error('Error combining newsletter data:', error);
      return null;
    }
  }

  /**
   * Process old format newsletters from Redis keys
   */
  private static async processOldFormatNewsletters(keys: string[]): Promise<NewsletterMetadata[]> {
    const newsletters: NewsletterMetadata[] = [];
    
    for (const key of keys) {
      try {
        const id = key.replace('newsletter:', '');
        const content = await redis.get(key);
        
        if (!content) {
          logger.warn(`No content found for key: ${key}`);
          continue;
        }
        
        // Parse the content
        const parsed = typeof content === 'string' ? JSON.parse(content) : content;
        const now = new Date().toISOString();
        
        // Create a proper NewsletterMetadata object
        const isRead = this.parseBoolean(parsed.read, false);
        const isArchived = this.parseBoolean(parsed.archived, false);
        const hasFullContent = this.parseBoolean(parsed.hasFullContent, true);
        const bodyContent = parsed.body || parsed.content || '';
        
        const newsletter: NewsletterMetadata = {
          id: parsed.id || id,
          subject: parsed.subject || 'No subject',
          from: parsed.from || parsed.sender || 'Unknown sender',
          date: parsed.date || now,
          hasFullContent,
          read: isRead,
          archived: isArchived,
          tags: Array.isArray(parsed.tags) ? parsed.tags : [],
          summary: parsed.summary || '',
          cleanContent: parsed.cleanContent || '',
          rawContent: parsed.rawContent || '',
          compressionRatio: typeof parsed.compressionRatio === 'number' ? parsed.compressionRatio : 1,
          html: parsed.html,
          text: parsed.text,
          body: bodyContent,
          processingVersion: '1.0',
          processedAt: now,
          metadata: {
            processingVersion: '1.0',
            processedAt: now,
            isRead,
            archived: isArchived
          }
        };
        
        // Generate summary if not present
        if (!newsletter.summary && bodyContent) {
          newsletter.summary = this.generateSummary(bodyContent);
        }
        
        // Migrate to new schema
        await this.migrateToNewSchema(newsletter);
        
        newsletters.push(newsletter);
      } catch (error) {
        logger.error(`Error processing old format newsletter ${key}:`, error);
      }
    }
    
    return newsletters;
  }

  /**
   * Migrate a newsletter from old schema to new schema
   */
  private static async migrateToNewSchema(newsletter: Partial<Newsletter>): Promise<void> {
    if (!newsletter.id) {
      logger.warn('Cannot migrate newsletter without ID');
      return;
    }

    try {
      const now = new Date().toISOString();
      const metadata: NewsletterMetadata = {
        id: newsletter.id,
        subject: newsletter.subject || 'No subject',
        from: newsletter.from || 'Unknown sender',
        date: newsletter.date || now,
        hasFullContent: newsletter.hasFullContent ?? true,
        read: newsletter.read ?? false,
        archived: newsletter.archived ?? false,
        tags: newsletter.tags || [],
        summary: newsletter.summary || '',
        cleanContent: newsletter.cleanContent || '',
        rawContent: newsletter.rawContent || '',
        compressionRatio: newsletter.compressionRatio || 1,
        html: newsletter.html,
        text: newsletter.text,
        body: newsletter.body || '',
        processingVersion: '1.0',
        processedAt: now,
        metadata: {
          processingVersion: '1.0',
          processedAt: now,
          isRead: newsletter.read ?? false,
          archived: newsletter.archived ?? false
        }
      };

      // Save to new schema
      await redis.hset(`newsletter:${newsletter.id}`, metadata as any);
      
      if (newsletter.body) {
        await redis.set(`newsletter:content:${newsletter.id}`, newsletter.body);
      }
      
      logger.info(`Migrated newsletter ${newsletter.id} to new schema`);
    } catch (error) {
      logger.error(`Error migrating newsletter ${newsletter.id}:`, error);
      throw error;
    }
  }

  /**
   * Process a list of newsletter IDs and return their metadata
   */
  private static async processNewsletterList(ids: string[]): Promise<NewsletterMetadata[]> {
    const newsletters: NewsletterMetadata[] = [];
    
    for (const id of ids) {
      try {
        const metadata = await redis.hgetall(`newsletter:${id}`);
        if (!metadata || Object.keys(metadata).length === 0) {
          logger.warn(`No metadata found for newsletter: ${id}`);
          continue;
        }

        // Safely parse metadata with type guards
        const parseString = (value: unknown, defaultValue: string = ''): string => 
          typeof value === 'string' ? value : defaultValue;
          
        const parseBoolean = (value: unknown, defaultValue: boolean = false): boolean => {
          if (typeof value === 'boolean') return value;
          if (typeof value === 'string') {
            if (value.toLowerCase() === 'true') return true;
            if (value.toLowerCase() === 'false') return false;
            return Boolean(parseInt(value as string));
          }
          return defaultValue;
        };

        const parseNumber = (value: unknown, defaultValue: number = 0): number => {
          const num = Number(value);
          return isNaN(num) ? defaultValue : num;
        };

        const parseStringArray = (value: unknown): string[] => {
          try {
            if (Array.isArray(value)) return value;
            if (typeof value === 'string') return JSON.parse(value);
            return [];
          } catch (e) {
            return [];
          }
        };

        const now = new Date().toISOString();
        const newsletter: NewsletterMetadata = {
          id,
          subject: parseString(metadata.subject, 'No subject'),
          from: parseString(metadata.from || metadata.sender, 'Unknown sender'),
          date: parseString(metadata.date, now),
          hasFullContent: parseBoolean(metadata.hasFullContent, true),
          read: parseBoolean(metadata.read, false),
          archived: parseBoolean(metadata.archived, false),
          tags: parseStringArray(metadata.tags),
          summary: parseString(metadata.summary),
          cleanContent: parseString(metadata.cleanContent),
          rawContent: parseString(metadata.rawContent),
          compressionRatio: parseNumber(metadata.compressionRatio, 1),
          html: parseString(metadata.html),
          text: parseString(metadata.text),
          body: parseString(metadata.body),
          processingVersion: parseString(metadata.processingVersion, '1.0'),
          processedAt: parseString(metadata.processedAt, now),
          sender: parseString(metadata.sender),
          url: parseString(metadata.url),
          content: parseString(metadata.content),
          metadata: (() => {
            try {
              if (metadata.metadata && typeof metadata.metadata === 'string') {
                return JSON.parse(metadata.metadata);
              }
              return {
                processingVersion: parseString(metadata.processingVersion, '1.0'),
                processedAt: parseString(metadata.processedAt, now),
                isRead: parseBoolean(metadata.isRead, false),
                archived: parseBoolean(metadata.archived, false)
              };
            } catch (e) {
              return {
                processingVersion: '1.0',
                processedAt: now,
                isRead: false,
                archived: false
              };
            }
          })()
        };
        
        newsletters.push(newsletter);
      } catch (error) {
        logger.error(`Error processing newsletter ${id}:`, error);
      }
    }
    
    return newsletters;
  }

  /**
   * Get all newsletters with pagination support
   */
  public static async getNewsletters(options: { 
    limit?: number; 
    offset?: number;
    includeContent?: boolean;
  } = {}): Promise<Newsletter[]> {
    const { limit = 100, offset = 0, includeContent = false } = options;
    
    try {
      // Get all newsletter IDs
      const ids = await redis.lrange(SCHEMA.NEWSLETTER_IDS_KEY, offset, offset + limit - 1);
      logger.debug(`Found ${ids.length} newsletter IDs`);
      
      // Process the newsletters
      const newsletters: Newsletter[] = [];
      
      for (const id of ids) {
        try {
          const metaKey = `${SCHEMA.META_PREFIX}${id}`;
          const contentKey = `${SCHEMA.CONTENT_PREFIX}${id}`;
          
          logger.debug(`Processing newsletter ${id} with meta key: ${metaKey}`);
          
          // Get metadata and optionally content
          const [metadata, content] = await Promise.all([
            redis.hgetall(metaKey) as Promise<Record<string, string>>,
            includeContent ? redis.get(contentKey) as Promise<string | null> : Promise.resolve(null)
          ]);
          
          if (!metadata || Object.keys(metadata).length === 0) {
            logger.warn(`No metadata found for newsletter: ${id}`);
            continue;
          }
          
          // Combine into a newsletter object
          const newsletter = this.combineNewsletterData(metadata, content || undefined);
          if (newsletter) {
            newsletters.push(newsletter);
          }
        } catch (error) {
          logger.error(`Error processing newsletter ${id}:`, error);
        }
      }
      
      return newsletters;
    } catch (error) {
      logger.error('Error getting newsletters:', error);
      throw error;
    }
  }
  
  /**
   * Get metadata for all newsletters
   */
  static async getAllNewsletters(): Promise<NewsletterMetadata[]> {
    try {
      logger.debug('Fetching all newsletter data from Redis...');
      
      // First, get all keys that match the old format
      const allKeys = await redis.keys('newsletter:*');
      const oldFormatKeys = allKeys.filter((key: string) => !key.includes(':meta:') && !key.includes(':'));
      logger.debug(`Found ${oldFormatKeys.length} old format newsletter keys`);
      
      // If we have old format keys, process them
      if (oldFormatKeys.length > 0) {
        logger.debug('Processing old format newsletters...');
        return this.processOldFormatNewsletters(oldFormatKeys);
      }
      
      // If no old format keys, try to get from the list
      logger.debug('No old format keys found, trying newsletter IDs list...');
      const listIds = await redis.lrange(SCHEMA.NEWSLETTER_IDS_KEY, 0, -1);
      logger.debug(`Found ${listIds.length} newsletter IDs in list`);
      
      if (listIds.length === 0) {
        logger.debug('No newsletter data found in Redis');
        return [];
      }
      
      return this.processNewsletterList(listIds);
    } catch (error) {
      logger.error('Error getting all newsletters:', error);
      throw error;
    }
  }

  /**
   * Get a single newsletter by ID
   */
  static async getNewsletter(id: string): Promise<Newsletter | null> {
    try {
      // Try old schema first
      const oldKey = `${SCHEMA.NEWSLETTER_PREFIX}${id}`;
      const oldData = await redis.get(oldKey);
      
      if (oldData) {
        const newsletter = typeof oldData === 'string' ? JSON.parse(oldData) : oldData;
        await this.migrateToNewSchema(newsletter);
      }
      
      // Try new schema
      const [metadata, content] = await Promise.all([
        redis.hgetall(`${SCHEMA.META_PREFIX}${id}`) as Promise<Record<string, string>>,
        redis.get(`${SCHEMA.CONTENT_PREFIX}${id}`) as Promise<string | null>
      ]);
      
      if (!metadata || Object.keys(metadata).length === 0) {
        return null;
      }
      
      return this.combineNewsletterData(metadata, content || undefined);
    } catch (error) {
      logger.error(`Error getting newsletter ${id}:`, error);
      return null;
    }
  }

  /**
   * Get newsletter content by ID
   */
  static async getNewsletterContent(id: string): Promise<string | null> {
    try {
      // Try to get from new schema first
      // Content key is constructed directly
      const contentKey = `newsletter:content:${id}`;
      const content = await redis.get(contentKey);

      if (content !== null && content !== undefined) return String(content);

      // Fallback to old schema
      const oldKey = `${SCHEMA.NEWSLETTER_PREFIX}${id}`;
      const oldData = await redis.get(oldKey);

      if (!oldData) return null;

      // Migrate to new schema
      const newsletter = typeof oldData === 'string' ? JSON.parse(oldData) : oldData;
      await this.migrateToNewSchema(newsletter);

      // Get content from new schema
      const migratedContent = await redis.get(contentKey);
      return migratedContent ? String(migratedContent) : null;
    } catch (error) {
      logger.error(`Error getting newsletter content ${id}:`, error);
      return null;
    }
  }
}
