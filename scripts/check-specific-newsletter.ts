import { redisClient } from "../lib/redisClient.js";
import logger from "../utils/logger.js";

async function checkSpecificNewsletter(id: string) {
  try {
    logger.info(`Checking newsletter with ID: ${id}`);

    // Get the main content
    const contentKey = `newsletter:${id}`;
    const contentData = await redisClient.get(contentKey);

    if (!contentData) {
      logger.error(`No content found for newsletter: ${id}`);
      return;
    }

    // Parse the content
    let parsedContent;
    try {
      parsedContent =
        typeof contentData === "string" ? JSON.parse(contentData) : contentData;
    } catch (error) {
      logger.error(`Error parsing content for newsletter ${id}:`, error);
      logger.info(
        "Raw content (first 200 chars):",
        typeof contentData === "string"
          ? contentData.substring(0, 200)
          : "[Non-string data]",
      );
      return;
    }

    // Get metadata
    const metaKey = `newsletter:meta:${id}`;
    const metaData = await redisClient.hgetall(metaKey);

    // Log the content analysis
    logger.info("Newsletter Content Analysis:", {
      id,
      contentKeys: Object.keys(parsedContent),
      contentTypes: Object.entries(parsedContent).reduce(
        (acc, [key, value]) => ({
          ...acc,
          [key]: typeof value,
        }),
        {},
      ),
      contentLengths: Object.entries(parsedContent).reduce(
        (acc, [key, value]) => ({
          ...acc,
          [key]: typeof value === "string" ? value.length : "N/A",
        }),
        {},
      ),
      hasContent: !!parsedContent.content,
      hasCleanContent: !!parsedContent.cleanContent,
      hasRawContent: !!parsedContent.rawContent,
      hasTextContent: !!parsedContent.textContent,
      metadata: metaData ? Object.keys(metaData) : "No metadata found",
    });

    // Log a sample of each content field
    Object.entries(parsedContent).forEach(([key, value]) => {
      if (typeof value === "string" && value.length > 0) {
        logger.info(
          `Content sample for ${key} (first 200 chars):`,
          value.substring(0, 200) + (value.length > 200 ? "..." : ""),
        );
      }
    });
  } catch (error) {
    logger.error("Error checking newsletter:", error);
  } finally {
    process.exit(0);
  }
}

// Get the ID from command line arguments
const newsletterId = process.argv[2];
if (!newsletterId) {
  console.error("Please provide a newsletter ID");
  process.exit(1);
}

checkSpecificNewsletter(newsletterId);
