// FILE: pages/api/reprocess/[id].ts
// UPDATED: Reprocess a specific newsletter with INCREMENTAL PARSER

import { NextApiRequest, NextApiResponse } from 'next';
import { NewsletterStorage } from '../../../lib/storage';
import { 
  IncrementalNewsletterParser, 
  NewsletterParser,
  ParseResult, 
  ProcessingStep 
} from '../../../lib/parser';
import { cleanNewsletterContent } from '../../../lib/cleaners/contentCleaner';
import { redisClient } from '../../../lib/redisClient';
import logger from '../../../utils/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const { options = {} } = req.body; // NEW: Accept parser options

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Newsletter ID required' });
    }

    logger.log(`Reprocessing newsletter ${id} with options:`, options);

    // Get the existing newsletter
    const existingNewsletter = await NewsletterStorage.getNewsletter(id);
    if (!existingNewsletter) {
      return res.status(404).json({ error: 'Newsletter not found' });
    }

    // Check if we have rawContent to reprocess
    if (!existingNewsletter.rawContent) {
      return res.status(400).json({ 
        error: 'No raw content available for reprocessing. Newsletter was created before content preservation was implemented.',
        suggestion: 'Only newsletters created after the content preservation update can be reprocessed.'
      });
    }

    logger.log('Original newsletter:', {
      id: existingNewsletter.id,
      subject: existingNewsletter.subject,
      hasRawContent: !!existingNewsletter.rawContent,
      currentProcessingVersion: existingNewsletter.metadata?.processingVersion || 'unknown'
    });

    // Clean the content first
    logger.log('Running content cleaner...');
    const cleaningResult = cleanNewsletterContent(existingNewsletter.rawContent);
    
    // Log cleaning results
    logger.log(`Content cleaner removed ${cleaningResult.removedItems.length} types of elements:`);
    cleaningResult.removedItems.forEach(item => {
      logger.log(`- ${item.description}: ${item.matches} matches`);
    });

    // Process with incremental parser
    let parseResult: ParseResult;
    try {
      logger.log('Starting incremental parsing with options:', options);
      
// Process with the new parser, preserving HTML structure
      parseResult = IncrementalNewsletterParser.parseNewsletter(cleaningResult.cleanedContent, {
        // Skip the HTML-to-text conversion entirely
        skipHtmlToText: true,
        // Preserve all content structure
        enableImages: true,
        enableLinks: true,
        enableStructureRecovery: true,
        enableLinkPreservation: true,
        enableImagePreservation: true,
        enableContentCleaning: false,
        // Ensure we don't strip any HTML tags
        ALLOWED_TAGS: '*',
        ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target', 'class', 'style'],
        ALLOW_DATA_ATTR: true,
        ...options // Allow overrides if needed
      });
      
      logger.log('Incremental parser success:', {
        originalLength: existingNewsletter.rawContent.length,
        cleanLength: parseResult.finalOutput.length,
        compressionRatio: parseResult.metadata.compressionRatio,
        processingSteps: parseResult.steps.map((s: ProcessingStep) => s.stepName),
        processingVersion: parseResult.metadata.processingVersion
      });
      
    } catch (parseError) {
      logger.error('Incremental parser failed:', parseError);
      return res.status(500).json({ 
        error: 'Incremental parser failed during reprocessing',
        details: parseError instanceof Error ? parseError.message : String(parseError)
      });
    }

    // Update the newsletter with new content
    try {
      // Get the existing newsletter to preserve other fields
      const existingNewsletter = await NewsletterStorage.getNewsletter(id);
      if (!existingNewsletter) {
        throw new Error('Newsletter not found after reprocessing');
      }
      
      // Update the clean content and processing version
      existingNewsletter.cleanContent = parseResult.finalOutput;
      existingNewsletter.metadata = existingNewsletter.metadata || {};
      existingNewsletter.metadata.processingVersion = parseResult.metadata.processingVersion;
      
      // Save the updated newsletter
      await redisClient.client.set(
        `newsletter:${id}`, 
        JSON.stringify(existingNewsletter)
      );
      
      logger.log('Successfully updated newsletter content');
    } catch (updateError) {
      logger.error('Failed to update newsletter:', updateError);
      return res.status(500).json({ 
        error: 'Failed to save reprocessed content',
        details: updateError instanceof Error ? updateError.message : String(updateError)
      });
    }

    // All done – respond to client with summary
    res.status(200).json({
      success: true,
      newsletterId: id,
      processingVersion: parseResult.metadata.processingVersion,
      cleanLength: parseResult.finalOutput.length,
      compressionRatio: parseResult.metadata.compressionRatio,
      stepsExecuted: parseResult.steps.map((s: ProcessingStep) => s.stepName)
    });

  } catch (error) {
    logger.error('Reprocessing error:', error);
    res.status(500).json({ 
      error: 'Internal server error during reprocessing',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}