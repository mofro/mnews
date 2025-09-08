import { NextApiRequest, NextApiResponse } from "next";
import { redisClient } from "@/lib/redisClient";
interface NewsletterType {
  id: string;
  title?: string;
  subject?: string;
  sender?: string;
  from?: string;
  publishDate?: string;
  date?: string;
  content?: string;
  cleanContent?: string;
  rawContent?: string;
  textContent?: string;
  url?: string;
  isRead?: boolean;
  isArchived?: boolean;
  tags?: string[];
  imageUrl?: string;
  [key: string]: any;
}
import logger from "@/utils/logger";

// Schema constants
const SCHEMA = {
  NEWSLETTER_PREFIX: "newsletter:",
  NEWSLETTER_IDS_KEY: "newsletter_ids",
  META_PREFIX: "newsletter:meta:",
} as const;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<NewsletterType | { error: string }>,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Newsletter ID is required" });
  }

  try {
    const newsletterKey = `${SCHEMA.NEWSLETTER_PREFIX}${id}`;
    logger.info(`Fetching newsletter data for key: ${newsletterKey}`);

    // Try to get the newsletter data
    const newsletterData = await redisClient.get(newsletterKey);

    if (!newsletterData) {
      logger.warn(`Newsletter not found: ${newsletterKey}`);
      return res.status(404).json({ error: "Newsletter not found" });
    }

    // Parse the newsletter data
    let newsletter;
    try {
      newsletter =
        typeof newsletterData === "string"
          ? JSON.parse(newsletterData)
          : newsletterData;

      // Log the raw data we got from Redis
      logger.info("Raw newsletter data from Redis:", {
        rawData:
          typeof newsletterData === "string"
            ? newsletterData.substring(0, 200) + "..."
            : "[Object]",
        parsedType: typeof newsletter,
        parsedKeys: Object.keys(newsletter),
        hasContent: "content" in newsletter,
        contentType: typeof newsletter.content,
        contentLength:
          typeof newsletter.content === "string"
            ? newsletter.content.length
            : 0,
        contentSample:
          typeof newsletter.content === "string"
            ? newsletter.content.substring(0, 100) + "..."
            : "N/A",
      });

      logger.info("Successfully parsed newsletter data", {
        id: newsletter.id,
        hasContent: !!newsletter.content,
        contentLength: newsletter.content?.length || 0,
        hasCleanContent: !!newsletter.cleanContent,
        cleanContentLength: newsletter.cleanContent?.length || 0,
        hasRawContent: !!newsletter.rawContent,
        rawContentLength: newsletter.rawContent?.length || 0,
        allKeys: Object.keys(newsletter),
      });
    } catch (error) {
      logger.error("Error parsing newsletter data:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        dataType: typeof newsletterData,
        dataSample:
          typeof newsletterData === "string"
            ? newsletterData.substring(0, 200) + "..."
            : "[Non-string data]",
      });
      return res.status(500).json({
        error: "Error parsing newsletter data",
        details: error instanceof Error ? error.message : String(error),
      });
    }

    // Get the metadata
    const metaKey = `${SCHEMA.META_PREFIX}${id}`;
    logger.info(`Fetching metadata for key: ${metaKey}`);

    let metaData;
    try {
      metaData = await redisClient.hgetall(metaKey);
      logger.info("Retrieved metadata", {
        hasMetaData: !!metaData && Object.keys(metaData).length > 0,
        metaKeys: metaData ? Object.keys(metaData) : [],
      });
    } catch (metaError) {
      logger.warn("Error fetching metadata, continuing without it", {
        error:
          metaError instanceof Error ? metaError.message : String(metaError),
        metaKey,
      });
      metaData = {};
    }

    // Debug: Log all available content fields
    const allContentFields = {
      content: newsletter.content,
      cleanContent: newsletter.cleanContent,
      rawContent: newsletter.rawContent,
      textContent: newsletter.textContent,
    };

    logger.info(
      "Available content fields:",
      Object.entries(allContentFields).map(([key, value]) => ({
        field: key,
        exists: value !== undefined,
        notEmpty: !!value,
        length: typeof value === "string" ? value.length : 0,
        first100:
          typeof value === "string"
            ? value.substring(0, 100) + "..."
            : undefined,
      })),
    );

    // Helper function to clean and process HTML content
    const processContent = (html: string | undefined): string => {
      if (!html) return "";

      // Basic cleaning
      return (
        html
          // Remove empty tags
          .replace(/<\w+[^>]*>\s*<\/\w+>/g, "")
          // Remove style and script tags
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
          // Remove common email client wrappers
          .replace(/<\/div><div class="gmail_quote">/g, "\n")
          .trim()
      );
    };

    // Combine the data with fallbacks
    const result: NewsletterType = {
      id: newsletter.id || id,
      title: newsletter.subject || newsletter.title || "Untitled Newsletter",
      // Process content with proper fallbacks
      content: processContent(
        newsletter.content ||
          newsletter.cleanContent ||
          newsletter.rawContent ||
          newsletter.textContent,
      ),
      cleanContent: processContent(
        newsletter.cleanContent || newsletter.content || newsletter.rawContent,
      ),
      rawContent: processContent(
        newsletter.rawContent || newsletter.content || newsletter.cleanContent,
      ),
      textContent:
        newsletter.textContent ||
        (typeof newsletter.content === "string"
          ? // eslint-disable-next-line no-useless-escape
            newsletter.content.replace(/<[^>]*>?/gm, "")
          : ""),
      publishDate:
        newsletter.publishDate || newsletter.date || new Date().toISOString(),
      sender: newsletter.sender || newsletter.from || "Unknown Sender",
      url: newsletter.url || `/newsletters/${id}`,
      isRead: metaData?.isRead === "1" || newsletter.isRead === true,
      isArchived:
        metaData?.isArchived === "1" || newsletter.isArchived === true,
      tags: (() => {
        try {
          if (metaData?.tags) return JSON.parse(metaData.tags);
          if (Array.isArray(newsletter.tags)) return newsletter.tags;
          return [];
        } catch (e) {
          logger.warn("Error parsing tags", { error: e });
          return [];
        }
      })(),
      // Include raw data for debugging in development
      ...(process.env.NODE_ENV === "development"
        ? {
            _raw: {
              newsletter,
              metaData,
              contentFields: allContentFields,
            },
          }
        : {}),
    };

    // Log the final content that will be sent
    logger.info("Constructed newsletter response", {
      id: result.id,
      hasContent: !!result.content,
      contentLength: result.content?.length || 0,
      hasCleanContent: !!result.cleanContent,
      cleanContentLength: result.cleanContent?.length || 0,
      hasRawContent: !!result.rawContent,
      rawContentLength: result.rawContent?.length || 0,
      hasTextContent: !!result.textContent,
      textContentLength: result.textContent?.length || 0,
      first100Chars: result.content
        ? result.content.substring(0, 100) + "..."
        : "[no content]",
    });

    logger.info(`Serving newsletter: ${id}`, {
      hasContent: !!result.content,
      contentLength: result.content?.length || 0,
      hasMeta: !!metaData,
      metaKeys: metaData ? Object.keys(metaData) : [],
    });

    return res.status(200).json(result);
  } catch (error) {
    logger.error("Error fetching newsletter:", error);
    return res.status(500).json({
      error: "Internal server error",
      ...(process.env.NODE_ENV === "development"
        ? { details: error instanceof Error ? error.message : String(error) }
        : {}),
    });
  }
}
