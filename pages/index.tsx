import { useState, useEffect } from 'react'
import { format, isToday, parseISO } from 'date-fns'
import type { NewsletterEmail, DashboardStats } from '../lib/types'

export default function Dashboard() {
  const [newsletters, setNewsletters] = useState<NewsletterEmail[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSender, setSelectedSender] = useState<string>('')
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
    
    return matchesSearch && matchesSender
  })

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
        <h1>🐠 Nemo</h1>
        <p>Finding your newsletters in the vast ocean of email</p>
        {stats && (
          <div className="stats">
            <span>{stats.totalNewsletters} total</span>
            <span>{stats.todayCount} today</span>
            <span>{stats.uniqueSenders} sources</span>
          </div>
        )}
      </header>

      <div className="filters">
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
          <option value="">All sources</option>
          {uniqueSenders.map(sender => (
            <option key={sender} value={sender}>{sender}</option>
          ))}
        </select>
      </div>

      <div className="newsletters">
        {filteredNewsletters.length === 0 ? (
          <div className="empty">
            {newsletters.length === 0 
              ? "No newsletters yet. Forward some emails to get started!" 
              : "No newsletters match your filters."}
          </div>
        ) : (
          filteredNewsletters.map(newsletter => (
            <NewsletterItem key={newsletter.id} newsletter={newsletter} />
          ))
        )}
      </div>
    </div>
  )
}

function NewsletterItem({ newsletter }: { newsletter: NewsletterEmail }) {
  const [expanded, setExpanded] = useState(false)
  
  // In NewsletterItem component, before parseISO
  console.log('Newsletter date:', newsletter.date);
  console.log('Date type:', typeof newsletter.date);


  // Safe date parsing with fallback
  const parseDate = (dateString: string) => {
    try {
      const parsed = parseISO(dateString)
      // Check if the parsed date is valid
      if (isNaN(parsed.getTime())) {
        console.warn('Invalid date string:', dateString)
        return new Date() // fallback to current date
      }
      return parsed
    } catch (error) {
      console.warn('Error parsing date:', dateString, error)
      return new Date() // fallback to current date
    }
  }
  
  const date = parseDate(newsletter.date)
  const isNew = isToday(date)

  return (
    <div className={`newsletter-item ${isNew ? 'new' : ''}`}>
      <div className="newsletter-header" onClick={() => setExpanded(!expanded)}>
        <div className="newsletter-meta">
          <span className="sender">{newsletter.sender}</span>
          <span className="date">{format(date, 'MMM d, h:mm a')}</span>
          {isNew && <span className="new-badge">NEW</span>}
        </div>
        <h3 className="subject">{newsletter.subject}</h3>
        <div className="expand-icon">{expanded ? '📖' : '📄'}</div>
      </div>
      
      {expanded && (
        <div className="newsletter-content">
          <pre>{newsletter.content}</pre>
        </div>
      )}
    </div>
  )
}