// pages/test-article-grid.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { truncateText } from '@/utils/string';
import { format, isToday } from 'date-fns';
import Link from 'next/link';
import { ArticleGridCard } from '@/components/newsletter/ArticleGridCard';
import { BentoGrid } from '@/components/layout/BentoGrid';
import { FullViewArticle } from '@/components/article/FullViewArticle';
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
const StatCard = ({ title, value, icon, className = '', titleFull }: { title: string; value: number | string; icon: string; className?: string; titleFull?: string }) => {
  // Determine text size based on value length for better mobile display
  const valueStr = String(value);
  const isLongValue = valueStr.length > 3;
  const valueSizeClass = isLongValue ? 'text-base sm:text-lg' : 'text-lg sm:text-xl';
  
  return (
    <div className={cn('p-2 sm:p-3 rounded-lg', className)}>
      <div className="flex items-center">
        <span className={`${isLongValue ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'} mr-2 sm:mr-3`}>
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] xs:text-xs text-gray-500 dark:text-gray-400 leading-tight">
            <span className="xs:hidden">{title}</span>
            {titleFull && <span className="hidden xs:inline sm:inline">{titleFull}</span>}
            {!titleFull && <span className="hidden xs:inline sm:inline">{title}</span>}
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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSender, setSelectedSender] = useState('');
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

  // Load articles from API
  useEffect(() => {
    const loadArticles = async () => {
      try {
        // Always fetch from API, regardless of environment
        console.log('Fetching newsletters from API...');
        const response = await fetch('/api/newsletters');
        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }
        const data = await response.json();
        console.log('API response:', data);
        
        if (data.newsletters && Array.isArray(data.newsletters)) {
          const newsletters = data.newsletters.map(transformNewsletterToArticle);
          console.log(`Fetched ${newsletters.length} newsletters from API`);
          setArticles(newsletters);
          setStats(calculateStats(newsletters));
        } else {
          console.warn('Unexpected API response format:', data);
          // Fallback to test data if API response is unexpected
          setArticles(TEST_ARTICLES);
          setStats(calculateStats(TEST_ARTICLES));
        }
      } catch (error) {
        console.error('Failed to load newsletters:', error);
        // Fallback to test data if API fails
        setArticles(TEST_ARTICLES);
        setStats(calculateStats(TEST_ARTICLES));
      } finally {
        setLoading(false);
      }
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
        const response = await fetch(`/api/newsletter/${id}/archive`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            isArchived: !articles.find(a => a.id === id)?.isArchived 
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
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
  const uniqueSenders = useMemo(() => 
    Array.from(new Set(articles.map(a => a.sender))).sort()
  , [articles]);

  // Filter articles based on search term, sender, and archive status
  const filteredArticles = useMemo(() => {
    return articles.filter(article => {
      const matchesSearch = !searchTerm || 
        article.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.sender.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSender = !selectedSender || article.sender === selectedSender;
      const matchesArchiveFilter = showArchived ? true : !article.isArchived;
      
      return matchesSearch && matchesSender && matchesArchiveFilter;
    });
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
    <div className={`min-h-screen ${theme === 'dark' ? 'dark bg-gray-900' : 'bg-gray-100'}`}>
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
                <span>{articles.filter(a => isToday(new Date(a.date))).length} today</span>
                <span>•</span>
                <span>{new Set(articles.map(a => a.sender)).size} sources</span>
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
                    title={selectedSender || 'All Senders'}
                  >
                    <option value="">All Senders</option>
                    {uniqueSenders.map(sender => (
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
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                    </svg>
                  </div>
                </div>
                
                <button
                  onClick={() => setShowArchived(!showArchived)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    showArchived 
                      ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:hover:bg-yellow-900/50' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {showArchived ? 'Hide Archived' : 'Show Archived'}
                </button>
                
                <button 
                  onClick={toggleTheme}
                  className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
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
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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