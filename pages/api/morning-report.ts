import { NextApiRequest, NextApiResponse } from "next";
import { redisClient } from "@/lib/redisClient";
import { getSummary } from "@/lib/summarizer";
import { parseDate } from "@/utils/dateService";
import logger from "@/utils/logger";

const NEWSLETTER_IDS_KEY = "newsletter_ids";
const META_PREFIX = "newsletter:meta:";

interface TopicCategory {
  name: string;
  color: string;
  senders?: string[];
  keywords?: string[];
}

export interface DigestNewsletter {
  id: string;
  subject: string;
  sender: string;
  date: string;
  summary: string | null;
  preview: string;
  isRead: boolean;
  isArchived: boolean;
  topics: string[];
}

export interface CategoryGroup {
  name: string;
  color: string;
  newsletters: DigestNewsletter[];
}

export interface MorningReportData {
  date: string;
  categories: CategoryGroup[];
  uncategorized: DigestNewsletter[];
}

function loadTopicCategories(): TopicCategory[] {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const data = require("../../data/topics.json") as { categories: TopicCategory[] };
    return data.categories;
  } catch (err) {
    logger.error("[morning-report] Failed to load topics.json:", err);
    return [];
  }
}

function isSameDay(dateStr: string, targetDateStr: string, timezone: string): boolean {
  const d = parseDate(dateStr, { fallbackBehavior: "null", logWarnings: false });
  if (!d) return false;
  const localStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  return localStr === targetDateStr;
}

/**
 * Core data-fetching logic — callable directly from getServerSideProps
 * without making an HTTP round-trip.
 */
export async function getMorningReportData(dateParam?: string, injectedCategories?: TopicCategory[], timezone = "UTC"): Promise<MorningReportData> {
  const tz = timezone || "UTC";
  const dateStr = dateParam ?? new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());

  // Load all IDs and filter to target date (O(n) scan, acceptable for daily digest)
  const allIds = await redisClient.lrange(NEWSLETTER_IDS_KEY, 0, -1);

  // Fetch metadata for all IDs in parallel, then filter by date
  const metaResults = await Promise.all(
    allIds.map(async (id) => {
      try {
        const meta = await redisClient.client.hgetall(`${META_PREFIX}${id}`);
        return meta ? { id, meta } : null;
      } catch {
        return null;
      }
    })
  );

  const todayMeta = metaResults.filter(
    (r): r is { id: string; meta: Record<string, string> } =>
      r !== null && isSameDay(r.meta.receivedAt ?? r.meta.date ?? "", dateStr, tz)
  );

  const categories = injectedCategories ?? loadTopicCategories();
  const categoryNames = categories.map((c) => c.name);

  const digestItems: DigestNewsletter[] = await Promise.all(
    todayMeta.map(async ({ id, meta }) => {
      const summary = await getSummary(id).catch(() => null);
      const topics: string[] = (() => {
        try {
          const raw = meta.topics ?? "[]";
          if (Array.isArray(raw)) return raw;
          return JSON.parse(raw as string);
        } catch {
          return ["Uncategorized"];
        }
      })();

      return {
        id,
        subject: meta.subject ?? "(no subject)",
        sender: meta.sender ?? "Unknown",
        date: meta.receivedAt ?? meta.date ?? new Date().toISOString(),
        summary,
        preview: meta.preview ?? meta.previewText ?? "",
        isRead: meta.isRead === "1",
        isArchived: meta.isArchived === "1",
        topics,
      };
    })
  );

  // Group by topic — each newsletter can appear in multiple categories
  const grouped: Map<string, DigestNewsletter[]> = new Map();
  const uncategorized: DigestNewsletter[] = [];

  for (const item of digestItems) {
    const itemTopics = item.topics.filter((t) => categoryNames.includes(t));
    if (itemTopics.length === 0) {
      uncategorized.push(item);
    } else {
      for (const topic of itemTopics) {
        if (!grouped.has(topic)) grouped.set(topic, []);
        grouped.get(topic)!.push(item);
      }
    }
  }

  const categoryGroups: CategoryGroup[] = categories
    .filter((c) => grouped.has(c.name))
    .map((c) => ({
      name: c.name,
      color: c.color,
      newsletters: grouped.get(c.name)!,
    }));

  return { date: dateStr, categories: categoryGroups, uncategorized };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MorningReportData | { error: string }>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const dateParam = req.query.date as string | undefined;
    const tz = req.query.tz as string | undefined;
    if (dateParam && isNaN(new Date(dateParam).getTime())) {
      return res.status(400).json({ error: "Invalid date parameter" });
    }
    const data = await getMorningReportData(dateParam, undefined, tz);
    return res.status(200).json(data);
  } catch (error) {
    logger.error("Morning report error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
