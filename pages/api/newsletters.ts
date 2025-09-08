import type { NextApiRequest, NextApiResponse } from 'next';
import { redisClient } from '@/lib/redisClient';
import { Newsletter } from '@/types/newsletter';
import { parseDateToISOString, isDateToday } from '@/utils/dateService';
import logger from '@/utils/logger';

// Constants
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;

// Schema constants
const SCHEMA = {
  NEWSLETTER_PREFIX: 'newsletter:',
  NEWSLETTER_IDS_KEY: 'newsletter_ids',
  META_PREFIX: 'newsletter:meta:'
} as const;

// Types
type NewsletterResponse = {
  newsletters: Newsletter[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
  };
  stats: {
    totalNewsletters: number;
    todayCount: number;
    uniqueSenders: number;
    total: number;
    withCleanContent: number;
    withRawContent: number;
  };
};

type DashboardStats = {
  totalNewsletters: number;
  todayCount: number;
  uniqueSenders: number;
  total: number;
  withCleanContent: number;
  withRawContent: number;
};

// Helper function to safely parse JSON
const safeJsonParse = <T>(str: string | null | undefined, fallback: T): T => {
  if (!str) return fallback;
  try {
    return JSON.parse(str) as T;
  } catch (e) {
    logger.warn('Failed to parse JSON:', e);
    return fallback;
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<NewsletterResponse | { error: string }>
) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Parse query parameters with defaults
    const page = parseInt(req.query.page as string) || DEFAULT_PAGE;
    const pageSize = parseInt(req.query.pageSize as string) || DEFAULT_PAGE_SIZE;
    const filter = (req.query.filter as string)?.toLowerCase() || '';

    // Get all newsletter IDs from Redis list
    const newsletterIds = await redisClient.lrange(SCHEMA.NEWSLETTER_IDS_KEY, 0, -1);
    console.log('Fetched newsletter IDs:', newsletterIds);
    
    if (!newsletterIds || newsletterIds.length === 0) {
      console.error('No newsletter IDs found in Redis');
      return res.status(200).json({
        newsletters: [],
        pagination: {
          page,
          pageSize,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false
        },
        stats: {
          totalNewsletters: 0,
          todayCount: 0,
          uniqueSenders: 0,
          total: 0,
          withCleanContent: 0,
          withRawContent: 0
        }
      });
    }
    
    // Fetch all newsletters with their full data for sorting and filtering
    const allNewsletters = [];
    const senders = new Set<string>();
    let todayCount = 0;
    let withCleanContent = 0;
    let withRawContent = 0;
    
    // Fetch all newsletters in parallel for better performance
    const newsletterPromises = newsletterIds.map(async (id) => {
      try {
        const contentKey = `${SCHEMA.NEWSLETTER_PREFIX}${id}`;
        const metaKey = `${SCHEMA.META_PREFIX}${id}`;
        
        console.log(`Fetching content for key: ${contentKey}`);
        console.log(`Fetching metadata for key: ${metaKey}`);
        
        const [content, metadata] = await Promise.all([
          redisClient.client.get(contentKey) as Promise<string | null>,
          redisClient.client.hgetall(metaKey) as Promise<{ metadata?: string } | null>
        ]);
        
        console.log(`Content for ${contentKey}:`, content ? 'exists' : 'not found');
        console.log(`Metadata for ${metaKey}:`, metadata ? 'exists' : 'not found');
        
        if (!content) {
          console.warn(`No content found for newsletter ${id}`);
          console.log(`Content key: ${contentKey}`);
          const exists = await redisClient.exists(contentKey);
          console.log(`Content key exists: ${exists}`);
          return null;
        }
        
        // Parse the content
        let parsedContent: Partial<Newsletter> = {};
        try {
          console.log(`Processing content for ${id}, type: ${typeof content}`);
          
          if (content === null || content === undefined) {
            console.warn(`Content for ${id} is null or undefined`);
            return null;
          }
          
          // If content is already an object, use it directly
          if (typeof content === 'object' && content !== null && !Array.isArray(content)) {
            console.log(`Content for ${id} is already an object`);
            // Create a new object with only the properties we expect
            const { subject, sender, date, content: contentText, cleanContent, rawContent, url } = content as Record<string, any>;
            parsedContent = {
              subject,
              sender,
              date,
              content: contentText,
              cleanContent,
              rawContent,
              url
            };
          } 
          // If content is a string, try to parse as JSON
          else if (typeof content === 'string') {
            console.log(`Attempting to parse content for ${id} as JSON`);
            try {
              // Check if it's already a JSON string
              if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
                parsedContent = JSON.parse(content) as Partial<Newsletter>;
              } else {
                console.log(`Content for ${id} is not a JSON object, treating as raw content`);
                parsedContent = {
                  content: content,
                  subject: `Newsletter ${id}`,
                  date: new Date().toISOString()
                };
              }
            } catch (e) {
              console.warn(`Failed to parse content for ${id} as JSON, treating as raw content:`, e);
              parsedContent = {
                content: content,
                subject: `Newsletter ${id}`,
                date: new Date().toISOString()
              };
            }
          } else {
            console.warn(`Unexpected content type for ${id}: ${typeof content}`, content);
            return null;
          }
          
          console.log(`Successfully processed content for ${id}`);
        } catch (e) {
          console.error(`Failed to process content for newsletter ${id}:`, e);
          return null;
        }
        
        // Parse metadata if available
        let meta = {
          isRead: false,
          archived: false,
          processedAt: new Date().toISOString(),
          processingVersion: '1.0'
        };
        
        if (metadata?.metadata) {
          try {
            meta = { ...meta, ...JSON.parse(metadata.metadata) };
          } catch (e) {
            logger.warn(`Failed to parse metadata for newsletter ${id}:`, e);
          }
        }
        
        // Parse the date, defaulting to now if not available
        let date: Date;
        try {
          const dateStr = parsedContent.date || new Date().toISOString();
          date = new Date(dateStr);
          if (isNaN(date.getTime())) {
            throw new Error('Invalid date');
          }
        } catch (e) {
          console.warn(`Invalid date for newsletter ${id}, using current date`);
          date = new Date();
        }
        
        // Update stats
        if (isDateToday(date.toISOString())) {
          todayCount++;
        }
        
        if (parsedContent.cleanContent) {
          withCleanContent++;
        }
        
        if (parsedContent.rawContent) {
          withRawContent++;
        }
        
        if (parsedContent.sender) {
          senders.add(parsedContent.sender);
        }
        
        // Create the newsletter object with all required fields
        const newsletter: Newsletter & { isNew?: boolean } = {
          id,
          subject: parsedContent.subject || 'No Subject',
          sender: parsedContent.sender || 'Unknown Sender',
          date: date.toISOString(),
          isNew: false,
          url: parsedContent.url || `/newsletters/${id}`,
          content: parsedContent.content || '',
          cleanContent: parsedContent.cleanContent || '',
          rawContent: parsedContent.rawContent || '',
          isRead: meta.isRead || false,
          isArchived: meta.archived || false,
          metadata: {
            processingVersion: meta.processingVersion || '1.0',
            processedAt: meta.processedAt || new Date().toISOString(),
            isRead: meta.isRead || false,
            archived: meta.archived || false
          },
          hasFullContent: true
        };
        
        return newsletter;
      } catch (error) {
        logger.error(`Error processing newsletter ${id}:`, error);
        return null;
      }
    });
    
    // Wait for all newsletters to be processed
    const results = await Promise.all(newsletterPromises);
    
    // Filter out any null results and sort by date (newest first)
    const allValidNewsletters = results.filter((n): n is Newsletter => n !== null);
    
    // Helper function to safely get date or fallback to current date
    const getDate = (dateStr?: string | null): Date => {
      if (!dateStr) return new Date(0); // Fallback to epoch if no date
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? new Date(0) : date;
    };
    
    const sortedNewsletters = allValidNewsletters.sort((a, b) => 
      getDate(b.date).getTime() - getDate(a.date).getTime()
    );
    
    // Apply filters if any
    let filteredNewsletters = sortedNewsletters;
    if (filter) {
      const lowerFilter = filter.toLowerCase();
      filteredNewsletters = sortedNewsletters.filter(n => {
        const subject = n.subject?.toLowerCase() || '';
        const sender = n.sender?.toLowerCase() || '';
        const content = n.content?.toLowerCase() || '';
        
        return subject.includes(lowerFilter) || 
               sender.includes(lowerFilter) ||
               content.includes(lowerFilter);
      });
    }
    
    // Calculate pagination
    const totalItems = filteredNewsletters.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const hasNextPage = page < totalPages;
    const startIdx = (page - 1) * pageSize;
    const endIdx = Math.min(startIdx + pageSize, totalItems);
    
    // Get the paginated results
    const paginatedNewsletters = filteredNewsletters.slice(startIdx, endIdx);
    
    // Log some debug info
    logger.debug('Newsletter stats:', {
      total: allValidNewsletters.length,
      filtered: filteredNewsletters.length,
      paginated: paginatedNewsletters.length,
      page,
      pageSize,
      totalPages
    });
    
    if (paginatedNewsletters.length > 0) {
      logger.debug('First newsletter in results:', {
        id: paginatedNewsletters[0].id,
        subject: paginatedNewsletters[0].subject,
        date: paginatedNewsletters[0].date,
        sender: paginatedNewsletters[0].sender
      });
    }
    
    // Prepare response with the already processed and sorted newsletters
    const response: NewsletterResponse = {
      newsletters: paginatedNewsletters,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNextPage
      },
      stats: {
        totalNewsletters: totalItems,
        todayCount,
        uniqueSenders: senders.size,
        total: allValidNewsletters.length,
        withCleanContent,
        withRawContent
      }
    };
    
    return res.status(200).json(response);
  } catch (error) {
    logger.error('Error in newsletters API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: errorMessage });
  }
}
