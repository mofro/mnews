// FILE: /pages/api/newsletters.ts (REPLACE EXISTING)
import type { NextApiRequest, NextApiResponse } from 'next';
import { NewsletterStorage } from '../../lib/storage';
import type { NewslettersResponse } from '../../lib/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const newsletters = await NewsletterStorage.getAllNewsletters();
    
    // Enhanced stats with new data model
    const stats = {
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
    
    const response: NewslettersResponse = {
      newsletters,
      stats
    };
    
    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching newsletters:', error);
    res.status(500).json({ error: 'Failed to fetch newsletters' });
  }
}