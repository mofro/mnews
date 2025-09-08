import { redisClient } from "../lib/redisClient.js";
import logger from "../utils/logger.js";

async function migrateNewsletterContent() {
  try {
    // Get all newsletter IDs
    const ids = await redisClient.lrange("newsletter_ids", 0, -1);

    if (ids.length === 0) {
      logger.info("No newsletters found in the database");
      return;
    }

    logger.info(`Found ${ids.length} newsletters to process`);
    let updatedCount = 0;

    for (const id of ids) {
      const key = `newsletter:${id}`;
      const metaKey = `newsletter:meta:${id}`;

      try {
        // Get the existing data
        const data = await redisClient.get(key);
        if (!data) continue;

        const newsletter = typeof data === "string" ? JSON.parse(data) : data;

        // Check if migration is needed
        if (
          newsletter.content &&
          newsletter.cleanContent &&
          newsletter.rawContent
        ) {
          logger.debug(`Newsletter ${id} already has all content fields`);
          continue;
        }

        // Get metadata
        const metaData = await redisClient.hgetall(metaKey);

        // Update the newsletter with all content fields
        const updatedNewsletter = {
          ...newsletter,
          // Ensure all content fields are populated
          content:
            newsletter.content ||
            newsletter.cleanContent ||
            newsletter.rawContent ||
            "",
          cleanContent:
            newsletter.cleanContent ||
            newsletter.content ||
            newsletter.rawContent ||
            "",
          rawContent:
            newsletter.rawContent ||
            newsletter.cleanContent ||
            newsletter.content ||
            "",
          textContent:
            newsletter.textContent ||
            (typeof newsletter.content === "string"
              ? newsletter.content.replace(/<[^>]*>?/gm, "")
              : ""),
          // Ensure required fields exist
          from: newsletter.from || newsletter.sender || "Unknown Sender",
          publishDate:
            newsletter.publishDate ||
            newsletter.date ||
            new Date().toISOString(),
          isRead: newsletter.isRead || metaData?.isRead === "1" || false,
          isArchived:
            newsletter.isArchived || metaData?.isArchived === "1" || false,
          tags:
            newsletter.tags ||
            (metaData?.tags ? JSON.parse(metaData.tags) : []),
        };

        // Save the updated newsletter
        await redisClient.set(key, JSON.stringify(updatedNewsletter));

        // Ensure metadata has required fields
        if (metaData) {
          await redisClient.hset(metaKey, {
            ...metaData,
            isRead: updatedNewsletter.isRead ? "1" : "0",
            isArchived: updatedNewsletter.isArchived ? "1" : "0",
            tags: JSON.stringify(updatedNewsletter.tags),
          });
        }

        logger.info(`Updated newsletter ${id}`);
        updatedCount++;
      } catch (error) {
        logger.error(`Error processing newsletter ${id}:`, error);
      }
    }

    logger.info(
      `Migration complete. Updated ${updatedCount} of ${ids.length} newsletters`,
    );
  } catch (error) {
    logger.error("Error during migration:", error);
  } finally {
    process.exit(0);
  }
}

// Run the migration
migrateNewsletterContent();
