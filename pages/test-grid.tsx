'use client';

import { useState, useEffect, useRef } from 'react';
import { BentoGrid, BentoItem } from '@/components/layout/BentoGrid';

import { Newsletter } from '@/lib/types';

interface NewsletterCard extends Omit<Newsletter, 'metadata'> {
  metadata: Newsletter['metadata'] & {
    imageUrl?: string;
    tags?: string[];
  };
}

interface CardProps {
  newsletter: NewsletterCard;
  className?: string;
}

const Card = ({ newsletter, className = '' }: CardProps) => {
  const [isMounted, setIsMounted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isRead, setIsRead] = useState(newsletter.metadata.isRead);
  const [isArchived, setIsArchived] = useState(newsletter.metadata.archived);
  const contentRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);
  
  // Safely parse date with fallback to current date
  const parseDateSafely = (dateString: string): Date => {
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? new Date() : date;
    } catch (e) {
      return new Date();
    }
  };
  
  const shareNewsletter = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareText = `${newsletter.subject} - ${newsletter.sender}`;
    const shareUrl = `${window.location.origin}/newsletter/${newsletter.id}`;
    
    if (navigator.share) {
      navigator.share({
        title: newsletter.subject,
        text: newsletter.rawContent || newsletter.subject,
        url: shareUrl,
      }).catch(console.error);
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(shareUrl).then(() => {
        alert('Link copied to clipboard!');
      });
    }
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Update content height when expanded state changes
  useEffect(() => {
    if (expanded && contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    } else {
      setContentHeight(0);
    }
  }, [expanded, newsletter.content]);
  
  // Use cleanContent if available, otherwise fall back to content
  const displayContent = newsletter.cleanContent || newsletter.content;
  const imageUrl = newsletter.metadata.imageUrl;

  // Scroll into view when expanded on mobile
  useEffect(() => {
    if (expanded && cardRef.current && window.innerWidth <= 768) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [expanded]);

  const toggleExpand = (e: React.MouseEvent) => {
    // Don't toggle if clicking on buttons or links
    if ((e.target as HTMLElement).closest('button, a')) {
      return;
    }
    setExpanded(!expanded);
  };

  const toggleRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRead(!isRead);
    // TODO: Add API call to update read status
  };

  const toggleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsArchived(!isArchived);
    // TODO: Add API call to update archive status
  };

  if (!isMounted) {
    return null;
  }

  const formattedDate = parseDateSafely(newsletter.date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  return (
    <div 
      ref={cardRef}
      className={`flex flex-col w-full bg-white dark:bg-gray-800 transition-all duration-300 border-0 rounded-[0.5rem] overflow-hidden shadow-sm hover:shadow-md ${className} ${
        isRead ? 'opacity-80' : 'opacity-100'
      }`}
      onClick={toggleExpand}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && toggleExpand(e as any)}
    >
      <div className="flex items-start justify-between p-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
            <span className="font-medium text-gray-900 dark:text-gray-100">{newsletter.sender}</span>
            <span>•</span>
            <time dateTime={newsletter.date}>
              {formattedDate}
            </time>
            {newsletter.isNew && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                New
              </span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{newsletter.subject}</h3>
        </div>
        <div className="flex items-center space-x-1">
          <button 
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" 
            onClick={toggleRead}
            title={isRead ? 'Mark as unread' : 'Mark as read'}
            aria-label={isRead ? 'Mark as unread' : 'Mark as read'}
          >
            {isRead ? '✓' : '○'}
          </button>
          <button 
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" 
            onClick={toggleArchive}
            title={isArchived ? 'Unarchive' : 'Archive'}
            aria-label={isArchived ? 'Unarchive' : 'Archive'}
          >
            {isArchived ? '↩' : '📁'}
          </button>
        </div>
      </div>

      <div className="px-4 pb-4">
        {imageUrl && (
          <div className="relative aspect-video w-full overflow-hidden rounded-[0.5rem] mb-4">
            <img 
              src={imageUrl}
              alt="" 
              className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
              loading="lazy"
              aria-hidden="true"
            />
          </div>
        )}
        
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <div 
            ref={contentRef}
            className={`transition-all duration-300 overflow-hidden leading-snug ${
              expanded ? 'max-h-[2000px]' : 'max-h-[4.5rem] line-clamp-4'
            }`}
            style={{
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: expanded ? 'unset' : '4',
            }}
            dangerouslySetInnerHTML={{ __html: displayContent }}
          />
          {!expanded && (
            <button 
              className="mt-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(true);
              }}
              aria-label="Read more"
            >
              Read more
            </button>
          )}
        </div>

        {newsletter.metadata.tags && newsletter.metadata.tags.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
            <div className="flex flex-wrap gap-2">
              {newsletter.metadata.tags?.map((tag) => (
                <span 
                  key={tag} 
                  className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-700 px-3 py-1 text-xs font-medium text-gray-800 dark:text-gray-200"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center border-t border-gray-100 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {isRead ? 'Read' : 'Unread'} • {isArchived ? 'Archived' : 'Not Archived'}
        </div>
        <div className="flex items-center space-x-2">
          <button 
            className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
            onClick={shareNewsletter}
            aria-label="Share newsletter"
          >
            Share
          </button>
        </div>
      </div>
    </div>
  );
};

// Development test data
const TEST_NEWSLETTERS: NewsletterCard[] = [
  {
    id: 'test-1',
    subject: 'The Future of AI in 2023',
    sender: 'Tech Insights',
    date: new Date().toISOString(),
    isNew: true,
    rawContent: `Exploring the latest advancements in artificial intelligence and machine learning technologies that are shaping our future.`,
    cleanContent: `<p>Artificial intelligence continues to evolve at a rapid pace, with new breakthroughs in machine learning, natural language processing, and computer vision. In this issue, we explore how these technologies are transforming industries from healthcare to finance.</p>
    <p>Key trends include the rise of generative AI, the increasing importance of ethical AI practices, and the growing role of AI in creative fields.</p>`,
    content: `<p>Artificial intelligence continues to evolve at a rapid pace, with new breakthroughs in machine learning, natural language processing, and computer vision. In this issue, we explore how these technologies are transforming industries from healthcare to finance.</p>
    <p>Key trends include the rise of generative AI, the increasing importance of ethical AI practices, and the growing role of AI in creative fields.</p>`,
    metadata: {
      processingVersion: '1.0',
      processedAt: new Date().toISOString(),
      isRead: false,
      archived: false,
      sections: [],
      links: [],
      wordCount: 75,
      imageUrl: 'https://images.unsplash.com/photo-1677442135136-760c50d66689?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1771&q=80',
      tags: ['AI', 'Technology', 'Future']
    }
  },
  {
    id: 'test-2',
    subject: 'Sustainable Living',
    sender: 'Green Life',
    date: new Date(Date.now() - 86400000).toISOString(),
    isNew: true,
    rawContent: `Simple ways to reduce your carbon footprint and live more sustainably.`,
    cleanContent: `<p>Living sustainably has never been more important. This issue is packed with practical tips to reduce waste, conserve energy, and make eco-friendly choices in your daily life.</p>
    <p>Learn how small changes in your routine can have a big impact on the planet.</p>`,
    content: `<p>Living sustainably has never been more important. This issue is packed with practical tips to reduce waste, conserve energy, and make eco-friendly choices in your daily life.</p>
    <p>Learn how small changes in your routine can have a big impact on the planet.</p>`,
    metadata: {
      processingVersion: '1.0',
      processedAt: new Date(Date.now() - 86400000).toISOString(),
      isRead: false,
      archived: false,
      sections: [],
      links: [],
      wordCount: 52,
      imageUrl: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1770&q=80',
      tags: ['Sustainability', 'Eco-friendly', 'Lifestyle']
    }
  },
  {
    id: 'test-3',
    subject: 'The Art of Mindfulness',
    sender: 'Mind & Body',
    date: new Date(Date.now() - 2 * 86400000).toISOString(),
    isNew: false,
    rawContent: `Discover how mindfulness practices can improve your mental health and overall well-being.`,
    cleanContent: `<p>In our fast-paced world, mindfulness offers a way to find peace and clarity. This issue explores various meditation techniques, breathing exercises, and daily practices to help you stay present and reduce stress.</p>
    <p>Learn how just a few minutes of mindfulness each day can transform your mental and emotional well-being.</p>`,
    content: `<p>In our fast-paced world, mindfulness offers a way to find peace and clarity. This issue explores various meditation techniques, breathing exercises, and daily practices to help you stay present and reduce stress.</p>
    <p>Learn how just a few minutes of mindfulness each day can transform your mental and emotional well-being.</p>`,
    metadata: {
      processingVersion: '1.0',
      processedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      isRead: false,
      archived: false,
      sections: [],
      links: [],
      wordCount: 60,
      imageUrl: 'https://images.unsplash.com/photo-1530092285049-1c85085f02b9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1770&q=80',
      tags: ['Mindfulness', 'Health', 'Wellness']
    }
  },
  {
    id: 'test-4',
    subject: 'Remote Work Revolution',
    sender: 'Work Life',
    date: new Date(Date.now() - 3 * 86400000).toISOString(),
    isNew: false,
    rawContent: `How the shift to remote work is changing the way we think about productivity and work-life balance.`,
    cleanContent: `<p>The remote work revolution is here to stay. In this issue, we examine the latest trends in remote work, from hybrid models to digital nomadism.</p>
    <p>Discover tools, tips, and strategies for staying productive and maintaining work-life balance in a remote-first world.</p>`,
    content: `<p>The remote work revolution is here to stay. In this issue, we examine the latest trends in remote work, from hybrid models to digital nomadism.</p>
    <p>Discover tools, tips, and strategies for staying productive and maintaining work-life balance in a remote-first world.</p>`,
    metadata: {
      processingVersion: '1.0',
      processedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      isRead: true,
      readAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      archived: true,
      archivedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      sections: [],
      links: [],
      wordCount: 55,
      imageUrl: 'https://images.unsplash.com/photo-1522071820081-009c5fdc863d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1770&q=80',
      tags: ['Work', 'Remote', 'Productivity']
    }
  },
  {
    id: 'test-5',
    subject: 'The Future of Space Exploration',
    sender: 'Space Today',
    date: new Date(Date.now() - 4 * 86400000).toISOString(),
    isNew: false,
    rawContent: `A look at the upcoming missions and technologies that will take us deeper into space than ever before.`,
    cleanContent: `<p>Humanity's journey to the stars continues with ambitious new missions to the Moon, Mars, and beyond. This issue covers the latest developments in space exploration, from new rocket technologies to the search for extraterrestrial life.</p>
    <p>Learn about the international collaborations and private sector innovations driving the new space race.</p>`,
    content: `<p>Humanity's journey to the stars continues with ambitious new missions to the Moon, Mars, and beyond. This issue covers the latest developments in space exploration, from new rocket technologies to the search for extraterrestrial life.</p>
    <p>Learn about the international collaborations and private sector innovations driving the new space race.</p>`,
    metadata: {
      processingVersion: '1.0',
      processedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      isRead: false,
      archived: false,
      sections: [],
      links: [],
      wordCount: 65,
      imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1772&q=80',
      tags: ['Space', 'Science', 'Exploration']
    }
  },
  {
    id: 'test-6',
    subject: 'Financial Freedom',
    sender: 'Wealth Builders',
    date: new Date(Date.now() - 5 * 86400000).toISOString(),
    isNew: false,
    rawContent: `Strategies for building wealth, reducing debt, and achieving financial independence.`,
    cleanContent: `<p>Take control of your financial future with expert advice on investing, saving, and smart money management. This issue breaks down complex financial concepts into actionable steps for building long-term wealth.</p>
    <p>Whether you're just starting or looking to optimize your portfolio, these insights will help you make informed decisions.</p>`,
    content: `<p>Take control of your financial future with expert advice on investing, saving, and smart money management. This issue breaks down complex financial concepts into actionable steps for building long-term wealth.</p>
    <p>Whether you're just starting or looking to optimize your portfolio, these insights will help you make informed decisions.</p>`,
    metadata: {
      processingVersion: '1.0',
      processedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      isRead: true,
      readAt: new Date(Date.now() - 5 * 86400000 + 3600000).toISOString(),
      archived: true,
      archivedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      sections: [],
      links: [],
      wordCount: 72,
      imageUrl: 'https://images.unsplash.com/photo-1554224155-3a58922a22c3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1765&q=80',
      tags: []
    }
  }
];

interface DashboardStats {
  totalNewsletters: number;
  todayCount: number;
  uniqueSenders: number;
  total: number;
  withCleanContent: number;
  needsProcessing: number;
  avgWordCount: number;
}

export default function TestGrid() {
  const [darkMode, setDarkMode] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [newsletters, setNewsletters] = useState<NewsletterCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSender, setSelectedSender] = useState('');
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

  // Calculate stats from newsletters
  const calculateStats = (newsletters: NewsletterCard[]) => {
    const today = new Date().toDateString();
    const senders = new Set<string>();
    
    const todayCount = newsletters.filter(n => {
      try {
        const date = new Date(n.date);
        return date.toDateString() === today;
      } catch (e) {
        return false;
      }
    }).length;

    newsletters.forEach(n => senders.add(n.sender));

    const totalWordCount = newsletters.reduce((sum, n) => {
      const content = n.cleanContent || n.content || '';
      const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
      return sum + wordCount;
    }, 0);

    const avgWordCount = newsletters.length > 0 ? Math.round(totalWordCount / newsletters.length) : 0;

    return {
      totalNewsletters: newsletters.length,
      todayCount,
      uniqueSenders: senders.size,
      total: newsletters.length,
      withCleanContent: newsletters.filter(n => n.cleanContent).length,
      needsProcessing: 0, // This would come from the API in production
      avgWordCount
    };
  };

  // Load test data in development, or fetch from API in production
  useEffect(() => {
    const loadNewsletters = async () => {
      if (process.env.NODE_ENV === 'development') {
        // Use test data in development
        setNewsletters(TEST_NEWSLETTERS);
        setStats(calculateStats(TEST_NEWSLETTERS));
      } else {
        try {
          // In production, fetch from API
          const response = await fetch('/api/newsletters');
          const data = await response.json();
          const newsletters = data.newsletters || [];
          setNewsletters(newsletters);
          setStats(calculateStats(newsletters));
        } catch (error) {
          console.error('Failed to load newsletters:', error);
          // Fallback to test data if API fails
          setNewsletters(TEST_NEWSLETTERS);
          setStats(calculateStats(TEST_NEWSLETTERS));
        }
      }
      setLoading(false);
    };

    loadNewsletters();
    setIsClient(true);
  }, []);

  // Filter newsletters based on search term, sender, and archive status
  const filteredNewsletters = newsletters.filter(newsletter => {
    const matchesSearch = !searchTerm || 
      newsletter.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      newsletter.sender.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSender = !selectedSender || newsletter.sender === selectedSender;
    const matchesArchiveFilter = showArchived ? true : !newsletter.metadata?.archived;
    
    return matchesSearch && matchesSender && matchesArchiveFilter;
  });

  // Get unique senders for filter dropdown
  const uniqueSenders = Array.from(new Set(newsletters.map(n => n.sender))).sort();

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-md border bg-white dark:bg-gray-800 shadow-lg h-80 animate-pulse">
                <div className="h-48 bg-gray-200 dark:bg-gray-700"></div>
                <div className="p-4">
                  <div className="h-6 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
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
    <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gray-100'}`}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {darkMode ? '🐠' : '🐠'} Nemo
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Finding your newsletters in the vast ocean of email
              </p>
              {stats && (
                <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                  <span>{stats.totalNewsletters} total</span>
                  <span>•</span>
                  <span>{stats.todayCount} today</span>
                  <span>•</span>
                  <span>{stats.uniqueSenders} sources</span>
                </div>
              )}
            </div>
            <div className="mt-4 md:mt-0">
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
              </button>
            </div>
          </div>
          
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
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
            
            <div className="flex gap-2">
              <select
                value={selectedSender}
                onChange={(e) => setSelectedSender(e.target.value)}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Senders</option>
                {uniqueSenders.map(sender => (
                  <option key={sender} value={sender}>{sender}</option>
                ))}
              </select>
              
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
          </div>
        </header>
        
        <BentoGrid>
          {loading ? (
            // Show loading skeleton
            Array.from({ length: 6 }).map((_, i) => (
              <BentoItem key={`loading-${i}`}>
                <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
              </BentoItem>
            ))
          ) : (
            // Show newsletters or empty state
            filteredNewsletters.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <div className="text-gray-500 dark:text-gray-400">
                  <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-lg font-medium">
                    {showArchived 
                      ? "You don't have any archived newsletters yet"
                      : searchTerm || selectedSender
                        ? "No matching newsletters found"
                        : "No newsletters found. Check back later!"}
                  </p>
                  {(searchTerm || selectedSender) && (
                    <button 
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedSender('');
                      }}
                      className="mt-2 text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              </div>
            ) : (
              filteredNewsletters.map((newsletter) => (
                <BentoItem key={newsletter.id}>
                  <Card 
                    newsletter={newsletter}
                    className="h-full"
                  />
                </BentoItem>
              ))
            )
          )}
        </BentoGrid>
      </div>
    </div>
  );
}
