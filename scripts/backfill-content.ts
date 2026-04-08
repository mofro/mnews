#!/usr/bin/env node
/**
 * Re-run content cleaning on all existing newsletters.
 *
 * Reads rawContent from Redis, runs it through the updated contentCleaner,
 * and writes the result back as cleanContent. Safe to run multiple times.
 *
 * Usage:
 *   npm run backfill:content          # dry run — preview only
 *   npm run backfill:content:run      # apply changes
 */

import { redisClient } from "../lib/redisClient.js";
import { cleanNewsletterContent } from "../lib/cleaners/contentCleaner.js";

const DRY_RUN = !process.argv.includes("--run");

async function main() {
  console.log(`\n=== Content backfill (${DRY_RUN ? "DRY RUN" : "APPLYING"}) ===\n`);

  const ids = await redisClient.lrange("newsletter_ids", 0, -1);
  console.log(`Found ${ids.length} newsletters\n`);

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const id of ids) {
    try {
      const raw = await redisClient.get(`newsletter:${id}`);
      if (!raw) { skipped++; continue; }

      const content: Record<string, any> =
        typeof raw === "string" ? JSON.parse(raw) : raw;

      const rawContent: string = content.rawContent || content.content || "";
      if (!rawContent) {
        console.log(`SKIP  ${id}  (no rawContent)`);
        skipped++;
        continue;
      }

      const { cleanedContent } = cleanNewsletterContent(rawContent);

      console.log(`${DRY_RUN ? "WOULD" : "OK   "}  ${id}  ${rawContent.length} → ${cleanedContent.length} bytes`);

      if (!DRY_RUN) {
        await redisClient.client.set(
          `newsletter:${id}`,
          JSON.stringify({ ...content, cleanContent: cleanedContent })
        );
      }

      processed++;
    } catch (err) {
      console.error(`ERROR ${id}:`, err);
      errors++;
    }
  }

  console.log(`\n=== Done: ${processed} processed, ${skipped} skipped, ${errors} errors ===\n`);
}

main().catch(console.error).finally(() => process.exit(0));
