/**
 * Test script for transaction tracker utility
 * 
 * Usage: node testTransactionTracker.js <transaction_signature>
 * 
 * Example:
 * node testTransactionTracker.js 4iBrew1uMwTWaS2HR7i7ZGTWVpTXHM5sQsM7idEEbg6G3eknBiLQvkDpWMQg9qKXkpP5iF6yaYJPuhVvbsCrLSGS3
 */

const { trackTransaction, waitForTransaction } = require('../utils/transactionTracker');

// Get transaction signature from command line args
const signature = process.argv[2];

if (!signature) {
  console.error('❌ Error: Please provide a transaction signature as an argument');
  console.log('Usage: node testTransactionTracker.js <transaction_signature>');
  process.exit(1);
}

console.log('🔍 Testing transaction tracker with signature:', signature);

// Test callback-based tracking
console.log('🔄 Testing callback-based tracking...');
const tracker = trackTransaction(
  signature,
  (result) => {
    console.log('✅ Transaction confirmed:', result);
    console.log('Confirmations:', result.confirmations);
    console.log('Block time:', result.blockTime ? new Date(result.blockTime * 1000).toLocaleString() : 'Unknown');
    
    // Test promise-based tracking after callback tracking completes
    testPromiseBasedTracking();
  },
  (error) => {
    console.error('❌ Transaction tracking failed:', error);
    
    // Test promise-based tracking after callback tracking fails
    testPromiseBasedTracking();
  },
  {
    maxAttempts: 5, // Reduced for testing
    interval: 1000  // Check every second for testing
  }
);

// Show tracking status every 2 seconds
const statusInterval = setInterval(() => {
  const status = tracker.status();
  console.log(`🔄 Tracking status: ${status.attempts}/${status.maxAttempts} attempts, isTracking: ${status.isTracking}`);
  
  if (!status.isTracking) {
    clearInterval(statusInterval);
  }
}, 2000);

// Test promise-based tracking
async function testPromiseBasedTracking() {
  console.log('\n🔄 Testing promise-based tracking...');
  
  try {
    const result = await waitForTransaction(signature, {
      maxAttempts: 3,
      interval: 1000
    });
    
    console.log('✅ Promise resolved with result:', result);
    process.exit(0);
  } catch (error) {
    console.error('❌ Promise rejected with error:', error);
    process.exit(1);
  }
}

// Handle interruptions
process.on('SIGINT', () => {
  console.log('🛑 Stopping transaction tracker...');
  tracker.stop();
  clearInterval(statusInterval);
  process.exit(0);
}); 