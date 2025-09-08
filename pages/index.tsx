// pages/index.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useTheme } from "@/context/ThemeContext";
import { useDebug } from "@/context/DebugContext";
import { useDebugState } from "@/hooks/useDebugState";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useRouter } from "next/router";
import { truncateText } from "@/utils/string";
import { format, isToday } from "date-fns";
import Link from "next/link";
import { ArticleGridCard } from "@/components/newsletter/ArticleGridCard";
import { BentoGrid } from "@/components/layout/BentoGrid";
import { BentoItem } from "@/components/layout/BentoItem";
import FullViewArticle from "@/components/article/FullViewArticle";
import { Pagination } from "@/components/common/Pagination";
import { DebugToggle } from "@/components/debug/DebugToggle";
import { AppDebugPanel } from "@/components/debug/AppDebugPanel";
import { cn } from "@/lib/cn";
import logger from "@/utils/logger";

// Import newsletters data with type assertion
const newslettersData = [] as any[]; // Replace with actual data loading logic

// Pagination constants
const DEFAULT_PAGE_SIZE = 20; // Match the API's default
const MAX_PAGE_SIZE = 100; // Match the API's maximum

interface Article {
  id: string;
  title: string;
  content?: string | null;
  publishDate: string;
  sender?: string;
  tags?: string[];
  imageUrl?: string;
  isRead: boolean;
  isArchived: boolean;
  rawContent?: string | null;
  cleanContent?: string | null;
  url?: string;
  isNew?: boolean;
}

type TransformedArticle = Omit<Article, "title" | "publishDate"> & {
  subject: string;
  date: string;
  contentPreview?: string;
};

interface NewsletterData {
  id: string;
  sender: string;
  subject: string;
  date: string;
  content: string;
  cleanContent?: string;
  rawContent?: string;
  url?: string;
  isRead?: boolean;
  isArchived?: boolean;
  tags?: string[];
  imageUrl?: string;
}

const Home: React.FC = () => {
  const { theme } = useTheme();
  const { debugState, setDebugState } = useDebug();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  // Article list state
  const [articles, setArticles] = useState<TransformedArticle[]>([]);
  const [loading, setLoading] = useState(true);

  // State for filtering and pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSender, setSelectedSender] = useState<string>("");
  const [showArchived, setShowArchived] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // State for full view article modal
  const [fullViewArticle, setFullViewArticle] =
    useState<TransformedArticle | null>(null);

  // Stats state
  const [stats, setStats] = useState({
    totalNewsletters: 0,
    todayCount: 0,
    uniqueSenders: 0,
    total: 0,
    withCleanContent: 0,
    needsProcessing: 0,
    avgWordCount: 0,
  });

  // Set client-side flag on mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load articles
  useEffect(() => {
    const loadArticles = async () => {
      try {
        setLoading(true);

        // First try to fetch from API
        try {
          const response = await fetch(
            `/api/newsletters?page=${page}&pageSize=${pageSize}`,
          );
          if (response.ok) {
            const data = await response.json();

            // Transform the newsletters data to match the TransformedArticle type
            const transformedArticles: TransformedArticle[] =
              data.newsletters.map((newsletter: any) => ({
                id: newsletter.id,
                sender: newsletter.sender || "Unknown Sender",
                subject: newsletter.subject || "No Subject",
                date: newsletter.date || new Date().toISOString(),
                content: newsletter.content || "",
                cleanContent: newsletter.cleanContent,
                rawContent: newsletter.rawContent,
                url: newsletter.url,
                isRead: newsletter.isRead || false,
                isArchived: newsletter.isArchived || false,
                tags: newsletter.tags || [],
                imageUrl: newsletter.imageUrl,
                contentPreview: newsletter.content
                  ? truncateText(
                      newsletter.content.replace(/<[^>]*>/g, ""),
                      200,
                    )
                  : "No content available",
              }));

            setArticles(transformedArticles);
            setTotalPages(data.pagination?.totalPages || 1);
            setTotalItems(data.pagination?.totalItems || 0);

            // Update stats if available
            if (data.stats) {
              setStats((prev) => ({
                ...prev,
                totalNewsletters: data.stats.totalNewsletters || 0,
                todayCount: data.stats.todayCount || 0,
                uniqueSenders: data.stats.uniqueSenders || 0,
                total: data.stats.total || 0,
                withCleanContent: data.stats.withCleanContent || 0,
                needsProcessing:
                  data.stats.total - (data.stats.withCleanContent || 0),
                avgWordCount: data.stats.avgWordCount || 0,
              }));
            }
            return; // Exit if API call was successful
          }
        } catch (apiError) {
          logger.error("Error fetching from API:", apiError);
        }

        // Fallback to local test data if API fails
        logger.warn("Falling back to test data");
        const testData = (await import("@/data/newsletters.json")).default;
        const transformedArticles: TransformedArticle[] = testData.map(
          (newsletter: any) => ({
            id: newsletter.id,
            sender: newsletter.sender || "Test Sender",
            subject: newsletter.subject || "Test Subject",
            date: newsletter.date || new Date().toISOString(),
            content: newsletter.content || "",
            contentPreview: newsletter.content
              ? truncateText(newsletter.content.replace(/<[^>]*>/g, ""), 200)
              : "No content available",
            isRead: false,
            isArchived: false,
            tags: newsletter.tags || [],
          }),
        );

        setArticles(transformedArticles);
        setTotalPages(1);
        setTotalItems(transformedArticles.length);
      } catch (error) {
        logger.error("Error loading articles:", error);
      } finally {
        setLoading(false);
      }
    };

    loadArticles();
  }, [page, pageSize]);

  // Handler for toggling read status
  const handleToggleRead = useCallback(async (id: string) => {
    try {
      // Optimistic UI update
      setArticles((prevArticles) =>
        prevArticles.map((article) =>
          article.id === id ? { ...article, isRead: !article.isRead } : article,
        ),
      );

      // Update full view article if it's the one being toggled
      setFullViewArticle((prev) =>
        prev?.id === id ? { ...prev, isRead: !prev.isRead } : prev,
      );

      // TODO: Add API call to update read status
      // await updateArticleReadStatus(id, !isRead);
    } catch (error) {
      logger.error("Error toggling read status:", error);
      // Revert on error
      setArticles((prevArticles) =>
        prevArticles.map((article) =>
          article.id === id ? { ...article, isRead: !article.isRead } : article,
        ),
      );
    }
  }, []);

  // Handler for toggling archive status
  const handleToggleArchive = useCallback(async (id: string) => {
    try {
      // Optimistic UI update
      setArticles((prevArticles) =>
        prevArticles.map((article) =>
          article.id === id
            ? { ...article, isArchived: !article.isArchived }
            : article,
        ),
      );

      // Update full view article if it's the one being toggled
      setFullViewArticle((prev) =>
        prev?.id === id ? { ...prev, isArchived: !prev.isArchived } : prev,
      );

      // TODO: Add API call to update archive status
      // await updateArticleArchiveStatus(id, !isArchived);
    } catch (error) {
      logger.error("Error toggling archive status:", error);
      // Revert on error
      setArticles((prevArticles) =>
        prevArticles.map((article) =>
          article.id === id
            ? { ...article, isArchived: !article.isArchived }
            : article,
        ),
      );
    }
  }, []);

  // Handler for sharing articles
  const handleShare = useCallback(
    async (id: string) => {
      try {
        const article = articles.find((a) => a.id === id);
        if (!article) return;

        if (navigator.share) {
          await navigator.share({
            title: article.subject,
            text: article.content ? truncateText(article.content, 200) : "",
            url: article.url || window.location.href,
          });
        } else {
          // Fallback for browsers that don't support Web Share API
          await navigator.clipboard.writeText(
            article.url || window.location.href,
          );
          alert("Link copied to clipboard!");
        }
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          logger.error("Error sharing article:", error);
        }
      }
    },
    [articles],
  );

  // Handler for expanding article to full view
  const handleExpandArticle = useCallback((article: TransformedArticle) => {
    setFullViewArticle(article);
  }, []);

  // Handler for page change
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    // Scroll to top when changing pages
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Handler for page size change
  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(1); // Reset to first page when changing page size
  }, []);

  // Get unique senders for filter dropdown
  const uniqueSenders = useMemo(
    () =>
      Array.from(
        new Set(articles.map((a) => a.sender).filter(Boolean)),
      ).sort() as string[],
    [articles],
  );

  // Filter articles based on search term, sender, and archive status
  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      const matchesSearch =
        !searchTerm ||
        article.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.content?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSender =
        !selectedSender || article.sender === selectedSender;
      const matchesArchive = showArchived || !article.isArchived;

      return matchesSearch && matchesSender && matchesArchive;
    });
  }, [articles, searchTerm, selectedSender, showArchived]);

  // Show loading state
  if (!isClient || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            Loading articles...
          </p>
        </div>
      </div>
    );
  }

  // Show empty state if no articles
  if (filteredArticles.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
              No articles found
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {articles.length === 0
                ? "You don't have any articles yet."
                : "No articles match your current filters."}
            </p>
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedSender("");
                setShowArchived(false);
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Clear filters
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Debug Panel - Only show in development */}
        {process.env.NODE_ENV === "development" && (
          <AppDebugPanel
            stats={stats}
            pagination={{
              page,
              pageSize,
              totalPages,
              totalItems,
            }}
            articles={articles}
          />
        )}

        {/* Header */}
        <header className="header mb-6 px-4">
          <div className="header-content">
            <div className="header-titles">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                🐠 Nemo
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Finding your newsletters in the vast ocean of email
              </p>
              {stats && (
                <div className="stats flex gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                  <span>{stats.totalNewsletters} total</span>
                  <span>{stats.todayCount} today</span>
                  <span>{stats.uniqueSenders} sources</span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Search and Filter Controls */}
        <div className="mb-6 flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div className="relative flex-1 max-w-md">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Search newsletters..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={selectedSender}
              onChange={(e) => setSelectedSender(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            >
              <option value="">All Senders</option>
              {uniqueSenders.map((sender) => (
                <option key={sender} value={sender}>
                  {sender}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`inline-flex items-center px-3 sm:px-4 py-2 rounded-md text-sm font-medium gap-2 ${
                showArchived
                  ? "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white"
                  : "bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
              } 
                hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500`}
              aria-label={
                showArchived ? "Hide archived items" : "Show archived items"
              }
            >
              <span>{showArchived ? "📚" : "🗄️"}</span>
              <span className="hidden sm:inline">
                {showArchived ? "Hide Archived" : "Show Archived"}
              </span>
            </button>
            <ThemeToggle />
          </div>
        </div>

        {/* Articles Grid */}
        <BentoGrid columns={[1, 2, 2, 3]} gap={1.5}>
          {filteredArticles.map((article, index) => (
            <BentoItem key={`${article.id}-${index}`}>
              <ArticleGridCard
                id={article.id}
                sender={article.sender || "Unknown"}
                subject={article.subject}
                date={article.date}
                content={article.content || ""}
                cleanContent={article.cleanContent || ""}
                rawContent={article.rawContent || ""}
                imageUrl={article.imageUrl}
                isNew={article.isNew || false}
                isRead={article.isRead}
                isArchived={article.isArchived}
                tags={article.tags}
                onToggleRead={() => handleToggleRead(article.id)}
                onToggleArchive={() => handleToggleArchive(article.id)}
                onShare={() => handleShare(article.id)}
                onExpand={() => handleExpandArticle(article)}
                className="h-full transition-all hover:shadow-md hover:-translate-y-0.5"
              />
            </BentoItem>
          ))}
        </BentoGrid>

        {/* Pagination */}
        <div className="mt-6 px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing{" "}
              <span className="font-medium">{(page - 1) * pageSize + 1}</span>
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
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
              </select>

              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
              />
            </div>
          </div>
        </div>

        {/* Full View Article Modal */}
        {fullViewArticle && (
          <FullViewArticle
            article={{
              id: fullViewArticle.id,
              title: fullViewArticle.subject,
              content: fullViewArticle.content || "",
              publishDate: fullViewArticle.date,
              sender: fullViewArticle.sender || "Unknown",
              tags: fullViewArticle.tags,
              imageUrl: fullViewArticle.imageUrl,
              isRead: fullViewArticle.isRead,
              isArchived: fullViewArticle.isArchived,
              rawContent: fullViewArticle.rawContent || "",
              cleanContent: fullViewArticle.cleanContent || "",
              url: fullViewArticle.url,
            }}
            onClose={() => setFullViewArticle(null)}
            onToggleRead={handleToggleRead}
            onToggleArchive={handleToggleArchive}
            onShare={handleShare}
          />
        )}
      </div>
    </div>
  );
};

export default Home;
