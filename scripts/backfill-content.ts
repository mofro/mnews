#!/usr/bin/env node
/**
 * Re-run content cleaning on existing newsletters.
 *
 * Reads rawContent from Redis, runs it through the updated contentCleaner,
 * and writes the result back as cleanContent. Safe to run multiple times.
 *
 * Usage:
 *   npm run backfill:content                        # dry run — all newsletters
 *   npm run backfill:content:run                    # apply — all newsletters
 *   npx tsx scripts/backfill-content.ts --id 123   # dry run — one newsletter
 *   npx tsx scripts/backfill-content.ts --id 123 --run  # apply — one newsletter
 */

import { redisClient } from "../lib/redisClient.js";
import { cleanNewsletterContent } from "../lib/cleaners/contentCleaner.js";

const DRY_RUN = !process.argv.includes("--run");
const idFlagIndex = process.argv.indexOf("--id");
const SINGLE_ID = idFlagIndex !== -1 ? process.argv[idFlagIndex + 1] : null;

async function main() {
  console.log(
    `\n=== Content backfill (${DRY_RUN ? "DRY RUN" : "APPLYING"})${SINGLE_ID ? ` — id ${SINGLE_ID}` : ""} ===\n`,
  );

  const ids = SINGLE_ID
    ? [SINGLE_ID]
    : await redisClient.lrange("newsletter_ids", 0, -1);

  console.log(`Found ${ids.length} newsletter(s)\n`);

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const id of ids) {
    try {
      const raw = await redisClient.get(`newsletter:${id}`);
      if (!raw) {
        skipped++;
        console.log(`SKIP  ${id}  (not found in Redis)`);
        continue;
      }

      const content: Record<string, any> =
        typeof raw === "string" ? JSON.parse(raw) : raw;

      const rawContent: string = content.rawContent || content.content || "";
      if (!rawContent) {
        console.log(`SKIP  ${id}  (no rawContent)`);
        skipped++;
        continue;
      }

      const { cleanedContent } = cleanNewsletterContent(rawContent);

      console.log(
        `${DRY_RUN ? "WOULD" : "OK   "}  ${id}  ${rawContent.length} → ${cleanedContent.length} bytes`,
      );

      if (SINGLE_ID && DRY_RUN) {
        console.log("\n--- Cleaned output preview (first 2000 chars) ---");
        console.log(cleanedContent.substring(0, 2000));
        console.log("--- end preview ---\n");
      }

      if (!DRY_RUN) {
        await redisClient.client.set(
          `newsletter:${id}`,
          JSON.stringify({ ...content, cleanContent: cleanedContent }),
        );
      }

      processed++;
    } catch (err) {
      console.error(`ERROR ${id}:`, err);
      errors++;
    }
  }

  console.log(
    `\n=== Done: ${processed} processed, ${skipped} skipped, ${errors} errors ===\n`,
  );
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
