import { NextApiRequest, NextApiResponse } from "next";
import { redisClient } from "@/lib/redisClient";
import { getSummary } from "@/lib/summarizer";
import { parseDate } from "@/utils/dateService";
import logger from "@/utils/logger";
import fs from "fs";
import path from "path";

const NEWSLETTER_IDS_KEY = "newsletter_ids";
const META_PREFIX = "newsletter:meta:";

interface TopicCategory {
  name: string;
  color: string;
  senders?: string[];
  keywords?: string[];
}

interface DigestNewsletter {
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

interface CategoryGroup {
  name: string;
  color: string;
  newsletters: DigestNewsletter[];
}

interface MorningReportResponse {
  date: string;
  categories: CategoryGroup[];
  uncategorized: DigestNewsletter[];
}

function loadTopicCategories(): TopicCategory[] {
  try {
    const topicsPath = path.join(process.cwd(), "data", "topics.json");
    const { categories } = JSON.parse(fs.readFileSync(topicsPath, "utf-8"));
    return categories as TopicCategory[];
  } catch {
    return [];
  }
}

function isSameDay(dateStr: string, targetDate: Date): boolean {
  const d = parseDate(dateStr, { fallbackBehavior: "null", logWarnings: false });
  if (!d) return false;
  return (
    d.getFullYear() === targetDate.getFullYear() &&
    d.getMonth() === targetDate.getMonth() &&
    d.getDate() === targetDate.getDate()
  );
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MorningReportResponse | { error: string }>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Determine target date (defaults to today)
    const dateParam = req.query.date as string | undefined;
    const targetDate = dateParam ? new Date(dateParam) : new Date();
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: "Invalid date parameter" });
    }
    const dateStr = targetDate.toISOString().split("T")[0];

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
        r !== null && isSameDay(r.meta.receivedAt ?? r.meta.date ?? "", targetDate)
    );

    // Fetch summaries and build digest items
    const categories = loadTopicCategories();
    const categoryNames = categories.map((c) => c.name);

    const digestItems: DigestNewsletter[] = await Promise.all(
      todayMeta.map(async ({ id, meta }) => {
        const summary = await getSummary(id).catch(() => null);
        const topics: string[] = (() => {
          try {
            return JSON.parse(meta.topics ?? "[]");
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

    // Build response in topics.json order
    const categoryGroups: CategoryGroup[] = categories
      .filter((c) => grouped.has(c.name))
      .map((c) => ({
        name: c.name,
        color: c.color,
        newsletters: grouped.get(c.name)!,
      }));

    const response: MorningReportResponse = {
      date: dateStr,
      categories: categoryGroups,
      uncategorized,
    };

    return res.status(200).json(response);
  } catch (error) {
    logger.error("Morning report error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
