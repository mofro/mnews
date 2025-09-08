import { NextApiRequest, NextApiResponse } from 'next';
import { redisClient } from '@/lib/redisClient';
import { cleanNewsletterContent } from '@/lib/cleaners/contentCleaner';

type ArchiveRequest = NextApiRequest & {
  query: {
    id: string;
  };
  body: {
    isArchived?: boolean;
    content?: string;
  };
};

/**
 * Generate a preview text from HTML content
 */
function generatePreviewText(html: string, maxLength = 200): string {
  return html
    .replace(/<[^>]*>/g, ' ') // Remove HTML tags
    .replace(/\s+/g, ' ')      // Collapse whitespace
    .trim()
    .substring(0, maxLength)
    .trim() + (html.length > maxLength ? '...' : '');
}

export default async function handler(
  req: ArchiveRequest,
  res: NextApiResponse
) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ message: 'Invalid newsletter ID' });
  }

  try {
    const redis = redisClient;
    if (!redis) {
      throw new Error('Failed to connect to Redis');
    }
    const now = new Date().toISOString();
    const { isArchived = true, content } = req.body;
    const newsletterId = id.startsWith('newsletter:') ? id : `newsletter:${id}`;

    console.log(`[API] Processing archive update for: ${newsletterId}`, { isArchived });
    
    // 1. Get current newsletter data
    const currentData = await redis.hgetall(newsletterId);
    if (!currentData) {
      console.error(`[API] Newsletter not found: ${newsletterId}`);
      return res.status(404).json({
        success: false,
        message: 'Newsletter not found',
        details: { key: newsletterId }
      });
    }

    // 2. Prepare update data with archive status
    const updateData: Record<string, any> = {
      isArchived,
      updatedAt: now,
      ...(isArchived && { archivedAt: now }),
      ...(!isArchived && { archivedAt: null })
    };

    // 3. Process content if provided
    if (content) {
      try {
        console.log('[API] Cleaning newsletter content');
        const { cleanedContent, removedItems } = cleanNewsletterContent(content);
        
        updateData.content = cleanedContent;
        updateData.cleanContent = cleanedContent;
        updateData.previewText = generatePreviewText(cleanedContent);
        updateData.metadata = {
          ...(currentData.metadata ? JSON.parse(currentData.metadata as string) : {}),
          processingVersion: 'v2',
          processedAt: now,
          wordCount: cleanedContent.split(/\s+/).length,
          removedItemsCount: removedItems.length
        };
        
        console.log(`[API] Content cleaned successfully. Removed ${removedItems.length} items.`);
      } catch (cleanError) {
        console.error('[API] Error cleaning content:', cleanError);
        return res.status(400).json({
          success: false,
          message: 'Failed to process content',
          error: cleanError instanceof Error ? cleanError.message : 'Unknown error'
        });
      }
    }

    // 4. Perform atomic update
    try {
      console.log('[API] Updating newsletter with data:', Object.keys(updateData));
      await redis.hset(newsletterId, {
        ...currentData,  // Preserve existing fields
        ...updateData,   // Apply updates
        metadata: typeof updateData.metadata === 'object' 
          ? JSON.stringify(updateData.metadata) 
          : updateData.metadata || currentData.metadata
      });
      
      console.log(`[API] Successfully updated newsletter: ${newsletterId}`);
      
      return res.status(200).json({ 
        success: true, 
        id: newsletterId,
        isArchived,
        previewText: updateData.previewText || null,
        timestamp: now
      });
      
    } catch (updateError) {
      console.error('[API] Failed to update newsletter:', updateError);
      throw updateError;
    }
    
  } catch (error) {
    console.error('[ERROR] Failed to process archive update:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
      ...(process.env.NODE_ENV === 'development' && { stack: error instanceof Error ? error.stack : undefined })
    });
  }
}
