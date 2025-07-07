import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import { isToday, parseISO } from 'date-fns'
import type { NewsletterEmail, DashboardStats } from '../../lib/types'

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const newsletters = loadNewsletters()
    const stats = calculateStats(newsletters)
    
    res.status(200).json({
      newsletters,
      stats
    })
  } catch (error) {
    console.error('Error loading newsletters:', error)
    res.status(500).json({ 
      newsletters: [], 
      stats: {
        totalNewsletters: 0,
        todayCount: 0,
        uniqueSenders: 0,
        lastUpdated: new Date().toISOString()
      }
    })
  }
}

function loadNewsletters(): NewsletterEmail[] {
  const filePath = path.join(process.cwd(), 'data', 'newsletters.json')
  
  if (!fs.existsSync(filePath)) {
    return []
  }
  
  try {
    const data = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    console.error('Error parsing newsletters.json:', error)
    return []
  }
}

function calculateStats(newsletters: NewsletterEmail[]): DashboardStats {
  const todayCount = newsletters.filter(newsletter => {
    try {
      return isToday(parseISO(newsletter.date))
    } catch {
      return false
    }
  }).length
  
  const uniqueSenders = new Set(newsletters.map(n => n.sender)).size
  
  return {
    totalNewsletters: newsletters.length,
    todayCount,
    uniqueSenders,
    lastUpdated: new Date().toISOString()
  }
}