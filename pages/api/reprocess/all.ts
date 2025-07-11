// FILE: pages/api/reprocess/all.ts  
// Reprocess ALL newsletters (use with caution!)

import { NextApiRequest, NextApiResponse } from 'next';
import { getAllNewsletters, updateNewsletter } from '../../../lib/storage';
import { NewsletterParser } from '../../../lib/parser';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { confirmReprocessAll = false, maxCount = 10 } = req.body;

    if (!confirmReprocessAll) {
      return res.status(400).json({ 
        error: 'Must confirm bulk reprocessing by setting confirmReprocessAll: true',
        warning: 'This will reprocess all newsletters and may take a while'
      });
    }

    console.log('Starting bulk reprocessing...');

    // Get all newsletters
    const newsletters = await getAllNewsletters();
    console.log(`Found ${newsletters.length} newsletters`);

    // Filter to only those with rawContent and limit count
    const processableNewsletters = newsletters
      .filter(n => n.rawContent)
      .slice(0, maxCount);

    if (processableNewsletters.length === 0) {
      return res.status(400).json({ 
        error: 'No newsletters with raw content found',
        suggestion: 'Only newsletters created after content preservation can be reprocessed'
      });
    }

    console.log(`Reprocessing ${processableNewsletters.length} newsletters...`);

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const newsletter of processableNewsletters) {
      try {
        console.log(`Processing newsletter ${newsletter.id}: ${newsletter.subject}`);

        const parseResult = NewsletterParser.parseToCleanHTML(newsletter.rawContent, {
          preserveImages: true,
          preserveLinks: true
        });

        const updatedNewsletter = {
          ...newsletter,
          cleanContent: parseResult.cleanHTML,
          content: parseResult.cleanHTML,
          metadata: {
            ...newsletter.metadata,
            ...parseResult.metadata,
            reprocessedAt: new Date().toISOString(),
            reprocessedFrom: newsletter.metadata?.processingVersion || 'unknown'
          }
        };

        await updateNewsletter(newsletter.id, updatedNewsletter);

        results.push({
          id: newsletter.id,
          subject: newsletter.subject,
          success: true,
          originalVersion: newsletter.metadata?.processingVersion || 'unknown',
          newVersion: parseResult.metadata.processingVersion
        });

        successCount++;
        console.log(`✅ Success: ${newsletter.id}`);

      } catch (error) {
        console.error(`❌ Error processing ${newsletter.id}:`, error);
        results.push({
          id: newsletter.id,
          subject: newsletter.subject,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
        errorCount++;
      }
    }

    console.log(`Bulk reprocessing complete: ${successCount} success, ${errorCount} errors`);

    res.status(200).json({
      success: true,
      summary: {
        totalProcessed: processableNewsletters.length,
        successCount,
        errorCount
      },
      results
    });

  } catch (error) {
    console.error('Bulk reprocessing error:', error);
    res.status(500).json({ 
      error: 'Internal server error during bulk reprocessing',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
