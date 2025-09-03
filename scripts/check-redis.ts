import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
const envPath = path.resolve(__dirname, '../.env.local');
console.log(`Loading environment from: ${envPath}`);

// Load environment variables
dotenv.config({ path: envPath });

// Log environment variables (without sensitive data)
console.log('Environment variables loaded:');
console.log(`- KV_REST_API_URL: ${process.env.KV_REST_API_URL ? 'Set' : 'Not set'}`);
console.log(`- KV_REST_API_TOKEN: ${process.env.KV_REST_API_TOKEN ? 'Set' : 'Not set'}`);

// Now import the redis client after environment variables are loaded
console.log('Importing Redis client...');
import { redisClient } from '../lib/redisClient';
import logger from '../utils/logger';

console.log('Redis client imported successfully');

async function checkRedis() {
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

checkRedis();
