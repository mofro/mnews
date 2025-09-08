import { redisClient } from '../lib/redisClient.js';
import logger from '../utils/logger.js';

async function testRedisConnection() {
  try {
    logger.info('Testing Redis connection...');
    
    // Test basic ping
    const pingResult = await redisClient.testConnection();
    logger.info('Ping result:', pingResult);
    
    // Test getting a key
    const testKey = 'test:connection';
    await redisClient.client.set(testKey, 'test-value');
    const value = await redisClient.client.get(testKey);
    logger.info(`Test key "${testKey}" value:`, value);
    
    // Test listing newsletter keys
    const newsletterKeys = await redisClient.client.keys('newsletter:*');
    logger.info(`Found ${newsletterKeys.length} newsletter keys`);
    
    // Get some sample data if available
    if (newsletterKeys.length > 0) {
      const sampleKey = newsletterKeys[0];
      const sampleData = await redisClient.client.get(sampleKey);
      const sampleText = typeof sampleData === 'string' ? sampleData.substring(0, 100) + '...' : 'No data or invalid format';
      logger.info(`Sample newsletter data (${sampleKey}):`, sampleText);
    }
    
    logger.info('Redis connection test completed successfully');
  } catch (error) {
    logger.error('Redis connection test failed:', error);
  } finally {
    // Close the Redis connection
    process.exit(0);
  }
}

testRedisConnection();
