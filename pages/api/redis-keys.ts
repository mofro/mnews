import { NextApiRequest, NextApiResponse } from 'next';
import { redisClient } from "@/lib/redisClient";
import logger from "@/utils/logger";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    logger.info('Fetching Redis keys...');
    
    // Get all keys with a limit to prevent memory issues
    const keys = await redisClient.keys('*');
    logger.info(`Found ${keys.length} keys in Redis`);
    
    // Get type and sample data for each key (limit to first 50 keys for performance)
    const maxKeys = 50;
    const keysToProcess = keys.slice(0, maxKeys);
    
    logger.info(`Processing first ${keysToProcess.length} keys...`);
    
    const keyInfo = await Promise.all(keysToProcess.map(async (key: string) => {
      try {
        const type = await redisClient.type(key);
        let sample = null;
        
        try {
          if (type === 'string') {
            const value = await redisClient.get(key);
            try {
              sample = typeof value === 'string' ? JSON.parse(value) : value;
            } catch (e) {
              sample = value;
            }
          } else if (type === 'hash') {
            sample = await redisClient.hgetall(key);
          } else if (type === 'list') {
            sample = await redisClient.lrange(key, 0, 0);
          } else if (type === 'set') {
            sample = await redisClient.smembers(key);
          }
        } catch (error) {
          logger.error(`Error getting data for key ${key}:`, error);
          sample = { error: 'Error getting value' };
        }
        
        // Get TTL for the key
        const ttl = await redisClient.ttl(key);
        
        return { 
          key, 
          type, 
          ttl,
          sample: sample && typeof sample === 'object' 
            ? JSON.stringify(sample).substring(0, 200) + (JSON.stringify(sample).length > 200 ? '...' : '')
            : sample
        };
      } catch (error) {
        logger.error(`Error processing key ${key}:`, error);
        return { 
          key, 
          type: 'error', 
          ttl: -2, 
          sample: { error: 'Error processing key' } 
        };
      }
    }));
    
    return res.status(200).json({ 
      success: true,
      totalKeys: keys.length,
      keysProcessed: keyInfo.length,
      maxKeysProcessed: maxKeys,
      keys: keyInfo,
      redisInfo: {
        url: process.env.KV_REST_API_URL ? 
          `${process.env.KV_REST_API_URL.split('@')[1]?.split('/')[0] || 'unknown'}` : 
          'not configured',
        tokenConfigured: !!process.env.KV_REST_API_TOKEN
      }
    });
  } catch (error) {
    logger.error('Error in redis-keys API:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      redisConfigured: !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
    });
  }
}
