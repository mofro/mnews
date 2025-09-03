import { redisClient } from '../lib/redisClient';
import logger from '../utils/logger';

async function testRedisConnection() {
  try {
    logger.info('Testing Redis connection...');
    
    // Test basic ping
    const pingResult = await redisClient.client.ping();
    logger.info(`Redis ping result: ${pingResult}`);
    
    // List all keys
    const keys = await redisClient.client.keys('*');
    logger.info(`Found ${keys.length} keys in Redis`);
    
    // Show first 5 keys as sample
    const sampleKeys = keys.slice(0, 5);
    logger.info('Sample keys:', sampleKeys);
    
    // Show newsletter count
    const newsletterCount = keys.filter(k => k.startsWith('newsletter:')).length;
    logger.info(`Found ${newsletterCount} newsletter keys`);
    
    // Test getting a newsletter
    if (sampleKeys.length > 0) {
      const sampleKey = sampleKeys[0];
      const value = await redisClient.client.get(sampleKey);
      logger.info(`Sample value for key '${sampleKey}':`, 
        typeof value === 'string' ? value.substring(0, 100) + '...' : value);
    }
    
  } catch (error) {
    logger.error('Error testing Redis connection:', error);
  } finally {
    process.exit(0);
  }
}

testRedisConnection();
