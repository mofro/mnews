import { NextApiRequest, NextApiResponse } from 'next';
import { updateNewsletterReadStatus, getRedisClient } from "@/lib/redisClient";

type UpdateResult = 
  | { success: true }
  | { success: false; error: string; details?: any }
  | boolean; // For backward compatibility

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
    console.log(`[API] Updating read status for ID: ${id} (normalized to: ${newsletterId})`);
    
    const result: UpdateResult = await updateNewsletterReadStatus(newsletterId, isRead);
    
    // Handle the case where updateNewsletterReadStatus returns a boolean for backward compatibility
    if (result === true) {
      return res.status(200).json({ 
        success: true,
        isRead,
        timestamp: new Date().toISOString()
      });
    }
    
    // Handle the new UpdateResult type
    if (typeof result === 'object' && result !== null && 'success' in result) {
      const typedResult = result as { success: boolean; error?: string; details?: any };
      if (typedResult.success) {
        return res.status(200).json({ 
          success: true,
          isRead,
          timestamp: new Date().toISOString()
        });
      } else {
        // Extract error details from the result
        const { error, details } = typedResult;
        return res.status(404).json({
          message: 'Failed to update newsletter',
          debug: {
            requestedId: id,
            resolvedKey: newsletterId,
            error,
            details: details || 'No additional details available'
          },
          suggestion: 'Check the debug information for details on what went wrong'
        });
      }
    }
    
    if (result === false) {
      // Try to list all newsletter keys for debugging
      try {
        const client = getRedisClient();
        // Try to get a sample of newsletter keys using SCAN
        const [cursor, keys] = await client.scan(0, { match: 'newsletter:*', count: 10 });
        console.log('Sample of available newsletter keys:', keys);
        
        // Try to get the requested key directly for more details
        let keyDetails = null;
        try {
          const keyData = await client.hgetall(newsletterId);
          keyDetails = {
            exists: keyData !== null,
            fields: keyData ? Object.keys(keyData) : [],
            metadataType: keyData?.metadata ? typeof keyData.metadata : 'none'
          };
        } catch (e) {
          keyDetails = { error: 'Failed to inspect key details' };
        }
        
        return res.status(404).json({ 
          message: 'Newsletter not found or could not be updated',
          debug: {
            requestedId: id,
            resolvedKey: newsletterId,
            keyInspection: keyDetails,
            availableKeysSample: keys,
            totalKeys: keys.length,
            nextCursor: cursor
          },
          suggestion: 'Verify the newsletter ID and try again. Check the debug information for more details.'
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
