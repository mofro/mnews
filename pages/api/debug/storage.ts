// FILE: pages/api/debug/storage.ts
// Debug endpoint to test storage functions directly

import { NextApiRequest, NextApiResponse } from 'next';
import { NewsletterStorage } from '../../../lib/storage';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

    console.log('Debug storage endpoint called');
    console.log('Query params:', req.query);

    // Test getAllNewsletters
    const allNewsletters = await NewsletterStorage.getAllNewsletters();
    console.log(`getAllNewsletters returned ${allNewsletters.length} newsletters`);
    
    const firstFew = allNewsletters.slice(0, 3).map(n => ({
      id: n.id,
      subject: n.subject,
      hasRawContent: !!n.rawContent
    }));
    console.log('First few newsletters:', firstFew);

    if (id && typeof id === 'string') {
      // Test getNewsletter with specific ID
      console.log(`Testing getNewsletter with ID: ${id}`);
      const singleNewsletter = await NewsletterStorage.getNewsletter(id);
      console.log('getNewsletter result:', singleNewsletter ? 'Found' : 'Not found');
      
      if (singleNewsletter) {
        console.log('Newsletter details:', {
          id: singleNewsletter.id,
          subject: singleNewsletter.subject,
          hasRawContent: !!singleNewsletter.rawContent
        });
      }

      return res.status(200).json({
        success: true,
        totalNewsletters: allNewsletters.length,
        requestedId: id,
        found: !!singleNewsletter,
        newsletter: singleNewsletter ? {
          id: singleNewsletter.id,
          subject: singleNewsletter.subject,
          hasRawContent: !!singleNewsletter.rawContent,
          hasCleanContent: !!singleNewsletter.cleanContent
        } : null,
        firstFewIds: firstFew
      });
    }

    // No specific ID requested, return overview
    return res.status(200).json({
      success: true,
      totalNewsletters: allNewsletters.length,
      firstFewNewsletters: firstFew,
      message: 'Add ?id=NEWSLETTER_ID to test getNewsletter function'
    });

  } catch (error) {
    console.error('Debug storage error:', error);
    res.status(500).json({ 
      error: 'Debug endpoint failed',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}