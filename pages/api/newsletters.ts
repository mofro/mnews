import { NextApiRequest, NextApiResponse } from "next";
import { NewsletterStorage } from "../../lib/storage";
import logger from "@/utils/logger";
import type { DashboardStats, Newsletter } from "../../lib/types";
import { isDateToday } from "../../utils/dateService";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get all newsletters first
    const allNewsletters = await NewsletterStorage.getAllNewsletters();

    // Filter newsletters based on query parameters
    let filteredNewsletters = allNewsletters;

    // Apply sender filter if provided
    if (req.query.sender) {
      const sender = req.query.sender as string;
      filteredNewsletters = filteredNewsletters.filter(
        (n) => n.sender === sender,
      );
    }

    // Apply search term filter if provided
    if (req.query.search) {
      const searchTerm = (req.query.search as string).toLowerCase();
      filteredNewsletters = filteredNewsletters.filter(
        (n) =>
          n.subject.toLowerCase().includes(searchTerm) ||
          n.sender.toLowerCase().includes(searchTerm) ||
          (n.cleanContent && n.cleanContent.toLowerCase().includes(searchTerm)),
      );
    }

    // Filter archived newsletters if needed
    const includeArchived = req.query.includeArchived === "true";
    if (!includeArchived) {
      filteredNewsletters = filteredNewsletters.filter(
        (n) => !n.metadata?.archived,
      );
    }

    const totalItems = filteredNewsletters.length;

    // Parse and validate pagination parameters
    let page = parseInt(req.query.page as string) || 1;
    let pageSize = Math.min(
      parseInt(req.query.pageSize as string) || DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE,
    );

    // Ensure page and pageSize are positive numbers
    page = Math.max(1, isNaN(page) ? 1 : page);
    pageSize = Math.max(1, isNaN(pageSize) ? DEFAULT_PAGE_SIZE : pageSize);

    // Calculate total pages and adjust page if out of bounds
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    page = Math.min(page, totalPages);

    const skip = (page - 1) * pageSize;

    // Calculate stats from the filtered dataset
    const todayNewsletters = filteredNewsletters.filter((n) =>
      isDateToday(n.date),
    );
    const uniqueSenders = new Set(filteredNewsletters.map((n) => n.sender))
      .size;

    // Paginate the results
    const paginatedNewsletters = filteredNewsletters.slice(
      skip,
      skip + pageSize,
    );

    // Calculate stats for the response
    const stats: DashboardStats = {
      totalNewsletters: filteredNewsletters.length,
      todayCount: todayNewsletters.length,
      uniqueSenders,
      total: filteredNewsletters.length,
      withCleanContent: filteredNewsletters.filter((n) => n.cleanContent)
        .length,
      needsProcessing: filteredNewsletters.filter(
        (n) =>
          !n.cleanContent ||
          n.metadata?.processingVersion === "legacy-migrated",
      ).length,
      avgWordCount: Math.round(
        filteredNewsletters
          .filter((n) => n.metadata?.wordCount)
          .reduce((sum, n) => sum + (n.metadata?.wordCount || 0), 0) /
          (filteredNewsletters.filter((n) => n.metadata?.wordCount).length ||
            1),
      ),
    };

    // Optimize the response by removing unnecessary fields
    const optimizedNewsletters = paginatedNewsletters.map(
      ({ id, subject, sender, date, isNew, metadata = {}, cleanContent }) => ({
        id,
        subject,
        sender,
        date,
        isNew,
        metadata: {
          isRead: metadata.isRead ?? false,
          archived: metadata.archived ?? false,
          readAt: metadata.readAt,
          archivedAt: metadata.archivedAt,
        },
        cleanContent: cleanContent?.substring(0, 200), // Truncate content for the list view
      }),
    );

    res.status(200).json({
      newsletters: optimizedNewsletters,
      stats,
      pagination: {
        page,
        pageSize,
        totalPages: Math.ceil(filteredNewsletters.length / pageSize),
        totalItems: filteredNewsletters.length,
      },
    });
  } catch (error) {
    logger.error("Error fetching newsletters:", error);
    res.status(500).json({
      error: "Failed to fetch newsletters",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
