// FILE: pages/api/reprocess/[id].ts
// UPDATED: Reprocess a specific newsletter with INCREMENTAL PARSER

import { NextApiRequest, NextApiResponse } from 'next';
import { NewsletterStorage } from '../../../lib/storage';
import { IncrementalNewsletterParser, ParseResult, ProcessingStep } from '../../../lib/parser';
import { cleanNewsletterContent } from '../../../lib/cleaners/contentCleaner';

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

    console.log(`Reprocessing newsletter ${id} with options:`, options);

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

    console.log('Original newsletter:', {
      id: existingNewsletter.id,
      subject: existingNewsletter.subject,
      hasRawContent: !!existingNewsletter.rawContent,
      currentProcessingVersion: existingNewsletter.metadata?.processingVersion || 'unknown'
    });

    // Clean the content first
    console.log('Running content cleaner...');
    const cleaningResult = cleanNewsletterContent(existingNewsletter.rawContent);
    
    // Log cleaning results
    console.log(`Content cleaner removed ${cleaningResult.removedItems.length} types of elements:`);
    cleaningResult.removedItems.forEach(item => {
      console.log(`- ${item.description}: ${item.matches} matches`);
    });

    // Process with incremental parser
    let parseResult: ParseResult;
    try {
      console.log('Starting incremental parsing with options:', options);
      
      // Use cleaned content for parsing
      parseResult = IncrementalNewsletterParser.parseNewsletter(cleaningResult.cleanedContent, {
        enableImagePreservation: options.enableImagePreservation || false,
        enableLinkPreservation: options.enableLinkPreservation || true,
        enableStructureRecovery: options.enableStructureRecovery || false,
        ...options
      });
      
      console.log('Incremental parser success:', {
        originalLength: existingNewsletter.rawContent.length,
        cleanLength: parseResult.finalOutput.length,
        compressionRatio: parseResult.metadata.compressionRatio,
        processingSteps: parseResult.steps.map((s: ProcessingStep) => s.stepName),
        processingVersion: parseResult.metadata.processingVersion
      });
      
    } catch (parseError) {
      console.error('Incremental parser failed:', parseError);
      return res.status(500).json({ 
        error: 'Incremental parser failed during reprocessing',
        details: parseError instanceof Error ? parseError.message : String(parseError)
      });
    }

    // Update the newsletter with new content
    try {
      await NewsletterStorage.updateCleanContent(id, parseResult.finalOutput);
      console.log('Successfully updated newsletter content');
    } catch (updateError) {
      console.error('Failed to update newsletter:', updateError);
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
    console.error('Reprocessing error:', error);
    res.status(500).json({ 
      error: 'Internal server error during reprocessing',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}