// FILE: /pages/api/newsletters.ts (REPLACE EXISTING - Match dashboard expectations)
import type { NextApiRequest, NextApiResponse } from 'next';
import { NewsletterStorage } from '../../lib/storage';
import type { DashboardStats } from '../../lib/types';
import { isDateToday, parseDate } from '../../utils/dateService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const newsletters = await NewsletterStorage.getAllNewsletters();
    
    // Calculate stats in the format your existing dashboard expects
    const today = new Date();
    const todayNewsletters = newsletters.filter(n => isDateToday(n.date));
    const uniqueSenders = new Set(newsletters.map(n => n.sender)).size;
    
    const stats: DashboardStats = {
      // Your existing dashboard properties
      totalNewsletters: newsletters.length,
      todayCount: todayNewsletters.length,
      uniqueSenders: uniqueSenders,
      
      // NEW stats (for future use)
      total: newsletters.length,
      withCleanContent: newsletters.filter(n => n.cleanContent).length,
      needsProcessing: newsletters.filter(n => 
        !n.cleanContent || n.metadata.processingVersion === 'legacy-migrated'
      ).length,
      avgWordCount: Math.round(
        newsletters
          .filter(n => n.metadata.wordCount)
          .reduce((sum, n) => sum + (n.metadata.wordCount || 0), 0) / 
        (newsletters.filter(n => n.metadata.wordCount).length || 1)
      )
    };
    
    res.status(200).json({
      newsletters,
      stats
    });
  } catch (error) {
    console.error('Error fetching newsletters:', error);
    res.status(500).json({ error: 'Failed to fetch newsletters' });
  }
}
