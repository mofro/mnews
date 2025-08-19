// FILE: pages/api/reprocess/all.ts  
// ENHANCED: Reprocess ALL newsletters with incremental parser options

import { NextApiRequest, NextApiResponse } from 'next';
import { NewsletterStorage } from '../../../lib/storage';
import { cleanNewsletterContent } from '../../../lib/cleaners/contentCleaner';
import { IncrementalNewsletterParser, NewsletterParser } from '../../../lib/parser';
import logger from '../../../utils/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      confirmReprocessAll = false, 
      maxCount = 10,
      options = {} // NEW: Accept parser options for bulk processing
    } = req.body;

    if (!confirmReprocessAll) {
      return res.status(400).json({ 
        error: 'Must confirm bulk reprocessing by setting confirmReprocessAll: true',
        warning: 'This will reprocess all newsletters and may take a while'
      });
    }

    logger.log('Starting bulk reprocessing with options:', options);

    // Get all newsletters
    const newsletters = await NewsletterStorage.getAllNewsletters();
    logger.log(`Found ${newsletters.length} newsletters`);

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

    logger.log(`Reprocessing ${processableNewsletters.length} newsletters with enhanced parser...`);

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const newsletter of processableNewsletters) {
      try {
        logger.info(`Processing newsletter ${newsletter.id}: ${newsletter.subject}`);

        // Clean the content first
        const cleanedResult = cleanNewsletterContent(newsletter.rawContent);
        
        // Process with the parser, preserving HTML structure
        const parseResult = NewsletterParser.parseToCleanHTML(cleanedResult.cleanedContent, {
          // Skip the HTML-to-text conversion to preserve HTML structure
          skipHtmlToText: true,
          // Preserve all content structure
          enableImages: true,
          enableLinks: true,
          enableStructureRecovery: true,
          enableLinkPreservation: true,
          enableImagePreservation: true,
          // Skip cleaning since it was done in cleanNewsletterContent
          enableContentCleaning: false,
          // Allow common HTML tags and attributes
          ALLOWED_TAGS: '*',
          ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target', 'class', 'style'],
          ALLOW_DATA_ATTR: true,
          // Merge with any additional options passed in
          ...options
        });

        const newCleanContent = parseResult.cleanHTML || parseResult.finalOutput;
        await NewsletterStorage.updateCleanContent(newsletter.id, newCleanContent);

        results.push({
          newsletterId: newsletter.id,
          subject: newsletter.subject,
          success: true,
          result: {
            success: true,
            reprocessedNewsletter: {
              id: newsletter.id,
              subject: newsletter.subject,
              cleanContent: newCleanContent,
              metadata: {
                ...parseResult.metadata,
                originalLength: newsletter.rawContent.length,
                newLength: newCleanContent.length
              }
            },
            processingInfo: {
              originalVersion: newsletter.metadata?.processingVersion || 'unknown',
              newVersion: parseResult.metadata.processingVersion,
              optionsUsed: options,
              stepsExecuted: parseResult.metadata.processingSteps,
              compressionRatio: parseResult.metadata.compressionRatio
            }
          }
        });

        successCount++;
        logger.info(`✅ Success: ${newsletter.id} (${parseResult.metadata.compressionRatio} compression)`);

      } catch (error) {
        logger.error(`❌ Error processing ${newsletter.id}:`, error);
        results.push({
          newsletterId: newsletter.id,
          subject: newsletter.subject,
          success: false,
          result: {
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }
        });
        errorCount++;
      }
    }

    logger.info(`Bulk reprocessing complete: ${successCount} success, ${errorCount} errors`);

    // ENHANCED: Provide detailed summary statistics
    const successfulResults = results.filter(r => r.success);
    const compressionRatios = successfulResults
      .map((r: any) => parseFloat(r.result.processingInfo?.compressionRatio?.replace('%', '') || '0'))
      .filter(ratio => !isNaN(ratio));
    
    const avgCompression = compressionRatios.length > 0 
      ? (compressionRatios.reduce((a, b) => a + b, 0) / compressionRatios.length).toFixed(1) + '%'
      : '0%';

    const structureRecoveryEnabled = options.enableStructureRecovery;
    const structureRecoveryCount = successfulResults
      .filter((r: any) => r.result.processingInfo?.stepsExecuted?.includes('recover-structure-enhanced'))
      .length;

    res.status(200).json({
      success: true,
      summary: {
        totalProcessed: processableNewsletters.length,
        successCount,
        errorCount,
        // NEW: Enhanced statistics
        averageCompression: avgCompression,
        structureRecoveryEnabled,
        structureRecoveryApplied: structureRecoveryCount,
        optionsUsed: options
      },
      results
    });

  } catch (error) {
    logger.error('Bulk reprocessing error:', error);
    res.status(500).json({ 
      error: 'Internal server error during bulk reprocessing',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}