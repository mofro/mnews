const { Redis } = require('@upstash/redis');

async function testRedisConnection() {
  // Get credentials from environment variables
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    console.error('Error: Missing required environment variables');
    console.log('Make sure KV_REST_API_URL and KV_REST_API_TOKEN are set');
    process.exit(1);
  }

  console.log('Creating Redis client with URL:', url.replace(/\/\/([^:]+):[^@]+@/, '//$1:****@'));
  
  const redis = new Redis({
    url,
    token,
  });

  try {
    // Test connection
    console.log('Testing connection...');
    const pingResult = await redis.ping();
    console.log('Ping result:', pingResult);

    // Test getting an article
    const articleId = '1756496905426';
    const key = `newsletter:${articleId}`;
    
    console.log(`\nGetting article with key: ${key}`);
    const article = await redis.get(key);
    
    if (article) {
      console.log('Article found!');
      console.log('Article type:', typeof article);
      
      // Handle different response types
      if (typeof article === 'string') {
        console.log('Article is a string');
        console.log('First 200 chars:', article.substring(0, 200));
        
        try {
          const parsed = JSON.parse(article);
          console.log('Parsed article keys:', Object.keys(parsed));
          console.log('Raw content type:', typeof parsed.rawContent);
          console.log('Raw content length:', parsed.rawContent?.length);
        } catch (e) {
          console.error('Error parsing article as JSON:', e);
        }
      } else if (typeof article === 'object' && article !== null) {
        console.log('Article is an object');
        console.log('Article keys:', Object.keys(article));
        
        if (article.rawContent) {
          console.log('Raw content type:', typeof article.rawContent);
          console.log('Raw content length:', article.rawContent.length);
          console.log('First 200 chars of raw content:', article.rawContent.substring(0, 200));
        }
      }
    } else {
      console.log('Article not found');
      
      // List all keys to see what's available
      console.log('\nListing all keys...');
      const keys = await redis.keys('*');
      console.log(`Found ${keys.length} keys`);
      console.log('First 10 keys:', keys.slice(0, 10));
      
      // Try to find any key containing the article ID
      console.log(`\nSearching for keys containing '${articleId}'...`);
      const matchingKeys = keys.filter(k => k.includes(articleId));
      console.log(`Found ${matchingKeys.length} matching keys:`, matchingKeys);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Close the connection
    process.exit(0);
  }
}

testRedisConnection();
