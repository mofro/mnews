import { NextApiRequest, NextApiResponse } from 'next';
import { updateNewsletterReadStatus, getRedisClient } from '@/lib/redis';

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
    
    const success = await updateNewsletterReadStatus(id as string, isRead);
    
    if (!success) {
      // Try to list all newsletter keys for debugging
      try {
        const client = getRedisClient();
        // @ts-ignore - Using internal Redis commands for debugging
        const keys = await client.keys('newsletter:*');
        console.log('Available newsletter keys:', keys);
        return res.status(404).json({ 
          message: 'Newsletter not found',
          debug: {
            requestedId: id,
            availableKeys: keys
          }
        });
      } catch (e) {
        console.error('Error listing newsletter keys:', e);
        return res.status(404).json({ 
          message: 'Newsletter not found',
          error: 'Could not list available newsletter keys'
        });
      }
    }

    return res.status(200).json({ 
      success: true,
      isRead,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error updating newsletter read status:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
