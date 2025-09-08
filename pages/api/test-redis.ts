import { NextApiRequest, NextApiResponse } from 'next';
import { redisClient } from '../../lib/redisClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Test connection
    const pingResult = await redisClient.client.ping();
    
    // Test getting a key
    const testKey = 'test:connection';
    await redisClient.client.set(testKey, 'test-value');
    const testValue = await redisClient.client.get(testKey);
    
    // Get all keys
    const allKeys = await redisClient.client.keys('*');
    
    // Get newsletter IDs
    const newsletterIds = await redisClient.client.lrange('newsletter_ids', 0, -1);
    
    // Get sample newsletter if available
    let sampleNewsletter = null;
    if (newsletterIds.length > 0) {
      const contentKey = `newsletter:${newsletterIds[0]}`;
      const content = await redisClient.client.get(contentKey);
      sampleNewsletter = {
        id: newsletterIds[0],
        contentKey,
        contentExists: !!content,
        contentPreview: content && typeof content === 'string' ? content.substring(0, 100) + '...' : null
      };
    }

    return res.status(200).json({
      connection: 'success',
      ping: pingResult === 'PONG',
      test: {
        key: testKey,
        value: testValue,
        success: testValue === 'test-value'
      },
      stats: {
        totalKeys: allKeys.length,
        newsletterCount: newsletterIds.length,
        sampleNewsletter
      },
      allKeys,
      newsletterIds
    });
  } catch (error) {
    console.error('Redis test error:', error);
    return res.status(500).json({ 
      error: 'Redis test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}
