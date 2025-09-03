import { redisClient } from '../lib/redisClient';
import logger from '../utils/logger';

async function testConnection() {
  try {
    logger.info('Testing Redis connection...');
    
    // Test basic ping
    const pingResult = await redisClient.testConnection();
    if (pingResult) {
      logger.info('✅ Redis connection successful!');
    } else {
      logger.error('❌ Redis connection failed');
    }
    
    // Test setting and getting a value
    const testKey = 'test:connection';
    const testValue = 'test-value-' + Date.now();
    
    await redisClient.client.set(testKey, testValue);
    const retrievedValue = await redisClient.client.get(testKey);
    
    if (retrievedValue === testValue) {
      logger.info('✅ Redis set/get test successful!');
    } else {
      logger.error(`❌ Redis set/get test failed. Expected: ${testValue}, Got: ${retrievedValue}`);
    }
    
    // Clean up
    await redisClient.client.del(testKey);
    
  } catch (error) {
    logger.error('❌ Error testing Redis connection:', error);
  } finally {
    // Don't close the connection as it's a singleton
    process.exit(0);
  }
}

testConnection();
