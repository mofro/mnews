'use client';

import { useState, useEffect, useRef } from 'react';
import { BentoGrid, BentoItem } from '@/components/layout/BentoGrid';

interface NewsletterCard {
  id: string;
  subject: string;
  sender: string;
  date: string;
  isNew: boolean;
  rawContent: string;
  cleanContent: string;
  content: string;
  metadata: {
    processingVersion: string;
    processedAt: string;
    isRead: boolean;
    readAt?: string;
    archived: boolean;
    archivedAt?: string;
    sections?: string[];
    links?: Array<{url: string, text: string}>;
    wordCount?: number;
    redisIndex?: string;
  };
  image?: string;
  tags?: string[];
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
        {newsletter.image && (
          <div className="relative aspect-video w-full overflow-hidden rounded-[0.5rem] mb-4">
            <img 
              src={newsletter.image} 
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

        {newsletter.tags && newsletter.tags.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
            <div className="flex flex-wrap gap-2">
              {newsletter.tags.map((tag) => (
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
    image: 'https://images.unsplash.com/photo-1677442135136-760c50d66689?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1771&q=80',
    tags: ['AI', 'Technology', 'Future'],
    metadata: {
      processingVersion: '1.0',
      processedAt: new Date().toISOString(),
      isRead: false,
      archived: false,
      sections: [],
      links: [],
      wordCount: 75
    }
  },
  {
    id: 'test-2',
    subject: 'Sustainable Living',
    sender: 'Eco Living',
    date: new Date(Date.now() - 86400000).toISOString(),
    isNew: false,
    rawContent: `Simple ways to reduce your carbon footprint and live a more sustainable lifestyle in the modern world.`,
    cleanContent: `<p>Living sustainably doesn't have to be complicated. In this issue, we share practical tips for reducing waste, conserving energy, and making eco-friendly choices in your daily life.</p>
    <p>From zero-waste shopping to sustainable fashion, small changes can make a big difference for our planet.</p>`,
    content: `<p>Living sustainably doesn't have to be complicated. In this issue, we share practical tips for reducing waste, conserving energy, and making eco-friendly choices in your daily life.</p>
    <p>From zero-waste shopping to sustainable fashion, small changes can make a big difference for our planet.</p>`,
    image: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1770&q=80',
    tags: ['Sustainability', 'Lifestyle', 'Environment'],
    metadata: {
      processingVersion: '1.0',
      processedAt: new Date(Date.now() - 86400000).toISOString(),
      isRead: true,
      readAt: new Date(Date.now() - 86400000).toISOString(),
      archived: false,
      sections: [],
      links: [],
      wordCount: 50
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
    image: 'https://images.unsplash.com/photo-1530092285049-1c85085f02b9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1770&q=80',
    tags: ['Mindfulness', 'Health', 'Wellness'],
    metadata: {
      processingVersion: '1.0',
      processedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      isRead: false,
      archived: false,
      sections: [],
      links: [],
      wordCount: 60
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
    image: 'https://images.unsplash.com/photo-1522071820081-009c5fdc863d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1770&q=80',
    tags: ['Work', 'Remote', 'Productivity'],
    metadata: {
      processingVersion: '1.0',
      processedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      isRead: true,
      readAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      archived: true,
      archivedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      sections: [],
      links: [],
      wordCount: 55
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
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1772&q=80',
    tags: ['Space', 'Science', 'Exploration'],
    metadata: {
      processingVersion: '1.0',
      processedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      isRead: false,
      archived: false,
      sections: [],
      links: [],
      wordCount: 65
    }
  },
  {
    id: 'test-6',
    subject: 'Culinary Adventures',
    sender: 'Food & Travel',
    date: new Date(Date.now() - 5 * 86400000).toISOString(),
    isNew: false,
    rawContent: `Exploring unique cuisines and cooking techniques from around the world to spice up your kitchen.`,
    cleanContent: `<p>Take your taste buds on a global journey with our guide to international cuisines. This issue features authentic recipes, cooking techniques, and cultural insights from top chefs around the world.</p>
    <p>From street food to fine dining, discover the stories and flavors that make each cuisine unique.</p>`,
    content: `<p>Take your taste buds on a global journey with our guide to international cuisines. This issue features authentic recipes, cooking techniques, and cultural insights from top chefs around the world.</p>
    <p>From street food to fine dining, discover the stories and flavors that make each cuisine unique.</p>`,
    image: 'https://images.unsplash.com/photo-1504674900247-087703934569?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1770&q=80',
    tags: ['Food', 'Cooking', 'Travel'],
    metadata: {
      processingVersion: '1.0',
      processedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      isRead: false,
      archived: false,
      sections: [],
      links: [],
      wordCount: 45
    }
  }
];

export default function TestGrid() {
  const [darkMode, setDarkMode] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [newsletters, setNewsletters] = useState<NewsletterCard[]>([]);
  const [loading, setLoading] = useState(true);

  // Load test data in development, or fetch from API in production
  useEffect(() => {
    const loadNewsletters = async () => {
      if (process.env.NODE_ENV === 'development') {
        // Use test data in development
        setNewsletters(TEST_NEWSLETTERS);
      } else {
        try {
          // In production, fetch from API
          const response = await fetch('/api/newsletters');
          const data = await response.json();
          setNewsletters(data.newsletters || []);
        } catch (error) {
          console.error('Failed to load newsletters:', error);
          // Fallback to test data if API fails
          setNewsletters(TEST_NEWSLETTERS);
        }
      }
      setLoading(false);
    };

    loadNewsletters();
    setIsClient(true);
  }, []);

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
    <div className={`min-h-screen transition-colors duration-200 ${darkMode ? 'dark bg-gray-900' : 'bg-gray-200'}`}>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Newsletter Grid</h1>
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
        </div>
        
        <BentoGrid>
          {loading ? (
            // Show loading skeleton
            Array.from({ length: 6 }).map((_, i) => (
              <BentoItem key={`loading-${i}`}>
                <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
              </BentoItem>
            ))
          ) : (
            // Show newsletters
            newsletters.map((newsletter) => (
              <BentoItem key={newsletter.id}>
                <Card 
                  newsletter={newsletter}
                  className="h-full"
                />
              </BentoItem>
            ))
          )}
        </BentoGrid>
      </div>
    </div>
  );
}
