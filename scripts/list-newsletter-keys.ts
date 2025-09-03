import { Redis } from '@upstash/redis';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Check if environment variables are set
const url = process.env.KV_REST_API_URL;
const token = process.env.KV_REST_API_TOKEN;

if (!url || !token) {
  console.error('Error: Missing required environment variables');
  process.exit(1);
}

// Create Redis client
const redis = new Redis({
  url,
  token,
});

async function listNewsletterKeys() {
  try {
    console.log('Testing Redis connection...');
    const ping = await redis.ping();
    console.log(`Redis ping response: ${ping}`);
    
    console.log('\nListing all keys...');
    const allKeys = await redis.keys('*');
    console.log(`Total keys in Redis: ${allKeys.length}`);
    
    if (allKeys.length === 0) {
      console.log('No keys found in Redis. Checking if we can write a test key...');
      const testKey = 'test:connection';
      await redis.set(testKey, 'test-value');
      const testValue = await redis.get(testKey);
      console.log(`Test key '${testKey}' value: ${testValue}`);
      await redis.del(testKey);
      
      if (testValue !== 'test-value') {
        console.error('Error: Could not read back test value from Redis');
        return;
      }
      
      console.log('Successfully wrote and read a test key. Your Redis connection is working but no newsletter data was found.');
      return;
    }
    
    // Filter for newsletter keys
    const newsletterKeys = allKeys.filter(key => key.startsWith('newsletter:'));
    console.log(`Found ${newsletterKeys.length} newsletter keys`);
    
    // Group by key type
    const metaKeys = newsletterKeys.filter(k => k.includes(':meta:'));
    const contentKeys = newsletterKeys.filter(k => k.includes(':content:'));
    const oldKeys = newsletterKeys.filter(k => !k.includes(':meta:') && !k.includes(':content:'));
    
    console.log(`\nKey Types:`);
    console.log(`- Metadata keys: ${metaKeys.length}`);
    console.log(`- Content keys: ${contentKeys.length}`);
    console.log(`- Old format keys: ${oldKeys.length}`);
    
    // Show sample of each key type
    console.log('\nSample old format keys (first 5):');
    console.log(oldKeys.slice(0, 5));
    
    if (oldKeys.length > 0) {
      console.log('\nSample old format value:');
      const sampleKey = oldKeys[0];
      const value = await redis.get(sampleKey);
      console.log(JSON.stringify(value, null, 2).substring(0, 500) + '...');
    }
    
    if (metaKeys.length > 0) {
      console.log('\nSample metadata key:');
      const sampleKey = metaKeys[0];
      console.log(`Key: ${sampleKey}`);
      const value = await redis.hgetall(sampleKey);
      console.log(JSON.stringify(value, null, 2));
    }
    
  } catch (error) {
    console.error('Error listing newsletter keys:', error);
  } finally {
    process.exit(0);
  }
}

listNewsletterKeys();
