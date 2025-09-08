import { redisClient } from "../lib/redisClient.js";
import logger from "../utils/logger.js";

async function checkNewsletterContent() {
  try {
    // Get all newsletter IDs
    const ids = await redisClient.lrange("newsletter_ids", 0, -1);

    if (ids.length === 0) {
      logger.info("No newsletters found in the database");
      return;
    }

    logger.info(`Found ${ids.length} newsletters`);

    // Check first 5 newsletters
    const sampleIds = ids.slice(0, 5);

    for (const id of sampleIds) {
      const key = `newsletter:${id}`;
      const metaKey = `newsletter:meta:${id}`;

      logger.info(`\n=== Checking newsletter ${id} ===`);

      try {
        // Get main content
        const data = await redisClient.get(key);
        const parsedData =
          typeof data === "string" ? JSON.parse(data) : data || {};

        // Get metadata
        const metaData = await redisClient.hgetall(metaKey);

        logger.info("Content fields:", {
          hasContent: !!parsedData.content,
          contentLength: parsedData.content?.length || 0,
          hasCleanContent: !!parsedData.cleanContent,
          cleanContentLength: parsedData.cleanContent?.length || 0,
          hasRawContent: !!parsedData.rawContent,
          rawContentLength: parsedData.rawContent?.length || 0,
          allContentFields: Object.keys(parsedData).filter((k) =>
            k.toLowerCase().includes("content"),
          ),
          metadataFields: Object.keys(metaData || {}),
        });

        logger.info(
          "Sample content (first 200 chars):",
          parsedData.content?.substring(0, 200) ||
            parsedData.cleanContent?.substring(0, 200) ||
            parsedData.rawContent?.substring(0, 200) ||
            "[No content found]",
        );
      } catch (error) {
        logger.error(`Error processing newsletter ${id}:`, error);
      }
    }
  } catch (error) {
    logger.error("Error checking newsletter content:", error);
  } finally {
    process.exit(0);
  }
}

checkNewsletterContent();
