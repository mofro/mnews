import { NextApiRequest, NextApiResponse } from 'next';
import { getRedisClient } from "@/lib/redisClient";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'Article ID is required' });
  }

  // Log environment variables (without sensitive data)
  const envInfo = {
    nodeEnv: process.env.NODE_ENV,
    redisUrl: process.env.KV_REST_API_URL ? '***REDACTED***' : 'NOT SET',
    redisToken: process.env.KV_REST_API_TOKEN ? '***REDACTED***' : 'NOT SET',
  };

  try {
    console.log('Attempting to get Redis client...');
    const redis = getRedisClient();
    console.log('Redis client obtained');
    
    // Test connection with timeout
    try {
      console.log('Testing Redis connection...');
      const connectionTest = await redis.testConnection();
      
      if (!connectionTest) {
        return res.status(500).json({ 
          success: false, 
          message: 'Redis connection test failed',
          env: envInfo
        });
      }
    } catch (pingError) {
      console.error('Redis ping failed:', pingError);
      return res.status(500).json({
        success: false,
        message: 'Redis connection failed',
        error: pingError instanceof Error ? pingError.message : 'Unknown ping error',
        env: envInfo
      });
    }

    try {
      // Check if key exists - try different key patterns
      const keyPatterns = [
        `article:${id}`,  // Try the standard pattern first
        `newsletter:${id}`, // Try newsletter pattern
        `${id}`,           // Try raw ID
        `*${id}*`          // Try wildcard match
      ];
      
      let articleData = null;
      let foundKey = null;
      
      // Try each key pattern until we find a match
      for (const key of keyPatterns) {
        console.log('Checking for key:', key);
        const exists = await redis.exists(key);
        
        if (exists) {
          console.log('Found matching key:', key);
          foundKey = key;
          articleData = await redis.hgetall(key);
          if (articleData) {
            break;
          }
        }
      }
      
      if (!articleData) {
        console.log('Article not found with any key pattern, listing all keys...');
        // Try to find any keys at all
        const allKeys = await redis.keys('*');
        console.log('All available keys:', allKeys);
        
        return res.status(404).json({ 
          success: false,
          message: 'Article not found with any key pattern',
          searchedPatterns: keyPatterns,
          availableKeys: allKeys,
          env: envInfo
        });
      }

      // Return the found data
      console.log('Article data retrieved for key:', foundKey);
      return res.status(200).json({
        success: true,
        key: foundKey,
        data: articleData,
        env: envInfo
      });

    } catch (dataError) {
      console.error('Error fetching article data:', dataError);
      return res.status(500).json({
        success: false,
        message: 'Error fetching article data',
        error: dataError instanceof Error ? dataError.message : 'Unknown data error',
        stack: process.env.NODE_ENV === 'development' && dataError instanceof Error 
          ? dataError.stack 
          : undefined,
        env: envInfo
      });
    }

  } catch (error) {
    console.error('Test endpoint error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error in test endpoint',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' && error instanceof Error 
        ? error.stack 
        : undefined,
      env: envInfo
    });
  }
}
