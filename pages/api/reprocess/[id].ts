// FILE: pages/api/reprocess/[id].ts
// UPDATED: Reprocess a specific newsletter with INCREMENTAL PARSER

import { NextApiRequest, NextApiResponse } from 'next';
import { NewsletterStorage } from '../../../lib/storage';
import { IncrementalNewsletterParser } from '../../../lib/parser'; // CHANGED: Use incremental parser

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

    // NEW: Reprocess with INCREMENTAL parser and options
    let parseResult: any;

    try {
      console.log('Starting incremental parsing with options:', options);
      
      // CHANGED: Use IncrementalNewsletterParser instead of NewsletterParser
      parseResult = IncrementalNewsletterParser.parseNewsletter(existingNewsletter.rawContent, {
        enableImagePreservation: options.enableImagePreservation || false,
        enableLinkPreservation: options.enableLinkPreservation || true,
        enableStructureRecovery: options.enableStructureRecovery || false, // NEW: Step 3!
        ...options
      });
      
      console.log('Incremental parser success:', {
        originalLength: existingNewsletter.rawContent.length,
        cleanLength: parseResult.finalOutput.length,
        compressionRatio: parseResult.metadata.compressionRatio,
        processingSteps: parseResult.steps.map(s => s.stepName),
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

    // Get the updated newsletter to