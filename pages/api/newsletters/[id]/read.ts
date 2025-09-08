import { NextApiRequest, NextApiResponse } from 'next';
import { getRedisClient } from "@/lib/redisClient";
import logger from '@/utils/logger';

interface ReadRequest extends NextApiRequest {
  body: {
    isRead?: boolean;
  };
}

export default async function handler(
  req: ReadRequest,
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
    // Default to true for backward compatibility
    const { isRead = true } = req.body;
    
    // Ensure we're using the correct ID format
    const newsletterId = id.startsWith('newsletter:') ? id : `newsletter:${id}`;
    const metaKey = `newsletter:meta:${id.replace(/^newsletter:/, '')}`;
    
    logger.info(`Updating read status for newsletter`, { 
      id, 
      newsletterId,
      metaKey,
      isRead 
    });
    
    // Get the Redis client
    const redis = await getRedisClient();
    const client = await redis;
    
    try {
      // Check if we have a meta key for this newsletter
      const exists = await client.exists(metaKey);
      
      if (exists) {
        // Update the read status in the metadata hash
        const result = await client.hset(metaKey, { 
          isRead: isRead ? '1' : '0',
          lastAccessedAt: new Date().toISOString()
        });
        
        logger.info('Updated read status in metadata', { result });
      } else {
        // Create the metadata hash if it doesn't exist
        const result = await client.hset(metaKey, {
          id: id.replace(/^newsletter:/, ''),
          isRead: isRead ? '1' : '0',
          lastAccessedAt: new Date().toISOString(),
          // Add minimal required fields
          subject: '',
          sender: '',
          receivedAt: new Date().toISOString(),
          wordCount: '0',
          tags: '[]',
          metadata: JSON.stringify({
            processingVersion: '1.0',
            processedAt: new Date().toISOString(),
            isRead,
            archived: false
          })
        });
        
        logger.info('Created new metadata entry', { result });
      }
      
      // Also update the main newsletter object if it's a hash
      try {
        const type = await client.type(newsletterId);
        if (type === 'hash') {
          await client.hset(newsletterId, { isRead });
          logger.info('Updated read status in main newsletter hash');
        } else {
          // If it's a string, we need to parse it, update, and save it back
          const data = await client.get(newsletterId);
          if (data) {
            const parsed = typeof data === 'string' ? JSON.parse(data) : data;
            const updated = { ...parsed, isRead };
            await client.set(newsletterId, JSON.stringify(updated));
            logger.info('Updated read status in main newsletter string');
          }
        }
      } catch (updateError) {
        logger.error('Error updating main newsletter object', { error: updateError });
        // Don't fail the request if this part fails
      }
      
      return res.status(200).json({ 
        success: true,
        isRead,
        timestamp: new Date().toISOString(),
        updatedIn: 'metadata',
        metaKey
      });
    } catch (error) {
      console.error('Error updating read status in Redis:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } catch (error) {
    console.error('Unexpected error in read status update:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
