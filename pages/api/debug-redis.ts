import { NextApiRequest, NextApiResponse } from 'next';
import { getRedisClient } from "@/lib/redisClient";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const redis = getRedisClient();
    
    // Test connection using client helper
    const connection = await redis.testConnectionDetailed();
    if (!connection.success) {
      throw new Error(connection.error || 'Redis connection failed');
    }
    
    // Get all keys
    const keys = await redis.keys('*');
    
    // Get sample data from first 5 keys
    const sampleData: Record<string, unknown> = {};
    for (const key of keys.slice(0, 5)) {
      try {
        // Try to get as string first
        const value = await redis.get(key);
        if (value) {
          try {
            sampleData[key] = JSON.parse(value);
          } catch {
            sampleData[key] = value;
          }
        } else {
          // Try to get as hash
          const hash = await redis.hgetall(key);
          if (hash && Object.keys(hash).length > 0) {
            sampleData[key] = hash;
          } else {
            sampleData[key] = null;
          }
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        sampleData[key] = { error: err.message };
      }
    }
    
    return res.status(200).json({
      success: true,
      connection,
      totalKeys: keys.length,
      keys,
      sampleData
    });
    
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('Redis debug error:', err);
    return res.status(500).json({
      success: false,
      message: 'Error debugging Redis',
      error: err.message,
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack
      })
    });
  }
}
