import { Newsletter } from './types';
import { parseDate } from '../utils/dateService';
import { redisClient } from './redisClient';
import logger from '../utils/logger';

// Use the singleton Redis client instance
const redis = redisClient;

export class NewsletterStorage {
  // Your existing Redis pattern: newsletter_ids list + newsletter:${id} keys
  private static readonly NEWSLETTER_PREFIX = 'newsletter:';
  private static readonly NEWSLETTER_IDS_KEY = 'newsletter_ids';  // Your existing key name
  
  static async getAllNewsletters(): Promise<Newsletter[]> {
    try {
      logger.debug('Fetching all newsletter IDs from Redis...');
      const ids = await redis.lrange(this.NEWSLETTER_IDS_KEY, 0, -1);
      logger.debug(`Found ${ids.length} newsletter IDs`);
      
      if (!ids || ids.length === 0) {
        logger.debug('No newsletter IDs found');
        return [];
      }
      
      const newsletters: Newsletter[] = [];
      
      for (const id of ids) {
        try {
          const key = `${this.NEWSLETTER_PREFIX}${id}`;
          logger.debug(`Fetching newsletter with key: ${key}`);
          const data = await redis.get(key);
          
          if (!data) {
            logger.warn(`No data found for key: ${key}`);
            continue;
          }
          
          logger.debug(`Data type for ${key}:`, typeof data);
          
          try {
            let newsletter: Newsletter;
            
            // Parse the newsletter data
            try {
              newsletter = (typeof data === 'string' ? JSON.parse(data) : data) as Newsletter;
            } catch (parseError) {
              logger.error(`Error parsing newsletter data for key ${key}:`, parseError);
              continue; // Skip this newsletter if we can't parse it
            }
            
            // AUTO-MIGRATION: Handle existing newsletters without new fields
            if (!newsletter.rawContent && newsletter.content) {
              logger.info(`Auto-migrating newsletter ${id}`);
              newsletter.rawContent = newsletter.content;
              newsletter.cleanContent = newsletter.content;
              newsletter.metadata = {
                ...(newsletter.metadata || {}),  // Spread existing metadata first
                processingVersion: 'legacy-migrated',  // Then override specific fields
                processedAt: new Date().toISOString(),
                wordCount: (newsletter.content || '').split(/\s+/).length
              };
              
              // Save migrated version back to Redis
              try {
                await redis.set(key, JSON.stringify(newsletter));
                logger.info(`Successfully migrated newsletter ${id}`);
              } catch (saveError) {
                logger.error(`Error saving migrated newsletter ${id}:`, saveError);
                // Continue with the in-memory version even if save fails
              }
            }
            
            // ENSURE BACKWARD COMPATIBILITY: Always have content field
            if (!newsletter.content) {
              newsletter.content = newsletter.cleanContent || newsletter.rawContent || '';
            }
            
            // Ensure metadata exists
            if (!newsletter.metadata) {
              newsletter.metadata = {
                processedAt: new Date().toISOString(),
                processingVersion: 'v1',
                wordCount: (newsletter.content || '').split(/\s+/).length
              };
            }
            
            newsletters.push(newsletter);
          } catch (processError) {
            logger.error(`Error processing newsletter ${id}:`, processError);
            // Continue with the next newsletter if there's an error processing this one
          }
        } catch (error) {
          logger.error(`Error loading newsletter ${id}:`, error);
          // Continue with the next newsletter if there's an error loading this one
        }
      }
      
      // Sort by date (newest first) - preserve your existing ordering
      logger.debug(`Sorting ${newsletters.length} newsletters by date`);
      return newsletters.sort((a, b) => {
        try {
          const dateA = parseDate(a.date);
          const dateB = parseDate(b.date);
          
          // If either date is invalid, use fallback logic
          if (!dateA && !dateB) return 0;
          if (!dateA) return 1; // Invalid dates sort to the end
          if (!dateB) return -1;
          
          return dateB.getTime() - dateA.getTime();
        } catch (sortError) {
          logger.error('Error sorting newsletters:', sortError);
          return 0; // Keep original order if there's a sorting error
        }
      });
    } catch (error) {
      logger.error('Critical error in getAllNewsletters:', error);
      throw error; // Re-throw to be handled by the API route
    }
    
  }
  
  static async getNewsletter(id: string): Promise<Newsletter | null> {
    try {
      const key = `${this.NEWSLETTER_PREFIX}${id}`;
      const data = await redis.get(key);
      
      if (!data) return null;
      
      // FIX: Handle both string and object responses like getAllNewsletters does
      const newsletter = (typeof data === 'string' ? JSON.parse(data) : data) as Newsletter;
      
      // Same auto-migration logic as getAllNewsletters
      if (!newsletter.rawContent && newsletter.content) {
        newsletter.rawContent = newsletter.content;
        newsletter.cleanContent = newsletter.content;
        newsletter.metadata = {
          ...(newsletter.metadata || {}),  // Spread existing metadata first
          processingVersion: 'legacy-migrated',  // Then override specific fields
          processedAt: new Date().toISOString(),
          wordCount: newsletter.content.split(' ').length
        };
        
        await redis.set(key, JSON.stringify(newsletter));
      }
      
      if (!newsletter.content) {
        newsletter.content = newsletter.cleanContent || newsletter.rawContent;
      }
      
      return newsletter;
    } catch (error) {
      logger.error(`Error fetching newsletter ${id}:`, error);
      return null;
    }
  }  
  // NEW: Update clean content for existing newsletter
  static async updateCleanContent(id: string, cleanContent: string): Promise<void> {
    const newsletter = await this.getNewsletter(id);
    if (!newsletter) throw new Error(`Newsletter ${id} not found`);
    
    newsletter.cleanContent = cleanContent;
    newsletter.content = cleanContent; // Update legacy field too
    newsletter.metadata = {
      ...newsletter.metadata,  // Spread existing metadata first
      processedAt: new Date().toISOString()  // Then override specific fields
    };
    
    const key = `${this.NEWSLETTER_PREFIX}${id}`;
    await redis.set(key, JSON.stringify(newsletter));
  }
}