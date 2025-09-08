import { NextApiRequest, NextApiResponse } from 'next';
import { getRedisClient } from "@/lib/redisClient";

interface KeyValue {
  key: string;
  value?: unknown;
  error?: string;
}

interface HashData {
  key: string;
  hash: Record<string, string> | null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const redis = await getRedisClient();
    
    // Get all keys
    const keys = await redis.keys('*');
    console.log(`Found ${keys.length} keys in Redis`);
    
    // Get sample data from first few keys
    const sampleData: Record<string, unknown> = {};
    const keysToSample = Math.min(keys.length, 5);
    
    // Get values for each key
    const values: KeyValue[] = await Promise.all(
      keys.map(async (key: string) => {
        try {
          const value = await redis.get(key);
          return { key, value };
        } catch (error) {
          console.error(`Error getting value for key ${key}:`, error);
          return { key, error: 'Error retrieving value' };
        }
      })
    );
    
    // Get hash data for each key that might be a hash
    const hashData: HashData[] = await Promise.all(
      keys.map(async (key: string) => {
        try {
          const hash = await redis.hgetall(key);
          return { 
            key, 
            hash: hash && typeof hash === 'object' && Object.keys(hash).length > 0 
              ? hash as Record<string, string> 
              : null 
          };
        } catch (error) {
          // Not a hash, or error occurred
          return { key, hash: null };
        }
      })
    );
    
    // Process sample data
    for (let i = 0; i < keysToSample; i++) {
      const key = keys[i];
      const value = values.find((v) => v.key === key);
      const hash = hashData.find((h) => h.key === key);
      
      if (value && 'value' in value && value.value !== undefined) {
        try {
          // Try to parse as JSON if it's a string
          sampleData[key] = typeof value.value === 'string' 
            ? JSON.parse(value.value) 
            : value.value;
        } catch {
          sampleData[key] = value.value;
        }
      } else if (hash && hash.hash) {
        sampleData[key] = hash.hash;
      } else if (value && 'error' in value) {
        sampleData[key] = { error: value.error };
      } else {
        sampleData[key] = { error: 'Error fetching key', message: 'Unknown error' };
      }
    }
    
    return res.status(200).json({
      success: true,
      totalKeys: keys.length,
      keys,
      sampleData
    });
    
  } catch (error) {
    console.error('Error in debug-keys:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return res.status(500).json({ 
      success: false, 
      error: errorMessage 
    });
  }
}
