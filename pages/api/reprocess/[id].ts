// FILE: pages/api/reprocess/[id].ts
// UPDATED: Reprocess a specific newsletter with INCREMENTAL PARSER

import { NextApiRequest, NextApiResponse } from "next";
import { NewsletterStorage } from "../../../lib/storage";
import { cleanNewsletterContent } from "../../../lib/cleaners/contentCleaner";
import { redisClient } from "../../../lib/redisClient";
import logger from "../../../utils/logger";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id } = req.query;
    const { options = {} } = req.body; // NEW: Accept parser options

    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Newsletter ID required" });
    }

    logger.log(`Reprocessing newsletter ${id} with options:`, options);

    // Get the existing newsletter
    const existingNewsletter = await NewsletterStorage.getNewsletter(id);
    if (!existingNewsletter) {
      return res.status(404).json({ error: "Newsletter not found" });
    }

    // Check if we have rawContent to reprocess
    if (!existingNewsletter.rawContent) {
      return res.status(400).json({
        error:
          "No raw content available for reprocessing. Newsletter was created before content preservation was implemented.",
        suggestion:
          "Only newsletters created after the content preservation update can be reprocessed.",
      });
    }

    logger.log("Original newsletter:", {
      id: existingNewsletter.id,
      subject: existingNewsletter.subject,
      hasRawContent: !!existingNewsletter.rawContent,
      currentProcessingVersion:
        existingNewsletter.metadata?.processingVersion || "unknown",
    });

    // Clean the content first
    logger.log("Running content cleaner...");
    const cleaningResult = cleanNewsletterContent(
      existingNewsletter.rawContent,
    );

    // Log cleaning results
    logger.log(
      `Content cleaner removed ${cleaningResult.removedItems.length} types of elements:`,
    );
    cleaningResult.removedItems.forEach((item) => {
      logger.log(`- ${item.description}: ${item.matches} matches`);
    });

    // Update the newsletter with new content
    try {
      // Get the existing newsletter to preserve other fields
      const existingNewsletter = await NewsletterStorage.getNewsletter(id);
      if (!existingNewsletter) {
        throw new Error("Newsletter not found after reprocessing");
      }

      // Update the clean content
      existingNewsletter.cleanContent = cleaningResult.cleanedContent;
      existingNewsletter.metadata = existingNewsletter.metadata || {};

      // Save the updated newsletter
      await redisClient.client.set(
        `newsletter:${id}`,
        JSON.stringify(existingNewsletter),
      );

      logger.log("Successfully updated newsletter content");
    } catch (updateError) {
      logger.error("Failed to update newsletter:", updateError);
      return res.status(500).json({
        error: "Failed to save reprocessed content",
        details:
          updateError instanceof Error
            ? updateError.message
            : String(updateError),
      });
    }

    // All done – respond to client with summary
    res.status(200).json({
      success: true,
      newsletterId: id,
      processingVersion: "3.0.0-cleaner",
      cleanLength: cleaningResult.cleanedContent.length,
    });
  } catch (error) {
    logger.error("Reprocessing error:", error);
    res.status(500).json({
      error: "Internal server error during reprocessing",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
