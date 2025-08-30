import { NextApiRequest, NextApiResponse } from 'next';
import { getRedisClient } from '@/lib/redisClient';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const redis = getRedisClient();
    
    // Get all keys
    const keys = await redis.keys('*');
    console.log(`Found ${keys.length} keys in Redis`);
    
    // Get sample data from first few keys
    const sampleData: Record<string, unknown> = {};
    const keysToSample = Math.min(keys.length, 5);
    
    for (let i = 0; i < keysToSample; i++) {
      const key = keys[i];
      try {
        // Try to get as string first
        const value = await redis.get(key);
        if (value) {
          try {
            // Try to parse as JSON
            sampleData[key] = JSON.parse(value);
          } catch {
            sampleData[key] = value;
          }
        } else {
          // Try to get as hash
          const hash = await redis.hgetall(key);
          if (hash && Object.keys(hash).length > 0) {
            sampleData[key] = hash;
          }
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error(`Error fetching key ${key}:`, err);
        sampleData[key] = { error: 'Error fetching key', message: err.message };
      }
    }
    
    return res.status(200).json({
      success: true,
      totalKeys: keys.length,
      keys,
      sampleData
    });
    
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('Error in debug-keys:', err);
    return res.status(500).json({
      success: false,
      message: 'Error fetching Redis keys',
      error: err.message,
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack
      })
    });
  }
}
