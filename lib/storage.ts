import { Newsletter } from './types';
import { parseDate } from '../utils/dateService';
import { redisClient } from './redisClient';
import logger from '../utils/logger';

// Use the singleton Redis client instance
const redis = redisClient;

// Schema constants
const SCHEMA = {
  // Existing schema
  NEWSLETTER_PREFIX: 'newsletter:',
  NEWSLETTER_IDS_KEY: 'newsletter_ids',

  // New schema for lazy loading
  META_PREFIX: 'newsletter:meta:',
  CONTENT_PREFIX: 'newsletter:content:',

  // Metadata fields that exist in Newsletter type
  METADATA_FIELDS: [
    'id',
    'subject',
    'sender',
    'date',
    'url',
    'metadata',
    'content',
    'cleanContent',
    'rawContent'
  ] as const
} as const;

// Type for newsletter metadata stored in Redis
interface NewsletterMetadata {
  id: string;
  subject: string;
  sender: string;
  date: string;
  url?: string;
  metadata: Newsletter['metadata'];
  hasFullContent: boolean;
  summary?: string;
  content?: string;
  cleanContent?: string;
  rawContent?: string;
}

export class NewsletterStorage {
  // Schema constants
  private static readonly SCHEMA = SCHEMA;

  /**
   * Generate a summary from content
   */
  private static generateSummary(content: string, maxLength = 200): string {
    if (!content) return '';
    const plainText = content.replace(/<[^>]*>?/gm, '');
    return plainText.length > maxLength
      ? plainText.substring(0, maxLength) + '...'
      : plainText;
  }

  /**
   * Migrate a single newsletter from old schema to new schema
   */
  private static async migrateToNewSchema(newsletter: Partial<Newsletter>): Promise<void> {
    try {
      const id = newsletter.id;
      if (!id) {
        logger.warn('Cannot migrate newsletter without ID');
        return;
      }

      const metaKey = `${SCHEMA.META_PREFIX}${id}`;
      const contentKey = `${SCHEMA.CONTENT_PREFIX}${id}`;

      // Skip if already migrated
      const exists = await redis.exists(metaKey);
      if (exists) {
        logger.debug(`Newsletter ${id} already migrated, skipping`);
        return;
      }

      // Prepare metadata with defaults
      const content = newsletter.content || '';
      const hasFullContent = newsletter.hasFullContent ?? !!content;
      const now = new Date().toISOString();

      // Create a properly typed newsletter object with all required fields
      const fullNewsletter: Newsletter = {
        id,
        subject: newsletter.subject || '',
        sender: newsletter.sender || '',
        date: newsletter.date || now,
        isNew: false,
        content,
        cleanContent: newsletter.cleanContent || '',
        rawContent: newsletter.rawContent || '',
        url: newsletter.url || undefined, // Will be omitted if undefined
        metadata: {
          processingVersion: '1.0',
          processedAt: now,
          ...(newsletter.metadata || {})
        },
        hasFullContent
      };

      logger.debug(`Migrating newsletter ${id} to new schema`);
      
      // Store using storeNewsletter which handles both schemas
      await this.storeNewsletter(fullNewsletter);
      logger.info(`Successfully migrated newsletter ${id} to new schema`);
    } catch (error) {
      logger.error('Error migrating newsletter to new schema:', error);
      throw error;
    }
  }

  /**
   * Combine metadata and content into a single newsletter object
   */
  /**
   * Store a newsletter in both old and new schemas
   */
  static async storeNewsletter(newsletter: Newsletter): Promise<void> {
    try {
      const { id } = newsletter;
      if (!id) throw new Error('Newsletter ID is required');

      const metaKey = `${SCHEMA.META_PREFIX}${id}`;
      const contentKey = `${SCHEMA.CONTENT_PREFIX}${id}`;
      const oldKey = `${SCHEMA.NEWSLETTER_PREFIX}${id}`;

      // Ensure hasFullContent is set based on content presence
      const hasFullContent = newsletter.hasFullContent ?? !!newsletter.content;

      // Prepare metadata for new schema, filtering out null/undefined values
      const metadata: Record<string, any> = {
        id,
        subject: newsletter.subject || '',
        sender: newsletter.sender || '',
        date: newsletter.date || new Date().toISOString(),
        hasFullContent,
        summary: this.generateSummary(newsletter.content || '')
      };

      // Only add optional fields if they have values
      if (newsletter.url) metadata.url = newsletter.url;
      if (newsletter.metadata) metadata.metadata = JSON.stringify(newsletter.metadata);
      if (newsletter.cleanContent) metadata.cleanContent = newsletter.cleanContent;
      if (newsletter.rawContent) metadata.rawContent = newsletter.rawContent;

      // Prepare the newsletter with updated hasFullContent
      const updatedNewsletter: Newsletter = {
        ...newsletter,
        hasFullContent
      };

      // Store in new schema
      await Promise.all([
        // Filter out undefined/null values from metadata before storing
        redis.hset(metaKey, Object.fromEntries(
          Object.entries(metadata).filter(([_, v]) => v != null)
        ) as Record<string, string>),
        redis.set(contentKey, newsletter.content || '')
      ]);

      // Also store in old schema for backward compatibility
      await redis.set(oldKey, JSON.stringify(updatedNewsletter));

      // Add to IDs list if not exists
      await redis.lrem(SCHEMA.NEWSLETTER_IDS_KEY, 0, id);
      await redis.lpush(SCHEMA.NEWSLETTER_IDS_KEY, id);

    } catch (error) {
      logger.error('Error storing newsletter:', error);
      throw error;
    }
  }

  private static combineNewsletterData(
    metadata: Partial<NewsletterMetadata> | null,
    content: string | null = null
  ): Newsletter | null {
    if (!metadata || !metadata.id) {
      return null;
    }

    const contentValue = content || metadata.content || '';
    const cleanContent = metadata.cleanContent || contentValue;
    const rawContent = metadata.rawContent || contentValue;
    const hasContent = contentValue.length > 0 || cleanContent.length > 0 || rawContent.length > 0;

    return {
      id: metadata.id,
      subject: metadata.subject || '',
      sender: metadata.sender || '',
      date: metadata.date || new Date().toISOString(),
      isNew: false, // Default value
      content: contentValue,
      cleanContent,
      rawContent,
      url: metadata.url,
      hasFullContent: metadata.hasFullContent ?? hasContent,
      metadata: metadata.metadata || {
        processingVersion: '1.0',
        processedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Process a list of old format newsletter keys
   */
  private static async processOldFormatNewsletters(keys: string[]): Promise<NewsletterMetadata[]> {
    const newsletters: NewsletterMetadata[] = [];
    
    for (const key of keys) {
      try {
        // Extract ID from key (remove 'newsletter:' prefix)
        const id = key.substring('newsletter:'.length);
        const oldData = await redis.get(key);
        
        if (!oldData) {
          logger.warn(`No data found for key: ${key}`);
          continue;
        }
        
        // Parse the old data
        const parsed = typeof oldData === 'string' ? JSON.parse(oldData) : oldData;
        
        // Create newsletter metadata from old format
        const newsletter: NewsletterMetadata = {
          id: parsed.id || id,
          subject: parsed.subject || 'No subject',
          sender: parsed.sender || 'Unknown sender',
          date: parsed.date || new Date().toISOString(),
          url: parsed.url,
          content: parsed.content,
          cleanContent: parsed.cleanContent,
          rawContent: parsed.rawContent,
          hasFullContent: !!parsed.content,
          metadata: typeof parsed.metadata === 'string' 
            ? JSON.parse(parsed.metadata) 
            : parsed.metadata || { processingVersion: '1.0', processedAt: new Date().toISOString() }
        };
        
        // Generate summary if not present
        if (!newsletter.summary && newsletter.content) {
          newsletter.summary = this.generateSummary(newsletter.content);
        }
        
        newsletters.push(newsletter);
        
        // Migrate to new schema in the background
        this.migrateToNewSchema(parsed).catch(err => {
          logger.error(`Error migrating newsletter ${id}:`, err);
        });
        
      } catch (error) {
        logger.error(`Error processing old format newsletter ${key}:`, error);
      }
    }
    
    return newsletters;
  }
  
  /**
   * Get metadata for all newsletters
   */
  static async getAllNewsletters(): Promise<NewsletterMetadata[]> {
    try {
      logger.debug('Fetching all newsletter data from Redis...');
      
      // First, get all keys that match the old format
      const allKeys = await redis.keys('newsletter:*');
      const oldFormatKeys = allKeys.filter(key => !key.includes(':meta:') && !key.includes(':'));
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
      logger.error('Error in getAllNewsletters:', error);
      return [];
    }
  }

  /**
   * Process a list of newsletter IDs (new format)
   */
  private static async processNewsletterList(ids: string[]): Promise<NewsletterMetadata[]> {
    const newsletters: NewsletterMetadata[] = [];
    
    for (const id of ids) {
      try {
        const metaKey = `${SCHEMA.META_PREFIX}${id}`;
        const contentKey = `${SCHEMA.CONTENT_PREFIX}${id}`;
        
        logger.debug(`Processing newsletter ${id} with meta key: ${metaKey}`);
        
        let metadata = await redis.hgetall(metaKey);
        let content = await redis.get(contentKey);
        
        // Fallback to old schema if not found in new schema
        if (!metadata || Object.keys(metadata).length === 0) {
          const oldKey = `${SCHEMA.NEWSLETTER_PREFIX}${id}`;
          logger.debug(`Falling back to old key: ${oldKey}`);
          const oldData = await redis.get(oldKey);
          
          if (oldData) {
            // Convert old format to new format
            const parsed = typeof oldData === 'string' ? JSON.parse(oldData) : oldData;
            await this.migrateToNewSchema(parsed);
            
            // Get the migrated data
            [metadata, content] = await Promise.all([
              redis.hgetall(metaKey),
              redis.get(contentKey)
            ]);
          }
        }
        
        if (!metadata || Object.keys(metadata).length === 0) {
          logger.warn(`No metadata found for newsletter: ${id}`);
          continue;
        }
        
        // Create a proper NewsletterMetadata object
        const newsletterMetadata: NewsletterMetadata = {
          id: metadata.id || id,
          subject: metadata.subject || '',
          sender: metadata.sender || '',
          date: metadata.date || new Date().toISOString(),
          url: metadata.url,
          metadata: typeof metadata.metadata === 'string'
            ? JSON.parse(metadata.metadata)
            : metadata.metadata || {
              processingVersion: '1.0',
              processedAt: new Date().toISOString()
            },
          hasFullContent: metadata.hasFullContent === 'true' || metadata.hasFullContent === true,
          summary: metadata.summary,
          content: content || metadata.content || '',
          cleanContent: metadata.cleanContent,
          rawContent: metadata.rawContent
        };

        // Generate summary if missing
        if (!newsletterMetadata.summary && newsletterMetadata.content) {
          newsletterMetadata.summary = this.generateSummary(newsletterMetadata.content);
        }

        newsletters.push(newsletterMetadata);
      } catch (error) {
        logger.error(`Error processing newsletter ${id}:`, error);
      }
    }

    // Sort newsletters by date (newest first)
    return newsletters.sort((a, b) => {
      try {
        const dateA = parseDate(a.date);
        const dateB = parseDate(b.date);
        
        // Handle cases where dates might be null
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;  // Put invalid dates at the end
        if (!dateB) return -1; // Put invalid dates at the end
        
        return dateB.getTime() - dateA.getTime();
      } catch (error) {
        logger.error('Error sorting newsletters by date:', error);
        return 0;
      }
    });
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
        // Migrate to new schema for next time
        await this.migrateToNewSchema(newsletter);
        return newsletter;
      }

      // Try new schema
      const metaKey = `${SCHEMA.META_PREFIX}${id}`;
      const contentKey = `${SCHEMA.CONTENT_PREFIX}${id}`;
      
      const [metadata, content] = await Promise.all([
        redis.hgetall(metaKey),
        redis.get(contentKey)
      ]);

      if (metadata && Object.keys(metadata).length > 0) {
        return this.combineNewsletterData(metadata, content);
      }

      return null;
    } catch (error) {
      logger.error(`Error getting newsletter ${id}:`, error);
      return null;
    }
  }

  /**
   * Get full newsletter content by ID
   */
  static async getNewsletterContent(id: string): Promise<string | null> {
    try {
      // Try to get from new schema first
      const contentKey = `${SCHEMA.CONTENT_PREFIX}${id}`;
      const content = await redis.get(contentKey);

      if (content) return content;

      // Fallback to old schema
      const oldKey = `${SCHEMA.NEWSLETTER_PREFIX}${id}`;
      const oldData = await redis.get(oldKey);

      if (!oldData) return null;

      // Migrate to new schema
      const newsletter = typeof oldData === 'string' ? JSON.parse(oldData) : oldData;
      await this.migrateToNewSchema(newsletter);

      // Get content from new schema
      return await redis.get(contentKey);
    } catch (error) {
      logger.error(`Error getting newsletter content ${id}:`, error);
      return null;
    }
  }
}