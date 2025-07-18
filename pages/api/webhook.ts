
import { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';
import { NewsletterParser, ParseResult } from '../../lib/parser';
import { cleanNewsletterContent } from '../../lib/cleaners/contentCleaner';

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
  let text = html
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
    
    console.log('Newsletter received:', { subject, from, date });

    // UPDATED: Handle both original content and cleaned content
    const originalContent = body || '';
    let cleanContent: string;
    let processingVersion = '2.6.0-existing-logic';
    
    try {
      // First clean the content of tracking/ads
      const cleanedResult = cleanNewsletterContent(originalContent);
      
      // Process with the parser, preserving HTML structure
      const parseResult = NewsletterParser.parseToCleanHTML(cleanedResult.cleanedContent, {
        // Skip the HTML-to-text conversion entirely
        skipHtmlToText: true,
        // Preserve all content structure
        enableImages: true,
        enableLinks: true,
        enableStructureRecovery: true,
        enableLinkPreservation: true,
        enableImagePreservation: true,
        enableContentCleaning: false,
        // Ensure we don't strip any HTML tags
        ALLOWED_TAGS: '*',
        ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target', 'class', 'style'],
        ALLOW_DATA_ATTR: true
      });

      cleanContent = parseResult.finalOutput;
      
      // Log what was removed for debugging
      console.log(`Cleaning removed ${cleanedResult.removedItems.length} types of elements:`);
      cleanedResult.removedItems.forEach(item => {
        console.log(`- ${item.description}: ${item.matches} matches`);
      });
      processingVersion = parseResult.metadata.processingVersion;
      console.log('Enhanced parser success:', {
        originalLength: originalContent.length,
        cleanLength: cleanContent.length,
        compressionRatio: parseResult.metadata.compressionRatio
      });
    } catch (parseError) {
      console.error('Parser failed, using original HTML:', parseError);
      cleanContent = originalContent;  // Fall back to original HTML if parsing fails
    }
    
    console.log('Content cleaned, length:', cleanContent.length);
    
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
    console.log('About to save newsletter:', newsletter);
    
    // Use your existing Redis list pattern
    console.log('Saving newsletter ID to list...');
    const listResult = await redis.lpush('newsletter_ids', newsletter.id);
    console.log('List push result:', listResult);
    
    // Store the full newsletter data
    console.log('Saving newsletter data...');
    const setResult = await redis.set(`newsletter:${newsletter.id}`, JSON.stringify(newsletter));
    console.log('Set result:', setResult);

    // Verify the data was saved
    console.log('Verifying saved data...');
    const savedData = await redis.get(`newsletter:${newsletter.id}`);
    console.log('Retrieved data:', savedData);

    console.log('Newsletter saved to Redis:', newsletter.id);

    // Your existing response format (preserved)
    res.status(200).json({ 
      message: 'Newsletter received and saved',
      id: newsletter.id 
    });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
