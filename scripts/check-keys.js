const { redisClient } = require('../lib/redisClient');

async function checkKeys() {
  try {
    // Check all keys
    const allKeys = await redisClient.keys('*');
    console.log('All keys:', allKeys);
    
    // Check newsletter keys
    const newsletterKeys = await redisClient.keys('newsletter*');
    console.log('Newsletter keys:', newsletterKeys);
    
    // Check a sample key
    if (newsletterKeys.length > 0) {
      const sampleKey = newsletterKeys[0];
      const type = await redisClient.type(sampleKey);
      console.log(`Type of ${sampleKey}:`, type);
      
      if (type === 'hash') {
        const data = await redisClient.hgetall(sampleKey);
        console.log('Sample data:', data);
      } else if (type === 'string') {
        const data = await redisClient.get(sampleKey);
        console.log('Sample data:', data);
      }
    }
    
    // Check newsletter IDs list
    const newsletterIds = await redisClient.lrange('newsletter_ids', 0, -1);
    console.log('Newsletter IDs:', newsletterIds);
    
  } catch (error) {
    console.error('Error checking keys:', error);
  } finally {
    process.exit(0);
  }
}

checkKeys();
