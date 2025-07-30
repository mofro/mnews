// pages/test-article-grid.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { ArticleGridCard } from '@/components/newsletter/ArticleGridCard';
import { BentoGrid } from '@/components/layout/BentoGrid';
import { FullViewArticle } from '@/components/article/FullViewArticle';
import { format } from 'date-fns';
import newslettersData from '@/data/newsletters.json';
import { cn } from '@/lib/utils';

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
const StatCard = ({ title, value, icon, className = '' }: { title: string; value: number | string; icon: string; className?: string }) => (
  <div className={cn('p-4 rounded-lg', className)}>
    <div className="flex items-center">
      <span className="text-2xl mr-3">{icon}</span>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
        <p className="text-xl font-semibold">{value}</p>
      </div>
    </div>
  </div>
);

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
const transformNewsletterToArticle = (newsletter: NewsletterData, index: number): TransformedArticle => {
  // Extract Redis ID from metadata or use the provided ID
  const redisId = newsletter.metadata?.redisIndex || newsletter.redisIndex || newsletter.id || `newsletter-${index}`;
  
  return {
    id: redisId, // Use Redis ID as the primary ID
    redisId,     // Also include it as a separate field for reference
    sender: newsletter.sender || 'Unknown Sender',
    subject: newsletter.subject || 'No Subject',
    date: newsletter.date || new Date().toISOString(),
    content: newsletter.cleanContent || newsletter.content || '',
    isNew: index === 0, // First item is new
    isRead: newsletter.metadata?.isRead ?? newsletter.isRead ?? index > 0,
    isArchived: newsletter.metadata?.archived ?? newsletter.archived ?? false,
    tags: newsletter.metadata?.tags || newsletter.tags || [],
    imageUrl: newsletter.metadata?.imageUrl || newsletter.imageUrl
  };
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
  const [isClient, setIsClient] = useState(false);
  const [articles, setArticles] = useState<TransformedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [fullViewArticle, setFullViewArticle] = useState<TransformedArticle | null>(null);
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalNewsletters: 0,
    todayCount: 0,
    uniqueSenders: 0,
    total: 0,
    withCleanContent: 0,
    needsProcessing: 0,
    avgWordCount: 0
  });

  // Calculate stats from articles
  const calculateStats = (articles: typeof TEST_ARTICLES) => {
    const today = new Date().toDateString();
    const senders = new Set<string>();
    
    const todayCount = articles.filter(article => {
      try {
        const date = new Date(article.date);
        return date.toDateString() === today;
      } catch (e) {
        return false;
      }
    }).length;

    articles.forEach(article => senders.add(article.sender));

    const totalWordCount = articles.reduce((sum, article) => {
      const content = article.content || '';
      const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
      return sum + wordCount;
    }, 0);

    const avgWordCount = articles.length > 0 ? Math.round(totalWordCount / articles.length) : 0;

    return {
      totalNewsletters: articles.length,
      todayCount,
      uniqueSenders: senders.size,
      total: articles.length,
      withCleanContent: articles.filter(a => a.content).length,
      needsProcessing: 0, // This would come from the API in production
      avgWordCount
    };
  };

  // Load articles from API or local data
  useEffect(() => {
    const loadArticles = async () => {
      if (process.env.NODE_ENV === 'development') {
        // Use test data in development
        setArticles(TEST_ARTICLES);
        setStats(calculateStats(TEST_ARTICLES));
      } else {
        try {
          // In production, fetch from API
          const response = await fetch('/api/newsletters');
          const data = await response.json();
          const newsletters = (data.newsletters || []).map(transformNewsletterToArticle);
          setArticles(newsletters);
          setStats(calculateStats(newsletters));
        } catch (error) {
          console.error('Failed to load newsletters:', error);
          // Fallback to test data if API fails
          setArticles(TEST_ARTICLES);
          setStats(calculateStats(TEST_ARTICLES));
        }
      }
      setLoading(false);
    };

    loadArticles();
    setIsClient(true);
  }, []);

  // Toggle article read status
  const handleToggleRead = useCallback((id: string) => {
    setArticles(prev => 
      prev.map(article => 
        article.id === id 
          ? { ...article, isRead: !article.isRead } 
          : article
      )
    );
  }, []);

  // Handle article expansion
  const handleExpandArticle = useCallback((article: TransformedArticle) => {
    // If clicking the same article, collapse it
    if (expandedArticleId === article.id) {
      setExpandedArticleId(null);
      setFullViewArticle(null);
    } else {
      // Expand the clicked article and collapse any others
      setExpandedArticleId(article.id);
      setFullViewArticle(article);
    }
  }, [expandedArticleId]);

  // Close full view modal
  const handleCloseFullView = useCallback(() => {
    setExpandedArticleId(null);
    setFullViewArticle(null);
  }, []);

  // Toggle archive status
  const handleToggleArchive = useCallback(async (id: string) => {
    try {
      const updatedArticles = articles.map(article => 
        article.id === id 
          ? { ...article, isArchived: !article.isArchived }
          : article
      );
      setArticles(updatedArticles);
      
      if (process.env.NODE_ENV !== 'development') {
        await fetch(`/api/newsletters/${id}/archive`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ archived: !articles.find(a => a.id === id)?.isArchived })
        });
      }
    } catch (error) {
      console.error('Failed to update archive status:', error);
    }
  }, [articles]);

  // Share article
  const handleShare = useCallback(async (id: string) => {
    try {
      const article = articles.find(a => a.id === id);
      if (article && navigator.share) {
        await navigator.share({
          title: article.subject,
          text: article.content.substring(0, 100) + '...',
          url: `${window.location.origin}/newsletter/${id}`
        });
      }
    } catch (error) {
      console.error('Failed to share:', error);
    }
  }, [articles]);

  // Get unique senders for filter dropdown
  const uniqueSenders = Array.from(new Set(articles.map(a => a.sender))).sort();

  // Filter and sort articles based on archive status and date
  const filteredArticles = useMemo(() => {
    return articles
      .filter(article => showArchived ? article.isArchived : !article.isArchived)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [articles, showArchived]);
  
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
              <div key={i} className="rounded-md border bg-white dark:bg-gray-800 shadow-lg h-80 animate-pulse">
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

  return (
    <div className={cn('min-h-screen', theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900')}>
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Header */}
        <header className="flex justify-between items-center mb-4 sm:mb-6">
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-bold">
              🐠<span className="hidden sm:inline"> Nemo</span>
            </h1>
            <p className="hidden md:block text-xs text-gray-500 dark:text-gray-400 ml-2">
              Finding your newsletters in an ocean of email
            </p>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={cn(
                'p-2 sm:px-3 sm:py-1.5 rounded-md text-sm transition-colors',
                'flex items-center justify-center',
                showArchived 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600',
                'min-w-[40px] sm:min-w-[120px]'
              )}
              aria-label={showArchived ? 'Hide archived' : 'Show archived'}
            >
              <span className="sm:hidden">
                {showArchived ? '🗑️' : '📥'}
              </span>
              <span className="hidden sm:inline">
                {showArchived ? 'Hide Archived' : 'Show Archived'}
              </span>
            </button>
            
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        </header>

        {/* Stats Bar - Single Row with Equal Width */}
        <div className="flex overflow-x-auto pb-2 -mx-1 mb-6 scrollbar-hide">
          <div className="flex flex-nowrap min-w-full space-x-2 sm:space-x-3 px-1">
            <StatCard
              title="Total"
              value={stats.totalNewsletters}
              icon="📊"
              className="flex-shrink-0 w-1/4 min-w-0 bg-blue-100 dark:bg-blue-900/30"
            />
            <StatCard
              title="Today"
              value={stats.todayCount}
              icon="📅"
              className="flex-shrink-0 w-1/4 min-w-0 bg-green-100 dark:bg-green-900/30"
            />
            <StatCard
              title="Senders"
              value={stats.uniqueSenders}
              icon="👤"
              className="flex-shrink-0 w-1/4 min-w-0 bg-purple-100 dark:bg-purple-900/30"
            />
            <StatCard
              title="Avg Words"
              value={stats.avgWordCount}
              icon="📝"
              className="flex-shrink-0 w-1/4 min-w-0 bg-yellow-100 dark:bg-yellow-900/30"
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
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
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
              <BentoGrid columns={[1, 2, 2, 3]} gap={1.5} className="mx-auto px-4">
                {filteredArticles.map((article) => (
                  <div 
                    key={article.id}
                    className="h-full"
                    onClick={() => handleExpandArticle(article)}
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
                      onToggleArchive={() => handleToggleArchive(article.id)}
                      onShare={() => handleShare(article.id)}
                    />
                  </div>
                ))}
              </BentoGrid>
            )}
          </div>
        )}

        {/* Full View Article Modal */}
        {fullViewArticle && (
          <FullViewArticle
            article={{
              id: fullViewArticle.id,
              title: fullViewArticle.subject,
              content: fullViewArticle.content || 'No content available',
              publishDate: fullViewArticle.date
            }}
            onClose={handleCloseFullView}
            className={theme === 'dark' ? 'dark' : ''}
          />
        )}
      </div>
    </div>
  );
}