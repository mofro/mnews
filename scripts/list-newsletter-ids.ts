import { getRedisClient } from '../lib/redis';
import logger from '../utils/logger';

async function listNewsletterIds() {
  try {
    const redis = getRedisClient();
    
    // List all newsletter IDs (they should be stored in a list called 'newsletter_ids')
    const ids = await redis.lrange('newsletter_ids', 0, -1);
    
    if (ids.length === 0) {
      logger.info('No newsletter IDs found in the database.');
      return;
    }
    
    logger.info('Newsletter IDs:');
    logger.info(ids);
    
    // If you want to see the first newsletter's data as an example
    if (ids.length > 0) {
      logger.info('\nExample newsletter data:');
      const exampleId = ids[0];
      const key = `newsletter:${exampleId}`;
      const data = await redis.get(key);
      logger.info(JSON.stringify(data, null, 2));
    }
    
  } catch (error) {
    logger.error('Error listing newsletter IDs:', error);
  } finally {
    // Close the Redis connection
    process.exit(0);
  }
}

listNewsletterIds();
