import { NextApiRequest, NextApiResponse } from "next";
import { redisClient } from "@/lib/redisClient";
import logger from "@/utils/logger";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get all keys matching the newsletter pattern
    const allKeys = await redisClient.keys("*");

    // Get all newsletter IDs
    const newsletterIds = await redisClient.lrange("newsletter_ids", 0, -1);

    // Get sample newsletter data if available
    let sampleNewsletter = null;
    if (newsletterIds.length > 0) {
      const contentKey = `newsletter:${newsletterIds[0]}`;
      const metaKey = `newsletter:meta:${newsletterIds[0]}`;

      const [content, meta] = await Promise.all([
        redisClient.get(contentKey),
        redisClient.hgetall(metaKey),
      ]);

      sampleNewsletter = {
        contentKey,
        metaKey,
        content: content ? "Content exists" : "No content",
        meta: meta ? "Meta exists" : "No meta",
      };
    }

    return res.status(200).json({
      allKeys,
      newsletterIds,
      sampleNewsletter,
      stats: {
        totalKeys: allKeys.length,
        totalNewsletters: newsletterIds.length,
      },
    });
  } catch (error) {
    // Using logger instead of console for consistency
    logger.error("Redis debug error:", error);
    return res.status(500).json({
      error: "Failed to fetch Redis data",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
