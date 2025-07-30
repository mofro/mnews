// pages/test-article-grid.tsx
'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { ArticleGridCard } from '@/components/newsletter/ArticleGridCard';
import newslettersData from '@/data/newsletters.json';

// Transform the newsletter data to match the expected article format
const initialArticles = newslettersData.map((newsletter, index) => ({
  id: newsletter.id || `newsletter-${index}`,
  sender: newsletter.sender || 'Unknown Sender',
  subject: newsletter.subject || 'No Subject',
  date: newsletter.date || new Date().toISOString(),
  content: newsletter.content || '',
  isNew: index === 0, // First item is new
  isRead: index > 0,  // First item is unread, others are read
  isArchived: false,  // None are archived by default
  tags: []            // No tags by default
}));

interface DashboardStats {
  totalNewsletters: number;
  todayCount: number;
  uniqueSenders: number;
}

export default function TestArticleGrid() {
  const { theme, toggleTheme } = useTheme();
  const [articles, setArticles] = useState(initialArticles);
  const [showArchived, setShowArchived] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalNewsletters: 0,
    todayCount: 0,
    uniqueSenders: 0
  });

  // Calculate stats from articles
  useEffect(() => {
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

    setStats({
      totalNewsletters: articles.length,
      todayCount,
      uniqueSenders: senders.size
    });
  }, [articles]);

  // Get unique senders for filter dropdown
  const uniqueSenders = Array.from(new Set(articles.map(a => a.sender))).sort();
  
  // Filter articles based on archive status
  const filteredArticles = articles.filter(article => 
    showArchived ? true : !article.isArchived
  );

  const handleToggleRead = (id: string) => {
    setArticles(articles.map(article => 
      article.id === id 
        ? { ...article, isRead: !article.isRead } 
        : article
    ));
  };

  const handleToggleArchive = (id: string) => {
    setArticles(articles.map(article => 
      article.id === id 
        ? { ...article, isArchived: !article.isArchived } 
        : article
    ));
  };

  const handleShare = (id: string) => {
    const article = articles.find(a => a.id === id);
    if (article) {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(article.subject);
        alert('Link copied to clipboard!');
      } else {
        alert('Sharing not supported on this device');
      }
    }
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark bg-gray-900' : 'bg-gray-100'}`}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {theme === 'dark' ? '🐠' : '🐠'} Nemo
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Finding your newsletters in the vast ocean of email
              </p>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                <span>{stats.totalNewsletters} total</span>
                <span>•</span>
                <span>{stats.todayCount} today</span>
                <span>•</span>
                <span>{stats.uniqueSenders} sources</span>
              </div>
            </div>
            <div className="mt-4 md:mt-0">
              <button 
                onClick={toggleTheme}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
              </button>
            </div>
          </div>
          
          {/* Archive Toggle */}
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
                <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-lg font-medium">
                  {showArchived 
                    ? "You don't have any archived newsletters yet"
                    : "No newsletters found. Check back later!"}
                </p>
                {showArchived && (
                  <button 
                    onClick={() => setShowArchived(false)}
                    className="mt-2 text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>
          ) : (
            filteredArticles.map(article => (
              <ArticleGridCard
                key={article.id}
                {...article}
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