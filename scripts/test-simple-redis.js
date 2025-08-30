const { Redis } = require('@upstash/redis');

async function testRedis() {
  const redis = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  });

  try {
    // Test connection
    await redis.ping();
    console.log('✅ Connected to Redis');

    // Test SMEMBERS
    const testKey = 'test:set';
    await redis.sadd(testKey, ['test1', 'test2', 'test3']);
    const members = await redis.smembers(testKey);
    console.log('✅ SMEMBERS test passed:', members);
    
    // Clean up
    await redis.del(testKey);
  } catch (error) {
    console.error('❌ Redis test failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

testRedis();
