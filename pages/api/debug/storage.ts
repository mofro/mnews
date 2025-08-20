// FILE: pages/api/debug/storage.ts
// Debug endpoint to test storage functions directly

import { NextApiRequest, NextApiResponse } from 'next';
import { NewsletterStorage } from '../../../lib/storage';
import logger from '../../../utils/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

    logger.log('Debug storage endpoint called');
    logger.log('Query params:', req.query);

    // Test getAllNewsletters
    logger.log('Testing NewsletterStorage.getAllNewsletters...');
    const allNewsletters = await NewsletterStorage.getAllNewsletters();
    logger.log(`Found ${allNewsletters.length} newsletters`);
    
    const firstFew = allNewsletters.slice(0, 3);
    logger.debug('First few newsletters:', firstFew);

    if (id) {
      // Test getNewsletter with specific ID
      logger.log(`Testing NewsletterStorage.getNewsletter with ID: ${id}`);
      const newsletter = await NewsletterStorage.getNewsletter(id as string);
      logger.log('Newsletter data:', newsletter);
      
      return res.status(200).json({
        success: true,
        totalNewsletters: allNewsletters.length,
        requestedId: id,
        found: !!newsletter,
        newsletter: newsletter ? {
          id: newsletter.id,
          subject: newsletter.subject,
          hasRawContent: !!newsletter.rawContent,
          hasCleanContent: !!newsletter.cleanContent
        } : null,
        firstFew: firstFew.map(n => ({
          id: n.id,
          subject: n.subject,
          date: n.date
        }))
      });
    }

    // No specific ID requested, return overview
    return res.status(200).json({
      success: true,
      totalNewsletters: allNewsletters.length,
      firstFew: firstFew.map(n => ({
        id: n.id,
        subject: n.subject,
        date: n.date
      })),
      message: 'Add ?id=NEWSLETTER_ID to test getNewsletter function'
    });

  } catch (error) {
    logger.error('Debug storage error:', error);
    res.status(500).json({ 
      error: 'Debug endpoint failed',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}