import { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';
import { NewsletterParser, ParseResult } from '../../lib/parser';
import { cleanNewsletterContent } from '../../lib/cleaners/contentCleaner';
import logger from '../../utils/logger';

// Initialize Redis connection using existing KV variables (your existing config)
if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
  throw new Error('Missing required environment variables: KV_REST_API_URL and KV_REST_API_TOKEN');
}

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// UPDATED: Newsletter interface with additive content model
interface Newsletter {
  id: string;
  subject: string;
  sender: string;     
  date: string;
  isNew: boolean;
  
  // NEW: Additive content model
  rawContent: string;      // Original email content
  cleanContent: string;    // Processed clean content
  
  // NEW: Processing metadataconst
  metadata: {
    processingVersion: string;
    processedAt: string;
    wordCount?: number;
  };
  
  // LEGACY: Backward compatibility
  content: string;         // Keep for existing dashboard
}

// Your existing HTML to text converter (preserved exactly)
function htmlToText(html: string): string {
  if (!html) return '';
  
  // Remove HTML tags (ES2017 compatible)
  const text = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove style blocks
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
    .replace(/<[^>]+>/g, ' ') // Remove all HTML tags
    .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
    .replace(/&amp;/g, '&') // Replace HTML entities
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\r\n/g, '\n') // Normalize line breaks
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n') // Collapse multiple line breaks
    .replace(/[ \t]{2,}/g, ' ') // Collapse multiple spaces
    .trim();
  
  return text;
}

// Using the centralized date service instead of local implementation
import { parseDateToISOString } from '../../utils/dateService';

// Wrapper to maintain backward compatibility
const normalizeDate = (dateInput: any): string => {
  return parseDateToISOString(dateInput) || new Date().toISOString();
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Extract newsletter data from request (your existing field names)
    const { subject, body, from, date } = req.body;
    
    logger.log('Newsletter received:', { subject, from, date });

    // UPDATED: Handle both original content and cleaned content
    const originalContent = body || '';
    let cleanContent: string;
    let processingVersion = '2.6.0-existing-logic';
    
    try {
      // Clean the content with our enhanced cleaner
      const cleanedResult = cleanNewsletterContent(originalContent);
      
      // Log what was removed during cleaning
      logger.log(`Initial cleaning removed ${cleanedResult.removedItems.length} elements:`);
      cleanedResult.removedItems.forEach(item => {
        logger.log(`- ${item.description}: ${item.matches} matches`);
      });
      
      // Process with the parser, preserving HTML structure but allowing some cleaning
      const parseResult = NewsletterParser.parseToCleanHTML(cleanedResult.cleanedContent, {
        skipHtmlToText: true,  // Keep HTML structure
        enableImages: true,    // Preserve images
        enableLinks: true,     // Preserve links
        enableStructureRecovery: true,
        enableLinkPreservation: true,
        enableImagePreservation: true,
        enableContentCleaning: true,  // Let the parser do some cleaning
        
        // Allow common HTML tags
        ALLOWED_TAGS: [
          'p', 'div', 'span', 'a', 'img', 'br', 'strong', 'em', 'b', 'i', 'u', 
          'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'table', 'tr', 'td', 'th', 'thead', 'tbody', 'tfoot',
          'blockquote', 'pre', 'code', 'hr', 'img', 'figure', 'figcaption'
        ],
        
        // Allow common attributes
        ALLOWED_ATTR: [
          'href', 'src', 'alt', 'title', 'target', 'class', 'style',
          'width', 'height', 'align', 'valign', 'border', 'cellpadding', 'cellspacing'
        ],
        
        // Don't allow data attributes as they often contain tracking info
        ALLOW_DATA_ATTR: false
      });

      // Get the parsed content and clean it again to catch anything the parser might have introduced
      cleanContent = parseResult.finalOutput;
      
      // Update processing version with our custom version
      processingVersion = `3.0.0-cleaner-${parseResult.metadata.processingVersion}`;
      logger.log('Enhanced parser success:', {
        originalLength: originalContent.length,
        cleanLength: cleanContent.length,
        compressionRatio: parseResult.metadata.compressionRatio
      });
    } catch (parseError) {
      logger.error('Parser failed, using original HTML:', parseError);
      cleanContent = originalContent;  // Fall back to original HTML if parsing fails
    }
    
    logger.log('Content cleaned, length:', cleanContent.length);
    
    // UPDATED: Create newsletter object with additive content model
    const newsletter: Newsletter = {
      id: Date.now().toString(),              // Your existing ID generation
      subject: subject || 'No Subject',
      sender: from || 'Unknown Sender', 
      date: normalizeDate(date),
      isNew: true,                            // Your existing field
      
      // NEW: Additive content model
      rawContent: originalContent,            // Preserve original
      cleanContent: cleanContent,             // Processed version
      
      // NEW: Processing metadata
      metadata: {
        processingVersion: processingVersion,
        processedAt: new Date().toISOString(),
        wordCount: cleanContent.split(' ').length
      },
      
      // LEGACY: Backward compatibility
      content: cleanContent,                  // Keep for existing dashboard
    };

    // Your existing Redis storage pattern (preserved exactly)
    logger.log('About to save newsletter:', newsletter);
    
    // Use your existing Redis list pattern
    logger.log('Saving newsletter ID to list...');
    const listResult = await redis.lpush('newsletter_ids', newsletter.id);
    logger.log('List push result:', listResult);
    
    // Store the full newsletter data
    logger.log('Saving newsletter data...');
    const setResult = await redis.set(`newsletter:${newsletter.id}`, JSON.stringify(newsletter));
    logger.log('Set result:', setResult);

    // Verify the data was saved
    logger.log('Verifying saved data...');
    const savedData = await redis.get(`newsletter:${newsletter.id}`);
    logger.log('Retrieved data:', savedData);

    logger.log('Newsletter saved to Redis:', newsletter.id);

    // Your existing response format (preserved)
    res.status(200).json({ 
      message: 'Newsletter received and saved',
      id: newsletter.id 
    });

  } catch (error) {
    logger.error('Webhook error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
