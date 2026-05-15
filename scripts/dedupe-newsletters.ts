#!/usr/bin/env node
/**
 * Dedupe newsletters in Redis using the same content fingerprint the webhook
 * now uses to reject duplicate deliveries.
 *
 * Two kinds of duplicates exist:
 *   1. Content dupes: different IDs whose content fingerprint matches
 *      (forwarder retried + got fresh Date.now() IDs each time). Keep the
 *      oldest ID, hard-delete the rest.
 *   2. List dupes: the same ID appears more than once in the newsletter_ids
 *      list (LPUSH happened multiple times). The content key exists once but
 *      the UI shows the entry repeatedly. Normalise the list to a single entry.
 *
 * Deletion uses the same key sequence as pages/api/newsletters/[id]/delete.ts.
 *
 * Usage:
 *   npm run dedupe                # dry run — prints plan, deletes nothing
 *   npm run dedupe:run            # apply
 */

import { redisClient } from "../lib/redisClient.js";
import { webhookFingerprint } from "../lib/webhookFingerprint.js";

const DRY_RUN = !process.argv.includes("--run");

type ContentBlob = {
  from?: string;
  sender?: string;
  subject?: string;
  rawContent?: string;
  content?: string;
};

async function main() {
  console.log(
    `\n=== Newsletter dedupe (${DRY_RUN ? "DRY RUN" : "APPLYING"}) ===\n`,
  );

  const rawIds = await redisClient.lrange("newsletter_ids", 0, -1);
  const listIds = rawIds.map((x) => String(x));
  console.log(`newsletter_ids list size: ${listIds.length}`);

  // Count list-level duplicates per ID.
  const listCount = new Map<string, number>();
  for (const id of listIds) {
    listCount.set(id, (listCount.get(id) || 0) + 1);
  }
  const listDupeIds = [...listCount.entries()].filter(([, c]) => c > 1);
  console.log(`Unique IDs in list: ${listCount.size}`);
  console.log(`IDs appearing >1 times in list: ${listDupeIds.length}\n`);

  // Fingerprint each unique ID.
  const groups = new Map<string, string[]>();
  let unreadable = 0;
  let fingerprinted = 0;
  const uniqueIds = [...listCount.keys()];

  for (const id of uniqueIds) {
    try {
      const raw = await redisClient.get(`newsletter:${id}`);
      if (!raw) {
        unreadable++;
        continue;
      }
      const content: ContentBlob =
        typeof raw === "string" ? JSON.parse(raw) : (raw as ContentBlob);

      const fingerprint = webhookFingerprint(
        content.from || content.sender || "",
        content.subject || "",
        content.rawContent || content.content || "",
      );

      if (!groups.has(fingerprint)) groups.set(fingerprint, []);
      groups.get(fingerprint)!.push(id);
      fingerprinted++;
    } catch (err) {
      console.error(`ERROR reading ${id}:`, err);
      unreadable++;
    }
  }

  console.log(
    `Fingerprinted ${fingerprinted} / ${uniqueIds.length} unique IDs (${unreadable} unreadable)\n`,
  );

  const sortByOldest = (a: string, b: string): number => {
    const na = Number(a);
    const nb = Number(b);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return a.localeCompare(b);
  };

  const contentDupeGroups = [...groups.entries()]
    .filter(([, members]) => members.length > 1)
    .map(([fp, members]) => ({
      fingerprint: fp,
      sorted: [...members].sort(sortByOldest),
    }));

  const contentDeletions = contentDupeGroups.flatMap((g) => g.sorted.slice(1));
  const contentKeeps = new Set(contentDupeGroups.map((g) => g.sorted[0]));

  console.log("--- Content dupes (different IDs, same fingerprint) ---");
  console.log(`  groups: ${contentDupeGroups.length}`);
  console.log(`  sibling IDs to delete: ${contentDeletions.length}`);
  for (const g of contentDupeGroups) {
    console.log(
      `  [${g.fingerprint.slice(0, 8)}] keep=${g.sorted[0]}  drop=${g.sorted.slice(1).join(",")}`,
    );
  }

  // List-level duplicates we still need to normalize after content dedup:
  // - For keep IDs that appear >1x in list, reduce to 1
  // - For any other ID that appears >1x in list and is NOT being deleted, reduce to 1
  // (Deleted IDs get lrem count=0 below, which removes all copies anyway.)
  const deletionSet = new Set(contentDeletions);
  const listNormalizations: Array<{ id: string; extraCopies: number }> = [];
  for (const [id, count] of listDupeIds) {
    if (deletionSet.has(id)) continue;
    listNormalizations.push({ id, extraCopies: count - 1 });
  }

  console.log("\n--- List-only dupes (same ID listed multiple times) ---");
  console.log(`  IDs to normalize to 1 entry: ${listNormalizations.length}`);
  for (const { id, extraCopies } of listNormalizations.slice(0, 20)) {
    console.log(`  ${id}  extra copies in list: ${extraCopies}`);
  }
  if (listNormalizations.length > 20) {
    console.log(`  ... ${listNormalizations.length - 20} more`);
  }

  console.log(
    `\nSummary: delete ${contentDeletions.length} sibling newsletters + normalize ${listNormalizations.length} list entries\n`,
  );

  if (DRY_RUN) {
    console.log("=== Dry run — no changes applied ===\n");
    return;
  }

  let deleted = 0;
  let normalized = 0;
  let errors = 0;

  for (const id of contentDeletions) {
    try {
      await Promise.all([
        redisClient.lrem("newsletter_ids", 0, id),
        redisClient.client.del(`newsletter:${id}`),
        redisClient.client.del(`newsletter:meta:${id}`),
        redisClient.client.del(`newsletter:content:${id}`),
        redisClient.client.del(`newsletter:summary:${id}`),
      ]);
      deleted++;
    } catch (err) {
      console.error(`ERROR deleting ${id}:`, err);
      errors++;
    }
  }

  // Normalize list duplicates: remove (extraCopies) instances from the list.
  // LREM with positive count removes that many from head.
  for (const { id, extraCopies } of listNormalizations) {
    try {
      const removed = (await redisClient.client.lrem(
        "newsletter_ids",
        extraCopies,
        id,
      )) as number;
      if (removed !== extraCopies) {
        console.warn(
          `  WARN normalize ${id}: expected to remove ${extraCopies}, removed ${removed}`,
        );
      }
      normalized++;
    } catch (err) {
      console.error(`ERROR normalizing ${id}:`, err);
      errors++;
    }
  }
  // Sanity: keep IDs from content groups that we didn't include in
  // listNormalizations (because they appeared exactly once) need no action.
  void contentKeeps;

  console.log(
    `\n=== Done: deleted ${deleted}, normalized ${normalized}${errors ? `, ${errors} errors` : ""} ===\n`,
  );
}

main()
  .catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
