// pages/test-article-grid.tsx
'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { ArticleGridCard } from '@/components/newsletter/ArticleGridCard';
import newslettersData from '@/data/newsletters.json';

// Interface for newsletter data
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
}

// Transform the newsletter data to match the expected article format
const transformNewsletterToArticle = (newsletter: NewsletterData, index: number) => {
  // Extract Redis ID from metadata or use the provided ID
  const redisId = newsletter.metadata?.redisIndex || newsletter.id || `newsletter-${index}`;
  
  return {
    id: redisId, // Use Redis ID as the primary ID
    redisId,     // Also include it as a separate field for reference
    sender: newsletter.sender || 'Unknown Sender',
    subject: newsletter.subject || 'No Subject',
    date: newsletter.date || new Date().toISOString(),
    content: newsletter.cleanContent || newsletter.content || '',
    isNew: index === 0, // First item is new
    isRead: newsletter.metadata?.isRead ?? index > 0,
    isArchived: newsletter.metadata?.archived ?? false,
    tags: newsletter.metadata?.tags || [],
    imageUrl: newsletter.metadata?.imageUrl || undefined
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
  const [articles, setArticles] = useState<typeof TEST_ARTICLES>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
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

  // Toggle read status
  const handleToggleRead = async (id: string) => {
    try {
      const updatedArticles = articles.map(article => 
        article.id === id 
          ? { ...article, isRead: !article.isRead }
          : article
      );
      setArticles(updatedArticles);
      
      if (process.env.NODE_ENV !== 'development') {
        await fetch(`/api/newsletters/${id}/read`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ read: !articles.find(a => a.id === id)?.isRead })
        });
      }
    } catch (error) {
      console.error('Failed to update read status:', error);
    }
  };

  // Toggle archive status
  const handleToggleArchive = async (id: string) => {
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
  };

  // Share article
  const handleShare = async (id: string) => {
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
  };

  // Get unique senders for filter dropdown
  const uniqueSenders = Array.from(new Set(articles.map(a => a.sender))).sort();

  // Filter articles based on archive status
  const filteredArticles = articles.filter(article => 
    showArchived ? article.isArchived : !article.isArchived
  );

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
        <header className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Nemo</h1>
              <p className="text-gray-600 dark:text-gray-400">Your personal newsletter archive</p>
            </div>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded">
                <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalNewsletters}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded">
                <p className="text-sm text-gray-500 dark:text-gray-400">Today</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.todayCount}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded">
                <p className="text-sm text-gray-500 dark:text-gray-400">Senders</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.uniqueSenders}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded">
                <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Words</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.avgWordCount}</p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end mb-6">
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
          </div>
        </header>
        
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
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
            filteredArticles.map(article => (
              <ArticleGridCard
                key={article.id}
                id={article.id}
                sender={article.sender}
                subject={article.subject}
                date={article.date}
                content={article.content}
                isNew={article.isNew}
                isRead={article.isRead}
                isArchived={article.isArchived}
                tags={article.tags}
                imageUrl={article.imageUrl}
                onToggleRead={handleToggleRead}
                onToggleArchive={handleToggleArchive}
                onShare={handleShare}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}