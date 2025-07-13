// FILE: pages/api/reprocess/[id].ts
// Reprocess a specific newsletter with current parser version

import { NextApiRequest, NextApiResponse } from 'next';
import { NewsletterStorage } from '../../../lib/storage';
import { NewsletterParser } from '../../../lib/parser';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Newsletter ID required' });
    }

    console.log(`Reprocessing newsletter ${id}...`);

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

    // Reprocess with current parser
    let newCleanContent: string;
    let processingMetadata: any;

    try {
      console.log('Starting enhanced parsing...');
      const parseResult = NewsletterParser.parseToCleanHTML(existingNewsletter.rawContent, {
        preserveImages: true,
        preserveLinks: true
      });
      
      newCleanContent = parseResult.finalOutput;
      processingMetadata = parseResult.metadata;
      
      console.log('Enhanced parser success:', {
        originalLength: existingNewsletter.rawContent.length,
        cleanLength: newCleanContent.length,
        compressionRatio: parseResult.metadata.compressionRatio,
        processingSteps: parseResult.metadata.processingSteps
      });
    } catch (parseError) {
      console.error('Enhanced parser failed:', parseError);
      return res.status(500).json({ 
        error: 'Parser failed during reprocessing',
        details: parseError instanceof Error ? parseError.message : String(parseError)
      });
    }

    // Save the updated newsletter using the available method
    await NewsletterStorage.updateCleanContent(id, newCleanContent);

    console.log('Newsletter reprocessed successfully');

    // Return comparison data
    res.status(200).json({
      success: true,
      newsletter: {
        id: existingNewsletter.id,
        subject: existingNewsletter.subject,
        sender: existingNewsletter.sender,
        date: existingNewsletter.date
      },
      processing: {
        originalVersion: existingNewsletter.metadata?.processingVersion || 'unknown',
        newVersion: processingMetadata.processingVersion,
        originalLength: existingNewsletter.cleanContent?.length || 0,
        newLength: newCleanContent.length,
        processingSteps: processingMetadata.processingSteps,
        reprocessedAt: new Date().toISOString()
      },
      comparison: {
        lengthChange: newCleanContent.length - (existingNewsletter.cleanContent?.length || 0),
        compressionRatio: processingMetadata.compressionRatio
      }
    });

  } catch (error) {
    console.error('Reprocessing error:', error);
    res.status(500).json({ 
      error: 'Internal server error during reprocessing',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}