import { NextApiRequest, NextApiResponse } from "next";
import { redisClient } from "@/lib/redisClient";
import { NewsletterParser, ParseResult } from "../../lib/parser";
import { cleanNewsletterContent } from "../../lib/cleaners/contentCleaner";
import logger from "../../utils/logger";
import { Newsletter } from "../../types/newsletter";
import { processNewsletterContent } from "../../utils/content";

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
import { parseDateToISOString } from "../../utils/dateService";

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

    logger.log("Newsletter received:", { subject, from, date });

    // UPDATED: Handle both original content and cleaned content
    const originalContent = body || "";
    let cleanContent: string;
    let processingVersion = "2.6.0-existing-logic";

    try {
      // Clean the content with our enhanced cleaner
      const cleanedResult = cleanNewsletterContent(originalContent);

      // Log what was removed during cleaning
      logger.log(
        `Initial cleaning removed ${cleanedResult.removedItems.length} elements:`,
      );
      cleanedResult.removedItems.forEach((item) => {
        logger.log(`- ${item.description}: ${item.matches} matches`);
      });

      // Process with the parser, preserving HTML structure but allowing some cleaning
      const parseResult = NewsletterParser.parseToCleanHTML(
        cleanedResult.cleanedContent,
        {
          skipHtmlToText: true, // Keep HTML structure
          enableImages: true, // Preserve images
          enableLinks: true, // Preserve links
          enableStructureRecovery: true,
          enableLinkPreservation: true,
          enableImagePreservation: true,
          enableContentCleaning: true, // Let the parser do some cleaning

          // Allow common HTML tags
          ALLOWED_TAGS: [
            "p",
            "div",
            "span",
            "a",
            "img",
            "br",
            "strong",
            "em",
            "b",
            "i",
            "u",
            "ul",
            "ol",
            "li",
            "h1",
            "h2",
            "h3",
            "h4",
            "h5",
            "h6",
            "table",
            "tr",
            "td",
            "th",
            "thead",
            "tbody",
            "tfoot",
            "blockquote",
            "pre",
            "code",
            "hr",
            "img",
            "figure",
            "figcaption",
          ],

          // Allow common attributes
          ALLOWED_ATTR: [
            "href",
            "src",
            "alt",
            "title",
            "target",
            "class",
            "style",
            "width",
            "height",
            "align",
            "valign",
            "border",
            "cellpadding",
            "cellspacing",
          ],

          // Don't allow data attributes as they often contain tracking info
          ALLOW_DATA_ATTR: false,
        },
      );

      // Get the parsed content and clean it again to catch anything the parser might have introduced
      const parsedContent = parseResult.finalOutput;

      // Process the content using our centralized utilities
      const { cleanContent: processedCleanContent, textContent } =
        processNewsletterContent(parsedContent);
      const wordCount = textContent.split(/\s+/).filter(Boolean).length;

      // Update processing version with our custom version
      processingVersion = `3.0.0-cleaner-${parseResult.metadata.processingVersion}`;
      logger.log("Enhanced parser success:", {
        originalLength: originalContent.length,
        cleanLength: processedCleanContent.length,
        compressionRatio: parseResult.metadata.compressionRatio,
      });

      cleanContent = processedCleanContent;
    } catch (parseError) {
      logger.error("Parser failed, using original HTML:", parseError);
      cleanContent = originalContent; // Fall back to original HTML if parsing fails
    }

    logger.log("Content cleaned, length:", cleanContent.length);

    // Create the newsletter object with our standardized content model
    const id = Date.now().toString();
    const textContent = htmlToText(cleanContent);
    const wordCount = textContent.split(/\s+/).filter(Boolean).length;

    const newsletter: Newsletter = {
      // Core fields
      id,
      subject: subject || "No Subject",
      sender: from || "Unknown Sender",
      receivedAt: date || new Date().toISOString(),
      isRead: false,
      isArchived: false,
      lastAccessedAt: null,

      // Content fields
      rawContent: originalContent,
      cleanContent,
      textContent,

      // Additional metadata
      tags: [],

      // Legacy field (temporary)
      content: cleanContent,
    };

    logger.log("Saving newsletter data to Redis...");

    // Store the main content in the format expected by the application
    const contentData = {
      id: newsletter.id,
      subject: newsletter.subject,
      sender: newsletter.sender,
      date: newsletter.receivedAt,
      content: newsletter.cleanContent,
      cleanContent: newsletter.cleanContent,
      rawContent: newsletter.rawContent,
      url: newsletter.url || "",
    };

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
    logger.log("Verifying saved data...");
    const savedData = await redis.get(`newsletter:${newsletter.id}`);
    logger.log("Retrieved data:", savedData);

    logger.log("Newsletter saved to Redis:", newsletter.id);

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
