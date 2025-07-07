export interface NewsletterEmail {
  id: string
  sender: string
  subject: string
  date: string
  content: string
  raw?: string
}

export interface DashboardStats {
  totalNewsletters: number
  todayCount: number
  uniqueSenders: number
  lastUpdated: string
}

export interface FilterOptions {
  sender?: string
  dateRange?: {
    start: string
    end: string
  }
  searchTerm?: string
}