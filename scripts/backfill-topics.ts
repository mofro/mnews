#!/usr/bin/env node
/**
 * Backfill topics and fix missing meta fields for existing newsletters.
 *
 * Topics are classified using the same logic as the webhook (data/topics.json).
 * Also backfills `receivedAt`, `subject`, and `sender` into meta hashes where
 * they are missing — these are required by the Morning Report API.
 *
 * Usage:
 *   npm run backfill:topics            # dry run — preview only
 *   npm run backfill:topics:run        # apply changes
 */

import { redisClient } from "../lib/redisClient.js";
import fs from "fs";
import path from "path";

const DRY_RUN = !process.argv.includes("--run");

// ─── Topic classification (mirrors pages/api/webhook.ts) ───────────────────

interface TopicCategory {
  name: string;
  color: string;
  senders?: string[];
  keywords?: string[];
}

function classifyTopics(sender: string, subject: string, textSnippet: string): string[] {
  try {
    const topicsPath = path.join(process.cwd(), "data", "topics.json");
    const { categories }: { categories: TopicCategory[] } = JSON.parse(
      fs.readFileSync(topicsPath, "utf-8")
    );

    const senderDomain = sender.match(/@([^>\s]+)/)?.[1]?.toLowerCase() ?? "";
    const senderFull = sender.toLowerCase();
    const haystack = `${subject} ${textSnippet}`.toLowerCase();

    const matched = categories
      .filter((cat) => {
        const senderMatch = cat.senders
          ?.filter(Boolean)
          .some((s) => {
            const sl = s.toLowerCase();
            return senderDomain.includes(sl) || senderFull.includes(sl) || sl.startsWith(senderFull + ".") || sl.startsWith(senderFull + "@");
          }) ?? false;
        const keywordMatch = cat.keywords?.some((kw) => haystack.includes(kw.toLowerCase())) ?? false;
        return senderMatch || keywordMatch;
      })
      .map((cat) => cat.name);

    return matched.length > 0 ? matched : ["Uncategorized"];
  } catch {
    return ["Uncategorized"];
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(60));
  console.log(`  Backfill: topics + meta fields`);
  console.log(`  Mode: ${DRY_RUN ? "DRY RUN — no changes will be written" : "LIVE — changes will be applied"}`);
  console.log("=".repeat(60));
  console.log();

  const ids = await redisClient.lrange("newsletter_ids", 0, -1);
  if (ids.length === 0) {
    console.log("No newsletters found in newsletter_ids.");
    process.exit(0);
  }

  console.log(`Found ${ids.length} newsletters.\n`);

  const stats = {
    classified:       0,
    uncategorized:    0,
    skippedNoContent: 0,
    receivedAtFixed:  0,
    subjectFixed:     0,
    senderFixed:      0,
    errors:           0,
  };

  const topicCounts: Record<string, number> = {};

  for (const id of ids) {
    const contentKey = `newsletter:${id}`;
    const metaKey    = `newsletter:meta:${id}`;

    try {
      const [rawContent, existingMeta] = await Promise.all([
        redisClient.get(contentKey),
        redisClient.hgetall(metaKey),
      ]);

      if (!rawContent) {
        console.log(`SKIP  ${id}  (no content key)`);
        stats.skippedNoContent++;
        continue;
      }

      const content: Record<string, any> =
        typeof rawContent === "string" ? JSON.parse(rawContent) : rawContent;

      // ── Pull the fields we need ──────────────────────────────────────────
      const subject: string =
        content.subject ?? existingMeta?.subject ?? "";
      const sender: string =
        content.sender ?? content.from ?? existingMeta?.sender ?? "";
      const textContent: string =
        content.textContent ??
        (content.cleanContent ?? content.content ?? "").replace(/<[^>]*>/g, " ");
      const receivedAt: string =
        content.receivedAt   ??
        content.date         ??
        content.publishDate  ??
        existingMeta?.receivedAt ??
        existingMeta?.date   ??
        new Date(0).toISOString(); // epoch sentinel — easier to spot in data

      // ── Classify ─────────────────────────────────────────────────────────
      const topics = classifyTopics(sender, subject, textContent.substring(0, 500));

      if (topics[0] === "Uncategorized") {
        stats.uncategorized++;
      } else {
        stats.classified++;
      }
      topics.forEach((t) => { topicCounts[t] = (topicCounts[t] ?? 0) + 1; });

      // ── Build the meta patch ─────────────────────────────────────────────
      const patch: Record<string, string> = {
        topics: JSON.stringify(topics),
      };

      const flags: string[] = [];

      if (!existingMeta?.receivedAt) {
        patch.receivedAt = receivedAt;
        flags.push("receivedAt");
        stats.receivedAtFixed++;
      }
      if (!existingMeta?.subject && subject) {
        patch.subject = subject;
        flags.push("subject");
        stats.subjectFixed++;
      }
      if (!existingMeta?.sender && sender) {
        patch.sender = sender;
        flags.push("sender");
        stats.senderFixed++;
      }

      // ── Report ───────────────────────────────────────────────────────────
      const fixedStr = flags.length ? `  [+${flags.join(", ")}]` : "";
      const senderStr = sender ? `  (${sender})` : "";
      console.log(`${DRY_RUN ? "WOULD" : "OK   "}  ${id}  → ${topics.join(", ")}${fixedStr}${senderStr}`);

      // ── Apply ─────────────────────────────────────────────────────────────
      if (!DRY_RUN) {
        await redisClient.hset(metaKey, {
          ...(existingMeta ?? {}),
          ...patch,
        });
      }
    } catch (err) {
      console.error(`ERROR ${id}: ${err}`);
      stats.errors++;
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log();
  console.log("=".repeat(60));
  console.log("  Summary");
  console.log("=".repeat(60));
  console.log(`  Total newsletters:  ${ids.length}`);
  console.log(`  Classified:         ${stats.classified}`);
  console.log(`  Uncategorized:      ${stats.uncategorized}`);
  console.log(`  Skipped (no data):  ${stats.skippedNoContent}`);
  console.log(`  Errors:             ${stats.errors}`);
  console.log();
  console.log("  Fields backfilled:");
  console.log(`    receivedAt:       ${stats.receivedAtFixed}`);
  console.log(`    subject:          ${stats.subjectFixed}`);
  console.log(`    sender:           ${stats.senderFixed}`);
  console.log();
  console.log("  Topic breakdown:");
  Object.entries(topicCounts)
    .sort(([, a], [, b]) => b - a)
    .forEach(([topic, count]) => console.log(`    ${topic.padEnd(24)} ${count}`));

  if (DRY_RUN) {
    console.log();
    console.log("  DRY RUN — no data was written. Run with --run to apply.");
  }

  console.log("=".repeat(60));
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
