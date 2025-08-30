const { Redis } = require('@upstash/redis');

async function checkArticle() {
  const redis = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  });

  try {
    const articleId = '1756496905426';
    const keys = [
      `newsletter:${articleId}`,
      `article:${articleId}`,
      articleId,
      `*${articleId}*`
    ];

    console.log('Checking keys:', keys);

    for (const key of keys) {
      try {
        const type = await redis.type(key);
        const ttl = await redis.ttl(key);
        console.log(`\nKey: ${key}`);
        console.log(`Type: ${type}`);
        console.log(`TTL: ${ttl}`);
        
        if (type === 'string') {
          const value = await redis.get(key);
          console.log('Value (first 200 chars):', value?.substring(0, 200));
        } else if (type === 'hash') {
          const hash = await redis.hgetall(key);
          console.log('Hash fields:', Object.keys(hash));
        } else if (type === 'set') {
          const members = await redis.smembers(key);
          console.log('Set members:', members);
        }
      } catch (err) {
        console.log(`Error checking key ${key}:`, err.message);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkArticle();
