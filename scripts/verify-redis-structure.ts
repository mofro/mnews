import { redisClient } from "@/lib/redisClient";
import logger from "@/utils/logger";

async function verifyRedisStructure() {
  try {
    logger.info("Verifying Redis structure...");

    // Test connection
    const connection = await redisClient.testConnectionDetailed();
    if (!connection.success) {
      logger.error("Failed to connect to Redis:", connection.error);
      return;
    }

    logger.info(`✅ Redis connection successful (${connection.pingTime}ms)`);

    // Get newsletter IDs
    const newsletterIds = await redisClient.lrange("newsletter_ids", 0, -1);
    logger.info(`Found ${newsletterIds.length} newsletters`);

    if (newsletterIds.length === 0) {
      logger.info("No newsletters found in Redis");
      return;
    }

    // Get the most recent newsletter
    const latestId = newsletterIds[0];
    logger.info("\nLatest newsletter ID:", latestId);

    // Get newsletter data
    const newsletterData = await redisClient.get(`newsletter:${latestId}`);
    const newsletterMeta = await redisClient.hgetall(
      `newsletter:meta:${latestId}`,
    );

    if (!newsletterData) {
      logger.error("No data found for newsletter:", latestId);
      return;
    }

    logger.info("\n📝 Newsletter Data:");
    console.log(JSON.stringify(newsletterData, null, 2));

    if (newsletterMeta) {
      logger.info("\n📊 Newsletter Metadata:");
      console.log(JSON.stringify(newsletterMeta, null, 2));

      // Parse and display metadata JSON if it exists
      if (newsletterMeta.metadata) {
        try {
          const metadata = JSON.parse(newsletterMeta.metadata);
          logger.info("\n🔍 Parsed Metadata:");
          console.log(JSON.stringify(metadata, null, 2));
        } catch (e) {
          logger.warn("Could not parse metadata JSON:", e);
        }
      }
    }

    // Check if content is present
    const content =
      typeof newsletterData === "string"
        ? JSON.parse(newsletterData).content
        : newsletterData.content;

    if (content) {
      logger.info("\n📄 Content Preview:");
      console.log(content.substring(0, 200) + "...");
    }
  } catch (error) {
    logger.error("Error verifying Redis structure:", error);
  } finally {
    process.exit(0);
  }
}

verifyRedisStructure();
