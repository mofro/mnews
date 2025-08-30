const { redisClient } = require('../lib/redisClient');

async function testSmembers() {
  try {
    console.log('Testing Redis smembers...');
    
    // Test with a key that might exist
    const testKey = 'test:set';
    
    // Add some test data
    await redisClient.client.sadd(testKey, ['test1', 'test2', 'test3']);
    
    // Test smembers
    const members = await redisClient.smembers(testKey);
    console.log(`Members of ${testKey}:`, members);
    
    // Clean up
    await redisClient.client.del(testKey);
    
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Error testing Redis smembers:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

testSmembers();
