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
        // Try to get a sample of newsletter keys using SCAN
        // @ts-ignore - Using internal Redis commands for debugging
        const [cursor, keys] = await client.scan(0, { match: 'newsletter:*', count: 10 });
        console.log('Sample of available newsletter keys:', keys);
        return res.status(404).json({ 
          message: 'Newsletter not found',
          debug: {
            requestedId: id,
            availableKeysSample: keys,
            totalKeys: keys.length,
            nextCursor: cursor
          },
          suggestion: 'Try using one of the IDs from the availableKeysSample array'
        });
      } catch (e) {
        console.error('Error scanning newsletter keys:', e);
        // Try a different approach - check if we can get any data at all
        try {
          const client = getRedisClient();
          // Try to get any key to test the connection
          const testKey = 'newsletter:test';
          await client.hset(testKey, { test: 'test' });
          const testData = await client.hgetall(testKey);
          await client.hdel(testKey, 'test');
          
          return res.status(404).json({ 
            message: 'Newsletter not found',
            debug: {
              requestedId: id,
              testConnection: 'Success',
              testData: testData
            },
            error: 'Could not list newsletter keys, but Redis connection is working'
          });
        } catch (innerError) {
          console.error('Error testing Redis connection:', innerError);
          return res.status(404).json({ 
            message: 'Newsletter not found',
            error: 'Could not connect to Redis or list newsletter keys',
            details: innerError instanceof Error ? innerError.message : 'Unknown error'
          });
        }
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
