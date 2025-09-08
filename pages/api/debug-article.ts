import { NextApiRequest, NextApiResponse } from 'next';
import { redisClient } from "@/lib/redisClient";

// Helper function to safely get Redis data
const safeRedisGet = async (key: string) => {
  try {
    return await redisClient.get(key);
  } catch (error) {
    console.error(`Error getting key ${key}:`, error);
    return null;
  }
};

// Helper function to safely get Redis hash data
const safeHGetAll = async (key: string) => {
  try {
    return await redisClient.hgetall(key);
  } catch (error) {
    console.error(`Error getting hash for key ${key}:`, error);
    return null;
  }
};

// Helper function to safely get Redis keys
const safeKeys = async (pattern: string): Promise<string[]> => {
  try {
    return await redisClient.keys(pattern);
  } catch (error) {
    console.error(`Error getting keys for pattern ${pattern}:`, error);
    return [];
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'Missing article ID' });
  }

  try {
    const cleanId = String(id).trim();
    const key = `newsletter:${cleanId}`;
    console.log(`[debug-article] Fetching data for key: ${key}`);
    
    // Get all keys that might match our article
    const allKeys = await safeKeys(`*${cleanId}*`);
    console.log(`[debug-article] Found ${allKeys.length} matching keys:`, allKeys);
    
    // Try to find the exact key first
    const exactKey = allKeys.find(k => k === key) || allKeys[0] || key;
    console.log(`[debug-article] Using key for lookup: ${exactKey}`);
    
    // Try to get as string first
    const stringData = await safeRedisGet(exactKey);
    let parsedData = null;
    
    // Try to parse as JSON if it looks like JSON
    if (stringData && typeof stringData === 'string' && (stringData.startsWith('{') || stringData.startsWith('['))) {
      try {
        parsedData = JSON.parse(stringData);
        console.log(`[debug-article] Successfully parsed as JSON`);
      } catch (e) {
        console.error(`[debug-article] Error parsing JSON:`, e);
      }
    }
    
    // Try to get as hash if string parsing failed or returned nothing useful
    const hashData = parsedData ? null : await safeHGetAll(exactKey);
    
    // Log what we found
    console.log(`[debug-article] String data type:`, typeof stringData);
    console.log(`[debug-article] String data:`, stringData);
    
    if (typeof stringData === 'string') {
      console.log(`[debug-article] String data length:`, stringData.length);
    }
    
    if (hashData && typeof hashData === 'object') {
      console.log(`[debug-article] Hash data fields:`, Object.keys(hashData).length);
    }
    
    // If we have parsed data, try to extract content
    let content = '';
    if (parsedData) {
      if (typeof parsedData.content === 'string') {
        content = parsedData.content;
      } else if (parsedData.cleanContent) {
        content = parsedData.cleanContent;
      } else if (parsedData.rawContent) {
        content = parsedData.rawContent;
      }
    } else if (hashData) {
      content = hashData.content || hashData.cleanContent || hashData.rawContent || '';
    }
    
    // Get TTL for the key
    let ttl = -2; // Default to -2 (key doesn't exist)
    try {
      ttl = await redisClient.ttl(exactKey);
    } catch (e) {
      console.error('[debug-article] Error getting TTL:', e);
    }
    
    // Prepare response with all the data we've gathered
    const response = {
      success: true,
      key: exactKey,
      allMatchingKeys: allKeys,
      keyExists: ttl !== -2,
      ttl,
      
      // String data
      stringData: stringData ? 
        (typeof stringData === 'string' ? 
          (stringData.length > 500 ? stringData.substring(0, 500) + '...' : stringData) : 
          '[Non-string data]') : 
        null,
      stringLength: stringData ? (typeof stringData === 'string' ? stringData.length : 'N/A') : 0,
      
      // Hash data
      hashData: hashData && Object.keys(hashData).length > 0 ? 
        Object.fromEntries(
          Object.entries(hashData).map(([k, v]) => [
            k, 
            typeof v === 'string' && v.length > 100 ? v.substring(0, 100) + '...' : v
          ])
        ) : 
        null,
      hashFieldCount: hashData ? Object.keys(hashData).length : 0,
      
      // Parsed data
      parsedData: parsedData || null,
      
      // Extracted content preview
      contentPreview: content ? 
        (content.length > 200 ? content.substring(0, 200) + '...' : content) : 
        null,
      contentLength: content ? content.length : 0,
      
      // Redis info
      redisInfo: {
        url: process.env.KV_REST_API_URL ? 
          `${process.env.KV_REST_API_URL.split('@')[1]?.split('/')[0] || 'unknown'}` : 
          'not configured',
        tokenConfigured: !!process.env.KV_REST_API_TOKEN
      }
    };
    
    // Log the actual data for debugging
    console.log(`[debug-article] Response data:`, JSON.stringify(response, null, 2));
    console.log(`[debug-article] Full string data:`, stringData);
    console.log(`[debug-article] Full parsed data:`, parsedData);
    
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('[debug-article] Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}
