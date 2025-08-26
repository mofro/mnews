// pages/index.tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useTheme } from "@/context/ThemeContext";
import { truncateText } from "@/utils/string";
import { format, isToday } from "date-fns";
import Link from "next/link";
import { ArticleGridCard } from "@/components/newsletter/ArticleGridCard";
import { BentoGrid } from "@/components/layout/BentoGrid";
import { BentoItem } from "@/components/layout/BentoItem";
import { FullViewArticle } from "@/components/article/FullViewArticle";
import { Pagination } from "@/components/common/Pagination";
import newslettersData from "@/data/newsletters.json";
import { cn } from "@/lib/utils";
import logger from "@/utils/logger";

// Pagination constants
const DEFAULT_PAGE_SIZE = 20; // Match the API's default
const MAX_PAGE_SIZE = 100; // Match the API's maximum

// Extend the NewsletterData interface to include metadata fields at the top level
interface NewsletterData {
  id: string;
  sender: string;
  subject: string;
  date: string;
  content: string;
  cleanContent?: string;
  rawContent?: string;
  metadata?: {
    redisIndex?: string;
    isRead?: boolean;
    archived?: boolean;
    imageUrl?: string;
    tags?: string[];
  };
  // Add metadata fields at the top level for easier access
  redisIndex?: string;
  isRead?: boolean;
  archived?: boolean;
  imageUrl?: string;
  tags?: string[];
}

// StatCard component for displaying statistics
const StatCard = ({
  title,
  value,
  icon,
  className = "",
  titleFull,
}: {
  title: string;
  value: number | string;
  icon: string;
  className?: string;
  titleFull?: string;
}) => {
  // Determine text size based on value length for better mobile display
  const valueStr = String(value);
  const isLongValue = valueStr.length > 3;
  const valueSizeClass = isLongValue
    ? "text-base sm:text-lg"
    : "text-lg sm:text-xl";

  return (
    <div className={cn("p-2 sm:p-3 rounded-lg", className)}>
      <div className="flex items-center">
        <span
          className={`${isLongValue ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"} mr-2 sm:mr-3`}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] xs:text-xs text-gray-500 dark:text-gray-400 leading-tight">
            <span className="xs:hidden">{title}</span>
            {titleFull && (
              <span className="hidden xs:inline sm:inline">{titleFull}</span>
            )}
            {!titleFull && (
              <span className="hidden xs:inline sm:inline">{title}</span>
            )}
          </p>
          <p className={`${valueSizeClass} font-semibold leading-none`}>
            {value}
          </p>
        </div>
      </div>
    </div>
  );
};

// Interface for transformed article data
interface TransformedArticle {
  id: string;
  redisId: string;
  sender: string;
  subject: string;
  date: string;
  content: string;
  isNew: boolean;
  isRead: boolean;
  isArchived: boolean;
  tags: string[];
  imageUrl?: string;
}

// Transform the newsletter data to match the expected article format
const transformNewsletterToArticle = (
  newsletter: NewsletterData,
  index: number,
): TransformedArticle => {
  // Extract metadata fields if they exist at the top level or in the metadata object
  const metadata = newsletter.metadata || {};
  const isRead = newsletter.isRead || metadata.isRead || false;
  const isArchived = newsletter.archived || metadata.archived || false;
  const imageUrl = newsletter.imageUrl || metadata.imageUrl || "";
  const tags = newsletter.tags || metadata.tags || [];
  const redisId = newsletter.redisIndex || metadata.redisIndex || "";

  // Use clean content if available, otherwise fall back to raw content or empty string
  const content =
    newsletter.cleanContent ||
    newsletter.rawContent ||
    newsletter.content ||
    "";

  // Debug log the transformation
  logger.debug("Transforming newsletter to article:", {
    id: newsletter.id,
    sender: newsletter.sender,
    subject: newsletter.subject,
    hasContent: !!newsletter.content,
    hasRawContent: !!newsletter.rawContent,
    hasCleanContent: !!newsletter.cleanContent,
    metadata: newsletter.metadata,
  });

  const result = {
    id: newsletter.id || `temp-${index}`,
    redisId,
    sender: newsletter.sender || "Unknown Sender",
    subject: newsletter.subject || "No Subject",
    date: newsletter.date || new Date().toISOString(),
    content,
    isNew: !isRead,
    isRead,
    isArchived,
    tags,
    imageUrl,
  };

  logger.debug("Transformed article:", {
    ...result,
    contentPreview: truncateText(result.content, 50),
  });

  return result;
};

// Development test data
const TEST_ARTICLES = newslettersData.map(transformNewsletterToArticle);

interface DashboardStats {
  totalNewsletters: number;
  todayCount: number;
  uniqueSenders: number;
  total: number;
  withCleanContent: number;
  needsProcessing: number;
  avgWordCount: number;
}

export default function TestArticleGrid() {
  const { theme, toggleTheme } = useTheme();
  const isClient = typeof window !== "undefined";
  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [articles, setArticles] = useState<TransformedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSender, setSelectedSender] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [fullViewArticle, setFullViewArticle] =
    useState<TransformedArticle | null>(null);
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>(
    null,
  );
  const [showDebug, setShowDebug] = useState(false);
  const [showArticleDebug, setShowArticleDebug] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  // Debug logging function
  const debugLog = useCallback((...messages: any[]) => {
    if (process.env.NODE_ENV === "development") {
      logger.debug(...messages);
    }
  }, []);
  const [stats, setStats] = useState<DashboardStats>({
    totalNewsletters: 0,
    todayCount: 0,
    uniqueSenders: 0,
    total: 0,
    withCleanContent: 0,
    needsProcessing: 0,
    avgWordCount: 0,
  });

  // Calculate stats from articles
  const calculateStats = useCallback(
    (articles: TransformedArticle[]): DashboardStats => {
      const today = new Date().toDateString();
      const senders = new Set<string>();
      let totalWordCount = 0;
      let totalArticlesWithContent = 0;

      articles.forEach((article) => {
        senders.add(article.sender);
        if (article.content && article.content.trim().length > 0) {
          const words = article.content
            .split(/\s+/)
            .filter((word) => word.length > 0);
          totalWordCount += words.length;
          totalArticlesWithContent++;
        }
      });

      const todayCount = articles.filter((article) => {
        try {
          return new Date(article.date).toDateString() === today;
        } catch (e) {
          logger.warn("Invalid date encountered:", article.date);
          return false;
        }
      }).length;

      return {
        totalNewsletters: articles.length,
        todayCount,
        uniqueSenders: senders.size,
        total: articles.length,
        withCleanContent: articles.filter(
          (a) => a.content && a.content.trim().length > 0,
        ).length,
        needsProcessing: 0, // This would come from the API in production
        avgWordCount:
          totalArticlesWithContent > 0
            ? Math.round(totalWordCount / totalArticlesWithContent)
            : 0,
      };
    },
    [],
  );

  // Fetch newsletters from API with error handling and retry logic
  const fetchNewsletters = useCallback(
    async (currentPage: number, currentPageSize: number) => {
      if (!isClient) {
        debugLog("Skipping fetch on server side");
        return;
      }

      setLoading(true);
      debugLog(
        `Fetching newsletters - Page: ${currentPage}, PageSize: ${currentPageSize}`,
      );

      try {
        logger.debug(
          `Fetching newsletters - Page: ${currentPage}, PageSize: ${currentPageSize}`,
        );

        // Build the URL with query parameters
        const url = new URL("/api/newsletters", window.location.origin);
        url.searchParams.append("page", currentPage.toString());
        url.searchParams.append("pageSize", currentPageSize.toString());

        // Add filters if they exist
        if (searchTerm) {
          url.searchParams.append("search", searchTerm);
        }
        if (selectedSender) {
          url.searchParams.append("sender", selectedSender);
        }
        if (showArchived) {
          url.searchParams.append("includeArchived", "true");
        }

        debugLog("API request URL:", url.toString());

        // Make the API request
        const response = await fetch(url.toString());

        // Check if the response is ok (status in the range 200-299)
        if (!response.ok) {
          let errorText = "Unknown error";
          try {
            const errorData = await response.json();
            errorText = errorData.message || JSON.stringify(errorData);
          } catch (e) {
            errorText = (await response.text()) || "No error details available";
          }

          logger.error("API request failed:", {
            status: response.status,
            statusText: response.statusText,
            errorText: errorText,
          });
          throw new Error(
            `API request failed with status ${response.status}: ${errorText}`,
          );
        }

        const responseData = await response.json();
        debugLog("API response received", {
          hasNewsletters: Array.isArray(responseData.newsletters),
          newsletterCount: responseData.newsletters?.length || 0,
          firstNewsletterId: responseData.newsletters?.[0]?.id || "none",
          totalPages: responseData.pagination?.totalPages,
          totalItems: responseData.pagination?.totalItems,
        });

        // Check if we have newsletters in the response
        if (
          responseData.newsletters &&
          Array.isArray(responseData.newsletters)
        ) {
          // Transform the newsletters to match the expected article format
          const transformedNewsletters = responseData.newsletters.map(
            (newsletter: any) => {
              debugLog(`Transforming newsletter: ${newsletter.id || "new"}`);
              // Extract clean content or generate it from raw content
              let cleanContent = newsletter.cleanContent || "";
              if (!cleanContent && newsletter.rawContent) {
                // Simple HTML to text conversion if clean content is not available
                cleanContent = newsletter.rawContent
                  .replace(/<[^>]*>?/gm, "") // Remove HTML tags
                  .replace(/\s+/g, " ") // Collapse multiple spaces
                  .trim();
              }

              // Safe date parsing with fallback
              let articleDate = newsletter.date;
              if (articleDate) {
                try {
                  // Try to parse the date to validate it
                  new Date(articleDate).toISOString();
                } catch (e) {
                  logger.warn("Invalid date string, using current date", {
                    date: articleDate,
                    id: newsletter.id,
                  });
                  articleDate = new Date().toISOString();
                }
              } else {
                articleDate = new Date().toISOString();
              }

              return {
                id:
                  newsletter.id ||
                  `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                redisId: newsletter.id || "",
                sender: newsletter.sender || "Unknown Sender",
                subject: newsletter.subject || "No Subject",
                date: articleDate,
                content: cleanContent || "No content available",
                isNew: newsletter.isNew || false,
                isRead:
                  newsletter.isRead || newsletter.metadata?.isRead || false,
                isArchived:
                  newsletter.isArchived ||
                  newsletter.metadata?.archived ||
                  false,
                tags: newsletter.tags || [],
                imageUrl: newsletter.imageUrl || "",
                rawContent: newsletter.rawContent || "",
              };
            },
          );

          debugLog(`Transformed ${transformedNewsletters.length} newsletters`);
          setArticles(transformedNewsletters);

          // Update pagination info
          if (responseData.pagination) {
            debugLog("Updating pagination:", responseData.pagination);
            setTotalPages(responseData.pagination.totalPages || 1);
            setTotalItems(
              responseData.pagination.totalItems ||
                transformedNewsletters.length,
            );
          } else {
            debugLog("No pagination data, using defaults");
            setTotalPages(1);
            setTotalItems(transformedNewsletters.length);
          }

          // Update stats if available, otherwise calculate from current data
          if (responseData.stats) {
            debugLog("Updating stats from API");
            setStats({
              totalNewsletters: responseData.stats.totalNewsletters || 0,
              todayCount: responseData.stats.todayCount || 0,
              uniqueSenders: responseData.stats.uniqueSenders || 0,
              total: responseData.stats.total || 0,
              withCleanContent: responseData.stats.withCleanContent || 0,
              needsProcessing: responseData.stats.needsProcessing || 0,
              avgWordCount: responseData.stats.avgWordCount || 0,
            });
          } else {
            debugLog("No stats data, calculating from articles");
            // Calculate basic stats from current data
            const calculatedStats = calculateStats(transformedNewsletters);
            debugLog("Calculated stats");
            setStats(calculatedStats);
          }
        } else {
          debugLog("Unexpected API response format");
          // Fallback to test data if API response is unexpected
          setArticles(TEST_ARTICLES);
          setStats(calculateStats(TEST_ARTICLES));
        }
      } catch (error) {
        debugLog("Failed to load newsletters:", error);
        // Fallback to test data if API fails
        setArticles(TEST_ARTICLES);
        setStats(calculateStats(TEST_ARTICLES));
      } finally {
        setLoading(false);
      }
    },
    [searchTerm, selectedSender, showArchived, calculateStats, isClient],
  );

  // Handle initial load and URL parameter changes
  useEffect(() => {
    if (!isClient) return;

    const params = new URLSearchParams(window.location.search);
    const urlPage = params.get("page");
    const urlPageSize = params.get("pageSize");

    // Parse and validate URL parameters
    const newPage = urlPage ? Math.max(1, parseInt(urlPage, 10) || 1) : 1;
    const newPageSize = urlPageSize
      ? Math.max(
          1,
          Math.min(
            parseInt(urlPageSize, 10) || DEFAULT_PAGE_SIZE,
            MAX_PAGE_SIZE,
          ),
        )
      : DEFAULT_PAGE_SIZE;

    // Only update state if values have changed to prevent infinite loops
    setPage((prevPage) => (prevPage !== newPage ? newPage : prevPage));
    setPageSize((prevSize) =>
      prevSize !== newPageSize ? newPageSize : prevSize,
    );

    // Always fetch data when URL parameters change
    fetchNewsletters(newPage, newPageSize).catch(console.error);
  }, [isClient]); // Removed router.asPath dependency

  // Fetch data when page or pageSize changes
  useEffect(() => {
    if (!isClient) return;

    const fetchData = async () => {
      try {
        debugLog(`Fetching articles - page: ${page}, pageSize: ${pageSize}`);
        await fetchNewsletters(page, pageSize);
      } catch (error) {
        debugLog("Error fetching articles:", error);
        setArticles(TEST_ARTICLES);
        setStats(calculateStats(TEST_ARTICLES));
      }
    };

    fetchData();

    // Update URL without causing a page reload
    const params = new URLSearchParams(window.location.search);
    params.set("page", page.toString());
    params.set("pageSize", pageSize.toString());
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}?${params.toString()}`,
    );
  }, [isClient, page, pageSize, fetchNewsletters, calculateStats]);

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo(0, 0);
  };

  // Handle page size change
  const handlePageSizeChange = (newSize: number) => {
    // Ensure the page size is within bounds
    const validatedSize = Math.max(1, Math.min(newSize, MAX_PAGE_SIZE));

    // Calculate new total pages based on current total items
    const newTotalPages = Math.ceil(totalItems / validatedSize) || 1;
    const newPage = Math.min(page, newTotalPages);

    // Update state immediately for better UX
    setPageSize(validatedSize);
    setPage(1); // Always reset to first page when changing page size
    setTotalPages(newTotalPages);

    // Update URL to reflect the new page size and reset to page 1
    const params = new URLSearchParams(window.location.search);
    params.set("pageSize", validatedSize.toString());
    params.set("page", "1");
    window.history.pushState(
      {},
      "",
      `${window.location.pathname}?${params.toString()}`,
    );

    // Trigger API call with the new page size
    fetchNewsletters(1, validatedSize).catch(console.error);
  };

  // Toggle debug panel
  const toggleDebug = useCallback(() => {
    setShowDebug((prev) => !prev);
  }, []);

  // Toggle article debug info
  const toggleArticleDebug = useCallback(() => {
    setShowArticleDebug((prev) => !prev);
  }, []);

  // Clear debug logs
  const clearDebugLogs = useCallback(() => {
    setDebugLogs([]);
  }, []);

  // Toggle article read status
  const handleToggleRead = useCallback((id: string) => {
    setArticles((prev) =>
      prev.map((article) =>
        article.id === id ? { ...article, isRead: !article.isRead } : article,
      ),
    );
  }, []);

  // Handle article expansion
  const handleExpandArticle = useCallback(
    (article: TransformedArticle) => {
      // If clicking the same article, collapse it
      if (expandedArticleId === article.id) {
        setExpandedArticleId(null);
        setFullViewArticle(null);
      } else {
        // Expand the clicked article and collapse any others
        setExpandedArticleId(article.id);
        setFullViewArticle(article);
      }
    },
    [expandedArticleId],
  );

  // Close full view modal
  const handleCloseFullView = useCallback(() => {
    setExpandedArticleId(null);
    setFullViewArticle(null);
  }, []);

  // Toggle archive status
  const handleToggleArchive = useCallback(
    async (id: string) => {
      try {
        const updatedArticles = articles.map((article) =>
          article.id === id
            ? { ...article, isArchived: !article.isArchived }
            : article,
        );
        setArticles(updatedArticles);

        if (process.env.NODE_ENV !== "development") {
          const response = await fetch(`/api/newsletter/${id}/archive`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              isArchived: !articles.find((a) => a.id === id)?.isArchived,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
              errorData.message || `HTTP error! status: ${response.status}`,
            );
          }
        }
      } catch (error) {
        logger.error("Failed to update archive status:", error);
      }
    },
    [articles],
  );

  // Share article
  const handleShare = useCallback(
    async (id: string) => {
      try {
        const article = articles.find((a) => a.id === id);
        if (article && navigator.share) {
          await navigator.share({
            title: article.subject,
            text: article.content.substring(0, 100) + "...",
            url: `${window.location.origin}/newsletter/${id}`,
          });
        }
      } catch (error) {
        logger.error("Failed to share:", error);
      }
    },
    [articles],
  );

  // Get unique senders for filter dropdown
  const uniqueSenders = useMemo(
    () => Array.from(new Set(articles.map((a) => a.sender))).sort(),
    [articles],
  );

  // Filter articles based on search term, sender, and archive status
  const filteredArticles = useMemo(() => {
    logger.debug("Filtering articles:", {
      totalArticles: articles.length,
      searchTerm,
      selectedSender,
      showArchived,
      firstArticle: articles[0]
        ? {
            id: articles[0].id,
            subject: articles[0].subject,
            sender: articles[0].sender,
            isArchived: articles[0].isArchived,
            date: articles[0].date,
          }
        : "No articles",
    });

    const filtered = articles.filter((article) => {
      const matchesSearch =
        !searchTerm ||
        article.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.sender.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSender =
        !selectedSender || article.sender === selectedSender;
      const matchesArchiveFilter = showArchived ? true : !article.isArchived;

      return matchesSearch && matchesSender && matchesArchiveFilter;
    });

    logger.debug(`Filtered articles count: ${filtered.length}`);
    if (filtered.length > 0) {
      logger.debug("First filtered article:", {
        id: filtered[0].id,
        subject: filtered[0].subject,
        sender: filtered[0].sender,
        isArchived: filtered[0].isArchived,
        date: filtered[0].date,
      });
    }
    return filtered;
  }, [articles, searchTerm, selectedSender, showArchived]);

  // Calculate size for each article based on content length
  const getArticleSize = (content: string) => {
    const length = content?.length || 0;
    if (length > 2000) return 4; // 2x2
    if (length > 1000) return 2; // 2x1
    return 1; // 1x1
  };

  // Show loading state
  if (!isClient || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="rounded-md border bg-white dark:bg-gray-800 shadow-lg h-80 animate-pulse"
              >
                <div className="h-48 bg-gray-200 dark:bg-gray-700"></div>
                <div className="p-4">
                  <div className="h-6 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-4 w-5/6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Debug panel component
  const DebugPanel = () => (
    <div
      className={`fixed bottom-0 right-0 w-full max-w-md max-h-96 overflow-auto bg-gray-800 text-green-100 text-xs p-2 z-50 border-t-2 border-green-500`}
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-mono font-bold">Debug Console</h3>
        <div className="space-x-2">
          <button
            onClick={clearDebugLogs}
            className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600 text-xs"
          >
            Clear
          </button>
          <button
            onClick={toggleDebug}
            className="px-2 py-1 bg-red-600 rounded hover:bg-red-700 text-xs"
          >
            Close
          </button>
        </div>
      </div>
      <div className="font-mono space-y-1">
        {debugLogs.map((log, i) => (
          <div key={i} className="border-b border-gray-700 pb-1">
            {log.split("\n").map((line, j) => (
              <div
                key={`${i}-${j}`}
                className="whitespace-pre-wrap break-words"
              >
                {line}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div
      className={`min-h-screen ${theme === "dark" ? "dark bg-gray-900" : "bg-gray-100"}`}
    >
      {/* Debug toggle button */}
      <button
        onClick={toggleDebug}
        className="fixed bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-10 h-10 flex items-center justify-center z-40 shadow-lg"
        title="Toggle Debug Console"
      >
        <span className="text-xl">{showDebug ? "×" : "…"}</span>
      </button>

      {showDebug && <DebugPanel />}
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="sticky top-0 z-10 mb-8 pt-4 pb-2 -mx-4 px-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                🐠 Nemo
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Finding your news in the vast ocean of email
              </p>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                <span>{articles.length} total</span>
                <span>•</span>
                <span>
                  {articles.filter((a) => isToday(new Date(a.date))).length}{" "}
                  today
                </span>
                <span>•</span>
                <span>
                  {new Set(articles.map((a) => a.sender)).size} sources
                </span>
                <span>•</span>
                <span>Avg {stats.avgWordCount} words</span>
              </div>
            </div>
            <div className="mt-4 md:mt-0">
              <div className="flex flex-wrap gap-2">
                <div className="relative min-w-[180px]">
                  <select
                    value={selectedSender}
                    onChange={(e) => setSelectedSender(e.target.value)}
                    className="w-full px-4 py-2 pr-8 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none truncate"
                    title={selectedSender || "All Senders"}
                  >
                    <option value="">All Senders</option>
                    {uniqueSenders.map((sender) => (
                      <option
                        key={sender}
                        value={sender}
                        title={sender}
                        className="truncate"
                      >
                        {truncateText(sender, 20)}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                    <svg
                      className="fill-current h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>

                <button
                  onClick={() => setShowArchived(!showArchived)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    showArchived
                      ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:hover:bg-yellow-900/50"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  }`}
                >
                  {showArchived ? "Hide Archived" : "Show Archived"}
                </button>

                <button
                  onClick={toggleTheme}
                  className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
                </button>
              </div>
            </div>
          </div>

          {/* Search Bar - Hidden */}
          <div className="hidden">
            <div className="relative">
              <input
                type="text"
                placeholder="Search newsletters..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 pr-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </header>

        {/* Stats Bar - Hidden but kept in code */}
        <div className="hidden flex overflow-x-auto pb-3 -mx-1 mb-6 scrollbar-hide snap-x snap-mandatory">
          <div className="flex flex-nowrap min-w-full gap-1.5 sm:gap-3 px-1">
            <StatCard
              title="Total"
              value={stats.totalNewsletters}
              icon="📊"
              titleFull="Total Newsletters"
              className="flex-shrink-0 w-[calc(33.333%_-_0.5rem)] sm:w-1/4 min-w-0 bg-blue-100 dark:bg-blue-900/30 snap-start"
            />
            <StatCard
              title="Today"
              value={stats.todayCount}
              icon="📅"
              titleFull="Today"
              className="flex-shrink-0 w-[calc(33.333%_-_0.5rem)] sm:w-1/4 min-w-0 bg-green-100 dark:bg-green-900/30 snap-start"
            />
            <StatCard
              title="Senders"
              value={stats.uniqueSenders}
              icon="👤"
              titleFull="Unique Senders"
              className="flex-shrink-0 w-[calc(33.333%_-_0.5rem)] sm:w-1/4 min-w-0 bg-purple-100 dark:bg-purple-900/30 snap-start"
            />
            <StatCard
              title="Avg"
              value={stats.avgWordCount}
              icon="📝"
              titleFull="Avg Words"
              className="flex-shrink-0 w-[calc(33.333%_-_0.5rem)] sm:w-1/4 min-w-0 bg-yellow-100 dark:bg-yellow-900/30 snap-start"
            />
          </div>
        </div>

        {/* Articles Grid */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="w-full">
            {filteredArticles.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <div className="text-gray-500 dark:text-gray-400">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                    />
                  </svg>
                  <h3 className="mt-2 text-lg font-medium">
                    {showArchived
                      ? "You don't have any archived newsletters yet"
                      : "No newsletters found. Check back later!"}
                  </h3>
                  {showArchived && (
                    <button
                      onClick={() => setShowArchived(false)}
                      className="mt-2 text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Show unarchived newsletters
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="w-full max-w-7xl mx-auto px-4">
                  <div className="mb-4 flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Articles</h3>
                    <button
                      onClick={toggleArticleDebug}
                      className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                      {showArticleDebug ? "Hide" : "Show"} Debug Info
                    </button>
                  </div>
                  {showArticleDebug && (
                    <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <h3 className="font-bold text-blue-800 dark:text-blue-200">
                        Debug - Articles to Render:
                      </h3>
                      <div className="text-sm text-blue-700 dark:text-blue-300">
                        <p>Total articles: {filteredArticles.length}</p>
                        {filteredArticles.length > 0 && (
                          <pre className="mt-2 p-2 bg-black/5 dark:bg-white/5 rounded overflow-x-auto text-xs">
                            {JSON.stringify(
                              filteredArticles.map((a) => ({
                                id: a.id,
                                subject: a.subject,
                                sender: a.sender,
                                date: a.date,
                                contentLength: a.content?.length,
                                hasImage: !!a.imageUrl,
                                isRead: a.isRead,
                                isArchived: a.isArchived,
                              })),
                              null,
                              2,
                            )}
                          </pre>
                        )}
                      </div>
                    </div>
                  )}
                  <BentoGrid columns={[1, 2, 2, 3]} gap={1.5}>
                    {filteredArticles.map((article) => {
                      logger.debug("Rendering article in grid:", {
                        id: article.id,
                        subject: article.subject,
                        contentLength: article.content?.length,
                        hasImage: !!article.imageUrl,
                      });
                      return (
                        <BentoItem key={article.id}>
                          <div
                            onClick={() => handleExpandArticle(article)}
                            className="h-full"
                          >
                            <ArticleGridCard
                              id={article.id}
                              sender={article.sender}
                              subject={article.subject}
                              date={article.date}
                              content={article.content}
                              imageUrl={article.imageUrl}
                              isNew={article.isNew}
                              isRead={article.isRead}
                              isArchived={article.isArchived}
                              tags={article.tags}
                              onToggleRead={() => handleToggleRead(article.id)}
                              onToggleArchive={() =>
                                handleToggleArchive(article.id)
                              }
                              onShare={() => handleShare(article.id)}
                              className="h-full"
                            />
                          </div>
                        </BentoItem>
                      );
                    })}
                  </BentoGrid>
                </div>

                {/* Pagination */}
                <div className="mt-8 px-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Showing{" "}
                      <span className="font-medium">
                        {(page - 1) * pageSize + 1}
                      </span>
                      {" to "}
                      <span className="font-medium">
                        {Math.min(page * pageSize, totalItems)}
                      </span>
                      {" of "}
                      <span className="font-medium">{totalItems}</span>
                      {" results"}
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={pageSize}
                        onChange={(e) =>
                          handlePageSizeChange(Number(e.target.value))
                        }
                        className="text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value={10}>10 per page</option>
                        <option value={20}>20 per page</option>
                        <option value={50}>50 per page</option>
                      </select>

                      <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        pageSize={pageSize}
                        onPageChange={handlePageChange}
                        onPageSizeChange={handlePageSizeChange}
                        className="ml-4"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Full View Article Modal */}
        {fullViewArticle && (
          <FullViewArticle
            article={{
              id: fullViewArticle.id,
              title: fullViewArticle.subject,
              content: fullViewArticle.content || "No content available",
              publishDate: fullViewArticle.date,
            }}
            onClose={handleCloseFullView}
            className={theme === "dark" ? "dark" : ""}
          />
        )}
      </div>
    </div>
  );
}
