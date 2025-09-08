import { NextApiRequest, NextApiResponse } from 'next';
import { redisClient } from "@/lib/redisClient";

// Helper function to find article by trying multiple key patterns
async function findArticle(redis: any, id: string) {
  console.log(`[findArticle] Searching for article with ID: ${id}`);
  console.log(`[findArticle] Redis client type: ${typeof redis}`);
  console.log(`[findArticle] Redis client methods: ${Object.keys(redis).join(', ')}`);
  
  // Clean the ID to remove any prefixes/suffixes that might interfere
  const cleanId = id.replace(/^(newsletter:|article:)/, '');
  
  // Try exact match with newsletter: prefix first since that's how the data is stored
  const exactKey = `newsletter:${cleanId}`;
  console.log(`[findArticle] Trying exact key: ${exactKey}`);
  
  try {
    // First try to get the data (could be string or object)
    console.log(`[findArticle] Calling redis.get('${exactKey}')`);
    const data = await redis.get(exactKey);
    
    if (data) {
      console.log(`[findArticle] Found data for ${exactKey}, type: ${typeof data}`);
      
      if (typeof data === 'string') {
        console.log(`[findArticle] Data is string, length: ${data.length}`);
        try {
          const parsedData = JSON.parse(data);
          console.log(`[findArticle] Successfully parsed JSON for ${exactKey}`);
          return { data: parsedData, key: exactKey };
        } catch (parseError) {
          console.error(`[findArticle] Error parsing JSON for key ${exactKey}:`, parseError);
          console.error(`[findArticle] Content that failed to parse:`, data);
        }
      } else if (typeof data === 'object' && data !== null) {
        console.log(`[findArticle] Data is object, keys:`, Object.keys(data));
        return { data, key: exactKey };
      }
    } else {
      console.log(`[findArticle] No string data found for ${exactKey}`);
    }
    
    // Then try as hash (just in case)
    const hashData = await redis.hgetall(exactKey);
    if (hashData && Object.keys(hashData).length > 0) {
      console.log(`[findArticle] Found hash data for ${exactKey}, fields:`, Object.keys(hashData));
      return { data: hashData, key: exactKey };
    }
  } catch (error) {
    console.error(`[findArticle] Error with exact key ${exactKey}:`, error);
  }
  
  // If exact match with newsletter: prefix didn't work, try other patterns
  const keyPatterns = [
    cleanId,                  // Try the raw ID
    `article:${cleanId}`,     // Try article prefix
    `*:${cleanId}`,           // Try with wildcard prefix
    `*${cleanId}*`            // Try wildcard match as last resort
  ];

  console.log(`[findArticle] Trying additional key patterns:`, keyPatterns);

  // Try each pattern in order
  for (const pattern of keyPatterns) {
    console.log(`[findArticle] Trying pattern: ${pattern}`);
    
    try {
      // Skip if this is the same as our exact match we already tried
      if (pattern === exactKey) continue;
      
      // First try to get as a string (JSON)
      console.log(`[findArticle] Trying redis.get('${pattern}')`);
      const stringData = await redis.get(pattern);
      
      if (stringData) {
        console.log(`[findArticle] Found string data for ${pattern}, length: ${stringData.length}`);
        try {
          const parsedData = JSON.parse(stringData);
          console.log(`[findArticle] Successfully parsed JSON for ${pattern}`);
          return { data: parsedData, key: pattern };
        } catch (parseError) {
          console.error(`[findArticle] Error parsing JSON for key ${pattern}:`, parseError);
        }
      }
      
      // Then try as hash
      console.log(`[findArticle] Trying redis.hgetall('${pattern}')`);
      const hashData = await redis.hgetall(pattern);
      
      if (hashData && Object.keys(hashData).length > 0) {
        console.log(`[findArticle] Found hash data for ${pattern}, fields:`, Object.keys(hashData));
        return { data: hashData, key: pattern };
      }
      
      // If no exact match, try pattern matching
      if (pattern.includes('*')) {
        console.log(`[findArticle] Trying pattern matching with: ${pattern}`);
        const keys = await redis.keys(pattern);
        console.log(`[findArticle] Found ${keys.length} keys matching ${pattern}`);
        
        for (const key of keys) {
          // Skip the exact key we already tried
          if (key === exactKey) continue;
          
          console.log(`[findArticle] Processing key: ${key}`);
          
          // Try string (JSON) first
          console.log(`[findArticle] Trying redis.get('${key}')`);
          const keyStringData = await redis.get(key);
          
          if (keyStringData) {
            console.log(`[findArticle] Found string data for ${key}, length: ${keyStringData.length}`);
            try {
              const parsedData = JSON.parse(keyStringData);
              console.log(`[findArticle] Successfully parsed JSON for ${key}`);
              return { data: parsedData, key };
            } catch (parseError) {
              console.error(`[findArticle] Error parsing JSON for key ${key}:`, parseError);
            }
          }
          
          // If we get here, try as hash
          console.log(`[findArticle] Trying redis.hgetall('${key}')`);
          const keyHashData = await redis.hgetall(key);
          
          if (keyHashData && Object.keys(keyHashData).length > 0) {
            console.log(`[findArticle] Found hash data for ${key}, fields:`, Object.keys(keyHashData));
            return { data: keyHashData, key };
          }
        }
      }
    } catch (error) {
      console.error(`[findArticle] Error searching with pattern ${pattern}:`, error);
      // Continue to next pattern
    }
  }
  
  console.log(`[findArticle] No matches found for ID: ${id}`);
  return null;
}

// Helper function to extract content with priority
function extractContent(articleData: any) {
  // If the data already has a content field, return it as is
  if (articleData.content && articleData.title) {
    return articleData;
  }

  // Extract content from different possible fields
  const content = articleData.rawContent || articleData.content || articleData.cleanContent || '';
  const title = articleData.subject || articleData.title || 'Untitled Article';
  const sender = articleData.sender || articleData.from || 'Unknown Sender';
  const publishDate = articleData.publishDate || articleData.date || new Date().toISOString();
  
  // Extract image URL
  let imageUrl = articleData.imageUrl;
  if (!imageUrl && articleData.images && articleData.images.length > 0) {
    imageUrl = articleData.images[0];
  }

  // Extract metadata
  const isRead = articleData.isRead || (articleData.metadata && articleData.metadata.isRead) || false;
  const isArchived = articleData.isArchived || (articleData.metadata && articleData.metadata.archived) || false;
  
  // Extract tags
  let tags = [];
  if (articleData.tags) {
    tags = Array.isArray(articleData.tags) ? articleData.tags : [articleData.tags];
  } else if (articleData.metadata && articleData.metadata.tags) {
    tags = Array.isArray(articleData.metadata.tags) 
      ? articleData.metadata.tags 
      : [articleData.metadata.tags];
  }

  return {
    id: articleData.id,
    title,
    content,
    publishDate,
    sender,
    imageUrl,
    isRead,
    isArchived,
    tags,
    // Keep raw data for debugging
    ...(process.env.NODE_ENV === 'development' && { _raw: articleData })
  };
}

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

  console.log(`[API] Fetching article with ID: ${id}`);
  console.log(`[API] Environment:`, {
    NODE_ENV: process.env.NODE_ENV,
    KV_REST_API_URL: process.env.KV_REST_API_URL ? 'Set' : 'Not Set',
    KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN ? 'Set' : 'Not Set'
  });
  
  try {
    // Log Redis client status
    console.log(`[API] Redis client status:`, {
      clientExists: !!redisClient,
      clientType: typeof redisClient,
      clientMethods: Object.keys(redisClient)
    });

    // Test Redis connection with a simple ping
    try {
      const ping = await redisClient.ping();
      console.log(`[API] Redis ping response:`, ping);
    } catch (pingError) {
      console.error('[API] Redis connection test failed:', pingError);
    }

    const result = await findArticle(redisClient, id);
    
    if (!result) {
      console.log(`[API] Article not found with ID: ${id}`);
      // Try to list available keys for debugging
      try {
        const keys = await redisClient.keys('*');
        console.log(`[API] Available Redis keys (${keys.length}):`, keys);
      } catch (keysError) {
        console.error('[API] Error listing Redis keys:', keysError);
      }
      
      return res.status(404).json({ 
        success: false,
        message: 'Article not found',
        id,
        debug: {
          availableKeys: process.env.NODE_ENV === 'development' ? await redisClient.keys('*') : undefined
        }
      });
    }

    const { data: articleData, key } = result;
    console.log(`Found article with key: ${key}`);
    
    // Extract and format the article data
    const formattedArticle = {
      id: key,
      ...extractContent(articleData),
      // Include raw data for debugging in development
      ...(process.env.NODE_ENV === 'development' && { _raw: articleData })
    };
    
    // Log content length for debugging
    console.log(`Content length: ${formattedArticle.content?.length || 0} chars`);
    
    return res.status(200).json({
      success: true,
      ...formattedArticle
    });
  } catch (error) {
    console.error('Error fetching article:', error);
    return res.status(500).json({ 
      message: 'Error fetching article', 
      error: error instanceof Error ? error.message : 'Unknown error',
      ...(process.env.NODE_ENV === 'development' && {
        stack: error instanceof Error ? error.stack : undefined
      })
    });
  }
}
