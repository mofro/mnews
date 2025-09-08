import { NextApiRequest, NextApiResponse } from "next";
import { redisClient } from "@/lib/redisClient";
// Import the correct parser implementation
import { NewsletterParser } from "@/lib/parser";
import { cleanNewsletterContent } from "@/lib/cleaners/contentCleaner";
import logger from "@/utils/logger";
import type { Newsletter as ProcessableNewsletter } from "@/types/newsletter";
import { processNewsletterContent } from "@/utils/content";

// Verify required environment variables are present
if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
  throw new Error(
    "Missing required environment variables: KV_REST_API_URL and KV_REST_API_TOKEN",
  );
}

// Initialize Redis client
const redis = redisClient;

// Your existing HTML to text converter (preserved exactly)
function htmlToText(html: string): string {
  if (!html) return "";

  // Remove HTML tags (ES2017 compatible)
  const text = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "") // Remove style blocks
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "") // Remove scripts
    .replace(/<[^>]+>/g, " ") // Remove all HTML tags
    .replace(/&nbsp;/g, " ") // Replace non-breaking spaces
    .replace(/&amp;/g, "&") // Replace HTML entities
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\r\n/g, "\n") // Normalize line breaks
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n") // Collapse multiple line breaks
    .replace(/[ \t]{2,}/g, " ") // Collapse multiple spaces
    .trim();

  return text;
}

// Using the centralized date service instead of local implementation
import { parseDateToISOString } from "@/utils/dateService";

// Wrapper to maintain backward compatibility
const normalizeDate = (dateInput: any): string => {
  return parseDateToISOString(dateInput) || new Date().toISOString();
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Extract newsletter data from request (your existing field names)
    const { subject, body, from, date } = req.body;

    logger.info("Newsletter received", { subject, from, date });

    // UPDATED: Handle both original content and cleaned content
    const originalContent = body || "";
    let cleanContent: string;
    let cleanHTML = '';
    let text = '';
    let processingVersion = '1.0.0'; // Default version
    
    try {
      // Clean the content with our enhanced cleaner
      const cleanedResult = cleanNewsletterContent(originalContent);
      logger.info("Cleaned content");

      // Parse the email content using the incremental parser
      // @ts-ignore - Using internal implementation details
      const parseResult = new NewsletterParser().parseToCleanHTML(cleanedResult.cleanedContent);
      logger.info("Parsed content");

      // Get the cleaned HTML content
      cleanHTML = parseResult.finalOutput || "";
      logger.info("Cleaned HTML content");

      // Process the content
      const processed = await processNewsletterContent(cleanHTML, {
        cleanHtml: true,
        extractText: true,
        extractImages: true
      });

      // Create the newsletter object with processed content
      const now = new Date().toISOString();
      const newsletter: ProcessableNewsletter = {
        id: '', // Will be set later
        cleanContent: cleanHTML,
        textContent: processed.text || '',
        subject: '', // Will be set from webhook data
        from: '',  // Will be set from webhook data
        date: now,
        metadata: {
          processedAt: now
        }
      };

      text = processed.text || "";

      // Update processing version with our custom version
      processingVersion = `3.0.0-cleaner-${parseResult.metadata?.processingVersion || 'unknown'}`;
      logger.info("Enhanced parser success");
      logger.info("Content lengths", {
        original: originalContent.length,
        clean: cleanHTML.length,
        compression: parseResult.metadata?.compressionRatio || 0,
      });

      cleanContent = cleanHTML;
    } catch (parseError) {
      logger.error("Parser failed, using original HTML:", parseError);
      cleanContent = originalContent; // Fall back to original HTML if parsing fails
    }

    logger.info(`Content cleaned, length: ${cleanContent.length}`);

    // Define the newsletter type with all required properties
    interface Newsletter {
      // Core fields
      id: string;
      subject: string;
      from: string;
      date: string;
      content: string;
      rawContent: string;
      cleanContent: string;
      textContent: string;
      processingVersion: string;
      
      // Status fields
      isRead: boolean;
      isArchived: boolean;
      lastAccessedAt?: string | null;
      
      // Additional fields
      url: string;
      tags: string[];
      
      // Metadata
      metadata: {
        source: string;
        processingTime: number;
        compressionRatio: number;
        processedAt: string;
        isRead?: boolean;
        archived?: boolean;
      };
      
      // Alias for compatibility
      sender: string;
      receivedAt: string;
    }

    // Track processing time
    const startTime = Date.now();
    
    // Create the newsletter object with our standardized content model
    const id = Date.now().toString();
    const textContent = cleanContent.replace(/<[^>]*>?/gm, ''); // Simple HTML to text conversion
    const wordCount = textContent.split(/\s+/).filter(Boolean).length;
    
    // Set end time after all processing is done
    const endTime = Date.now();

    const now = new Date().toISOString();
    const newsletter: Newsletter = {
      // Core fields
      id,
      subject: subject || "No Subject",
      from: from || "Unknown Sender",
      date: date || now,
      content: cleanContent,
      rawContent: originalContent,
      cleanContent: cleanContent,
      textContent: textContent,
      processingVersion: processingVersion,
      
      // Status fields
      isRead: false,
      isArchived: false,
      lastAccessedAt: now,
      
      // Additional fields
      url: `/newsletters/${id}`,
      tags: [],
      
      // Metadata
      metadata: {
        source: "webhook",
        processingTime: Date.now() - startTime,
        compressionRatio: 0, // This would need to be calculated
        processedAt: now,
        isRead: false,
        archived: false
      },
      
      // Aliases for compatibility
      sender: from || "Unknown Sender",
      receivedAt: date || now,
    };

    logger.info("Saving newsletter data to Redis...");

    // Store the main content in the format expected by the application
    const contentData = {
      id: newsletter.id,
      subject: newsletter.subject,
      sender: newsletter.sender,
      from: newsletter.sender, // Ensure 'from' field is set
      date: newsletter.receivedAt,
      // Store all content variants
      content: newsletter.cleanContent || newsletter.content,
      cleanContent: newsletter.cleanContent || newsletter.content,
      rawContent: newsletter.rawContent || newsletter.content,
      textContent: newsletter.textContent || (typeof newsletter.content === 'string' ? 
        newsletter.content.replace(/<[^>]*>?/gm, '') : ''),
      url: newsletter.url || `/newsletters/${newsletter.id}`,
      // Add any additional fields that the frontend might expect
      title: newsletter.subject,
      publishDate: newsletter.receivedAt,
      // Ensure these fields are always present
      isRead: false,
      isArchived: false,
      tags: []
    };
    
    // Log the data we're about to store
    logger.info('Storing newsletter content:', {
      id: newsletter.id,
      contentLength: contentData.content?.length,
      cleanContentLength: contentData.cleanContent?.length,
      rawContentLength: contentData.rawContent?.length,
      textContentLength: contentData.textContent?.length,
      keys: Object.keys(contentData)
    });

    // Store the main content
    await redis.set(`newsletter:${newsletter.id}`, JSON.stringify(contentData));

    // Store metadata separately
    await redis.hset(`newsletter:meta:${newsletter.id}`, {
      id: newsletter.id,
      subject: newsletter.subject,
      sender: newsletter.sender,
      receivedAt: newsletter.receivedAt,
      isRead: newsletter.isRead ? "1" : "0",
      isArchived: newsletter.isArchived ? "1" : "0",
      lastAccessedAt: newsletter.lastAccessedAt || new Date().toISOString(),
      wordCount: wordCount.toString(),
      tags: JSON.stringify(newsletter.tags || []),
      // Include metadata field that the API expects
      metadata: JSON.stringify({
        processingVersion: "1.0",
        processedAt: new Date().toISOString(),
        isRead: newsletter.isRead,
        archived: newsletter.isArchived,
      }),
    });

    // Add to newsletter IDs list for chronological ordering
    await redis.lpush("newsletter_ids", newsletter.id);

    // Verify the data was saved
    logger.info("Verifying saved data...");
    const savedData = await redis.get(`newsletter:${newsletter.id}`);
    logger.info("Retrieved data", { hasData: !!savedData });

    logger.info("Newsletter saved to Redis", { id, subject, from });
    logger.info(`Processing time: ${endTime - startTime}ms`);
    logger.info(`Processing version: ${processingVersion}`);

    // Your existing response format (preserved)
    res.status(200).json({
      message: "Newsletter received and saved",
      id: newsletter.id,
    });
  } catch (error) {
    logger.error("Webhook error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
