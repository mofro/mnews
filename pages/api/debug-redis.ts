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
    const redis = await getRedisClient();
    
    // Test connection by pinging Redis
    try {
      const pingResponse = await redis.ping();
      console.log('Redis ping response:', pingResponse);
    } catch (error) {
      throw new Error(`Redis connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Get all keys
    const keys = await redis.keys('*');
    
    // Get sample data from first 5 keys
    const sampleData: Record<string, unknown> = {};
    const keysToCheck = keys.slice(0, 5);
    
    for (const key of keysToCheck) {
      try {
        // Try to get as string first
        const value = await redis.get(key);
        if (value !== null) {
          try {
            // Try to parse as JSON if it's a string
            sampleData[key] = typeof value === 'string' ? JSON.parse(value) : value;
          } catch {
            sampleData[key] = value;
          }
        } else {
          // Try to get as hash if string is null
          try {
            const hash = await redis.hgetall(key);
            if (hash && typeof hash === 'object' && Object.keys(hash).length > 0) {
              sampleData[key] = hash;
            } else {
              sampleData[key] = null;
            }
          } catch (hashError) {
            console.error(`Error getting hash for key ${key}:`, hashError);
            sampleData[key] = { error: 'Error getting hash data' };
          }
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error(`Error processing key ${key}:`, err);
        sampleData[key] = { error: err.message };
      }
    }
    
    return res.status(200).json({
      success: true,
      connection: 'OK',
      totalKeys: keys.length,
      sampleData
    });
    
  } catch (error) {
    console.error('Error in debug-redis:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
}
