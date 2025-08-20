import { getRedisClient } from '../lib/redis.js';

async function testHdel(useFirstImpl = true) {
  const redis = getRedisClient();
  const testKey = 'test:hdel:key';
  const field1 = 'field1';
  const field2 = 'field2';
  
  try {
    console.log(`Testing ${useFirstImpl ? 'first' : 'second'} hdel implementation`);
    
    // Set up test data
    await redis.hset(testKey, field1, 'value1', field2, 'value2');
    console.log('Test data set up');
    
    // Get the hdel function we want to test
    let hdelToTest;
    if (useFirstImpl) {
      // First implementation (around line 112)
      hdelToTest = redis.hdel.bind(redis);
    } else {
      // Second implementation (around line 350)
      hdelToTest = async function(key, ...fields) {
        console.log(`[TEST] Using second hdel implementation`);
        console.log(`[TEST] Deleting fields from ${key}:`, fields);
        const result = await this.client.hdel(key, ...fields);
        console.log(`[TEST] Delete result for ${key}:`, result);
        return result;
      }.bind(redis);
    }
    
    // Test hdel
    console.log('\nTesting hdel:');
    const result = await hdelToTest(testKey, field1, field2);
    console.log('hdel result:', result);
    
    // Verify deletion
    const remaining = await redis.hgetall(testKey);
    console.log('Remaining fields:', remaining);
    
    return result === 2; // Should return 2 for 2 fields deleted
  } catch (error) {
    console.error('Test failed:', error);
    return false;
  } finally {
    // Clean up
    await redis.del(testKey);
  }
}

// Run tests
async function runTests() {
  console.log('=== Testing First hdel Implementation ===');
  const firstResult = await testHdel(true);
  console.log('\n=== Testing Second hdel Implementation ===');
  const secondResult = await testHdel(false);
  
  console.log('\n=== Results ===');
  console.log('First implementation:', firstResult ? 'PASSED' : 'FAILED');
  console.log('Second implementation:', secondResult ? 'PASSED' : 'FAILED');
  
  if (firstResult && secondResult) {
    console.log('\nBoth implementations work. Recommend keeping the first one with better logging.');
  } else if (firstResult) {
    console.log('\nOnly the first implementation works. Keep the first one.');
  } else if (secondResult) {
    console.log('\nOnly the second implementation works. Keep the second one.');
  } else {
    console.log('\nBoth implementations failed. Further investigation needed.');
  }
}

runTests().catch(console.error);
