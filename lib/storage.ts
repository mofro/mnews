// FILE: /lib/storage.ts (CREATE NEW - Compatible with existing Redis structure)
import { Redis } from '@upstash/redis';
import { Newsletter } from './types';
import { parseDate } from '../utils/dateService';

// Use your existing environment variables
const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export class NewsletterStorage {
  // Your existing Redis pattern: newsletter_ids list + newsletter:${id} keys
  private static readonly NEWSLETTER_PREFIX = 'newsletter:';
  private static readonly NEWSLETTER_IDS_KEY = 'newsletter_ids';  // Your existing key name
  
  static async getAllNewsletters(): Promise<Newsletter[]> {
    // Use your existing Redis structure
    const ids = await redis.lrange(this.NEWSLETTER_IDS_KEY, 0, -1);
    if (!ids || ids.length === 0) return [];
    
    const newsletters: Newsletter[] = [];
    
    for (const id of ids) {
      try {
        const key = `${this.NEWSLETTER_PREFIX}${id}`;
        const data = await redis.get(key);
        console.log(`Raw data for ${id}:`, data, typeof data); // adding for debug
        
        if (data) {
          const newsletter = (typeof data === 'string' ? JSON.parse(data) : data) as Newsletter;
          
          // AUTO-MIGRATION: Handle existing newsletters without new fields
          if (!newsletter.rawContent && newsletter.content) {
            console.log(`Auto-migrating newsletter ${id}`);
            newsletter.rawContent = newsletter.content;
            newsletter.cleanContent = newsletter.content;
            newsletter.metadata = {
              ...(newsletter.metadata || {}),  // Spread existing metadata first
              processingVersion: 'legacy-migrated',  // Then override specific fields
              processedAt: new Date().toISOString(),
              wordCount: newsletter.content.split(' ').length
            };
            
            // Save migrated version back to Redis
            await redis.set(key, JSON.stringify(newsletter));
          }
          
          // ENSURE BACKWARD COMPATIBILITY: Always have content field
          if (!newsletter.content) {
            newsletter.content = newsletter.cleanContent || newsletter.rawContent;
          }
          
          newsletters.push(newsletter);
        }
      } catch (error) {
        console.error(`Error loading newsletter ${id}:`, error);
      }
    }
    
    // Sort by date (newest first) - preserve your existing ordering
    // Using the date service for safer parsing
    
    return newsletters.sort((a, b) => {
      const dateA = parseDate(a.date);
      const dateB = parseDate(b.date);
      
      // If either date is invalid, use fallback logic
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1; // Invalid dates sort to the end
      if (!dateB) return -1;
      
      return dateB.getTime() - dateA.getTime();
    });
  }
  
  static async getNewsletter(id: string): Promise<Newsletter | null> {
    try {
      const key = `${this.NEWSLETTER_PREFIX}${id}`;
      const data = await redis.get(key);
      
      if (!data) return null;
      
      const newsletter = JSON.parse(data as string) as Newsletter;
      
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
      console.error(`Error fetching newsletter ${id}:`, error);
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