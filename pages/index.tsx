import { useState, useEffect, useRef, useCallback } from 'react'
import { format } from 'date-fns'
import DOMPurify from 'dompurify'
import { parseDate, formatDateSafely } from '../utils/dateService'
import { ThemeToggle } from '../components/ThemeToggle'
import MarkAsReadButton from '../components/MarkAsReadButton'
import ArchiveButton from '../components/ArchiveButton'
import type { NewsletterEmail, DashboardStats } from '../lib/types'

export default function Dashboard() {
  const [newsletters, setNewsletters] = useState<NewsletterEmail[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSender, setSelectedSender] = useState<string>('')
  const [showArchived, setShowArchived] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadNewsletters()
  }, [])

  const loadNewsletters = async () => {
    try {
      const response = await fetch('/api/newsletters')
      const data = await response.json()
      setNewsletters(data.newsletters || [])
      setStats(data.stats)
    } catch (error) {
      console.error('Failed to load newsletters:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredNewsletters = newsletters.filter(newsletter => {
    const matchesSearch = !searchTerm || 
      newsletter.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      newsletter.sender.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesSender = !selectedSender || newsletter.sender === selectedSender
    const matchesArchiveFilter = showArchived ? true : !newsletter.metadata?.archived
    
    return matchesSearch && matchesSender && matchesArchiveFilter
  })

  const handleMarkAsRead = useCallback((id: string) => {
    setNewsletters(prevNewsletters => 
      prevNewsletters.map(newsletter => 
        newsletter.id === id 
          ? { 
              ...newsletter, 
              metadata: { 
                ...newsletter.metadata,
                isRead: !newsletter.metadata?.isRead, // Toggle the read status
                readAt: newsletter.metadata?.isRead ? undefined : new Date().toISOString()
              } 
            } 
          : newsletter
      )
    );
  }, []);

  const uniqueSenders = Array.from(new Set(newsletters.map(n => n.sender)))

  if (loading) {
    return (
      <div className="container">
        <div className="loading">🐠 Loading your news...</div>
      </div>
    )
  }

  return (
    <div className="container">
      <header className="header">
        <div className="header-content">
          <div className="header-titles">
            <h1>🐠 Nemo</h1>
            <p>Finding your newsletters in the vast ocean of email</p>
            {stats && (
              <div className="stats">
                <span>{stats.totalNewsletters} total</span>
                <span>{stats.todayCount} today</span>
                <span>{stats.uniqueSenders} sources</span>
              </div>
            )}
          </div>
          <div className="header-actions">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="filters">
        <div className="flex items-center space-x-4">
          <input
            type="text"
            placeholder="Search newsletters..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          
          <select
            value={selectedSender}
            onChange={(e) => setSelectedSender(e.target.value)}
            className="sender-filter"
          >
            <option value="">All Senders</option>
            {uniqueSenders.map(sender => (
              <option key={sender} value={sender}>{sender}</option>
            ))}
          </select>
          
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              showArchived 
                ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {showArchived ? 'Hide Archived' : 'Show Archived'}
          </button>
        </div>
      </div>

      <div className="newsletters">
        {filteredNewsletters.length === 0 ? (
          <div className="empty-state text-center py-12">
            <p className="text-lg text-gray-600">
              {showArchived 
                ? "You don't have any archived newsletters yet"
                : searchTerm || selectedSender
                  ? "No matching newsletters found"
                  : "No newsletters found. Check back later!"}
            </p>
          </div>
        ) : (
          filteredNewsletters.map((newsletter, index) => (
            <NewsletterItem 
              key={newsletter.id} 
              newsletter={newsletter} 
              index={index}
              onMarkAsRead={handleMarkAsRead}
            />
          ))
        )}
      </div>
    </div>
  )
}

interface NewsletterItemProps {
  newsletter: NewsletterEmail;
  index: number;
  onMarkAsRead?: (id: string) => void;
}

function NewsletterItem({ newsletter, index, onMarkAsRead }: NewsletterItemProps) {
  const [expanded, setExpanded] = useState(false)
  const [isRead, setIsRead] = useState(!!newsletter.metadata?.isRead)
  const [isArchived, setIsArchived] = useState(!!newsletter.metadata?.archived)
  const itemRef = useRef<HTMLDivElement>(null)

  // Sync the read and archive status when the newsletter prop changes
  useEffect(() => {
    setIsRead(!!newsletter.metadata?.isRead);
    setIsArchived(!!newsletter.metadata?.archived);
  }, [newsletter.metadata?.isRead, newsletter.metadata?.archived]);

  // Enhanced debug logging for Redis index
  useEffect(() => {
    console.log('Newsletter item data:', {
      id: newsletter.id,
      metadata: newsletter.metadata,
      hasRedisIndex: !!newsletter.metadata?.redisIndex,
      redisIndex: newsletter.metadata?.redisIndex || 'Not found'
    })
  }, [newsletter])

  // Scroll into view on mobile when expanded
  useEffect(() => {
    if (expanded && itemRef.current && window.innerWidth <= 768) {
      itemRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [expanded])
  
  // In NewsletterItem component, before parseISO
  console.log('Newsletter date:', newsletter.date);
  console.log('Date type:', typeof newsletter.date);

  // if (process.env.NODE_ENV === 'development') {

  //   try {
  //     const date = parseISO(newsletter.date);
  //     console.log('Parsed date:', date);
  //   } catch (error) {
  //     console.error('Date parsing error:', error);
  //   }
  // }

  // Using the centralized date service instead of local implementation
  
  // Get the parsed date and check if it's today
  const date = parseDate(newsletter.date);
  
  // Determine if the newsletter is from today
  let isNew = false;
  if (date) {
    const today = new Date();
    isNew = date.getDate() === today.getDate() && 
            date.getMonth() === today.getMonth() && 
            date.getFullYear() === today.getFullYear();
  }

  // Generate preview text for first two items when collapsed
  const preview = !expanded && index < 3 ? (() => {
    const plain = newsletter.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    const words = plain.split(' ').slice(0, 40).join(' ')
    return words + (plain.split(' ').length > 40 ? '…' : '')
  })() : null;

  const handleMarkAsRead = async (newReadStatus = true) => {
    try {
      // Optimistically update the UI
      setIsRead(newReadStatus);
      
      // Call the API to update the read status
      const response = await fetch(`/api/newsletters/${newsletter.id}/read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isRead: newReadStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update read status');
      }

      // Notify parent component if provided
      if (onMarkAsRead) {
        onMarkAsRead(newsletter.id);
      }
    } catch (error) {
      console.error('Error updating read status:', error);
      // Revert the UI if the API call fails
      setIsRead(!newReadStatus);
    }
  };

  const handleArchive = async (id: string, newArchivedStatus: boolean) => {
    try {
      // Optimistically update the UI
      setIsArchived(newArchivedStatus);
      
      // Call the API to update the archive status
      const response = await fetch(`/api/newsletters/${id}/archive`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isArchived: newArchivedStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update archive status');
      }

      // Update the local state with the new metadata
      const updatedNewsletter = await response.json();
      if (updatedNewsletter.success) {
        // The parent component will handle the state update
        if (onMarkAsRead) {
          onMarkAsRead(id);
        }
      }
    } catch (error) {
      console.error('Error updating archive status:', error);
      // Revert the UI if the API call fails
      setIsArchived(!newArchivedStatus);
    }
  };

  // Auto-mark as read when expanded
  useEffect(() => {
    if (expanded && !isRead) {
      handleMarkAsRead(true);
    }
  }, [expanded, isRead]);

  return (
    <div 
      ref={itemRef} 
      className={`newsletter-item 
        ${isRead ? 'read' : ''} 
        ${isNew ? 'new' : ''}
        ${expanded ? 'expanded' : ''}
        ${isArchived ? 'archived' : ''}
      `}
      aria-expanded={expanded}
    >
      <div className="newsletter-header" onClick={() => setExpanded(!expanded)}>
        <div className="newsletter-meta">
          <span className="sender">{newsletter.sender}</span>
          <span className="date">{formatDateSafely(newsletter.date, (d) => format(d, 'MMM d, h:mm a'), 'Unknown date')}</span>
          <div className="flex items-center gap-2">
          {isNew && (
            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-md">
              NEW
            </span>
          )}
          <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800/50 rounded-md p-0.5">
            <MarkAsReadButton 
              id={newsletter.id}
              isRead={isRead}
              onMarkRead={() => handleMarkAsRead(!isRead)}
              size="sm"
              variant="default"
              className="h-7"
            />
            <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />
            <ArchiveButton
              id={newsletter.id}
              isArchived={isArchived}
              onArchive={(id: string, newArchivedStatus: boolean) => handleArchive(id, newArchivedStatus)}
              size="sm"
              variant="default"
              className="h-7"
            />
          </div>
        </div>
        </div>
        <h3 className="subject">{newsletter.subject}</h3>
        <div className="expand-icon">{expanded ? '📖' : '📄'}</div>
      </div>
      
      {!expanded && preview && (
        <p className="preview">{preview}</p>
      )}
      {expanded && (
        <div 
          className="newsletter-content-html"
          dangerouslySetInnerHTML={{ 
            __html: DOMPurify.sanitize(newsletter.content, {
              ALLOWED_TAGS: [
                'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                'p', 'br', 'strong', 'em', 'b', 'i',
                'ul', 'ol', 'li', 'a', 'img',
                'blockquote', 'div', 'span'
              ],
              ALLOWED_ATTR: [
                'href', 'src', 'alt', 'title', 'target'
              ],
              ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
              FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'iframe'],
              FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'style']
            })
          }} 
        />
      )}
      <div className="redis-index" style={{
        display: 'flex',
        justifyContent: 'flex-end',
        padding: '0.5rem 1rem',
        backgroundColor: 'rgba(0,0,0,0.03)',
        borderTop: '1px solid #e2e8f0',
        fontSize: '0.75rem',
        color: '#4a5568'
      }}>
        <span style={{
          backgroundColor: 'rgba(0,0,0,0.05)',
          padding: '0.25rem 0.5rem',
          borderRadius: '4px',
          fontFamily: 'monospace',
          fontWeight: 500
        }}>
          ID: {newsletter.id || 'N/A'}
          {newsletter.metadata?.redisIndex && ` (Redis: ${newsletter.metadata.redisIndex})`}
        </span>
      </div>
    </div>
  )
}