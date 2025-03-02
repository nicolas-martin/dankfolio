/**
 * Transaction tracker utility for monitoring transaction confirmations
 * 
 * This utility helps track the status of Solana transactions and provides
 * callbacks for success and error states.
 */

import { Connection } from '@solana/web3.js';

// Default Solana cluster endpoint
const DEFAULT_ENDPOINT = 'https://api.mainnet-beta.solana.com';

/**
 * Checks if a transaction has been confirmed on the Solana network
 * 
 * @param {string} signature - The transaction signature to monitor
 * @param {Function} onSuccess - Callback for successful confirmation
 * @param {Function} onError - Callback for failed transaction
 * @param {Object} options - Additional options
 * @param {string} options.endpoint - Custom RPC endpoint (defaults to mainnet)
 * @param {number} options.maxAttempts - Maximum number of confirmation checks (default: 30)
 * @param {number} options.interval - Time between checks in ms (default: 2000)
 * @param {number} options.confirmationLevel - Number of confirmations to wait for (default: 1)
 * @returns {Object} - Methods to control the confirmation checking process
 */
export const trackTransaction = (
  signature,
  onSuccess,
  onError,
  options = {}
) => {
  // Set default options
  const endpoint = options.endpoint || DEFAULT_ENDPOINT;
  const maxAttempts = options.maxAttempts || 30; // 1 minute with 2s interval
  const interval = options.interval || 2000; // 2 seconds
  const confirmationLevel = options.confirmationLevel || 1;
  
  // Create connection to Solana network
  const connection = new Connection(endpoint, 'confirmed');
  
  let attempts = 0;
  let timer = null;
  let isTracking = true;
  
  console.log(`🔍 Starting to track transaction: ${signature}`);
  
  // Function to check transaction status
  const checkTransaction = async () => {
    if (!isTracking) return;
    
    try {
      attempts++;
      console.log(`📡 Checking transaction (attempt ${attempts}/${maxAttempts}): ${signature}`);
      
      // Get transaction confirmation status
      const status = await connection.getSignatureStatus(signature, {
        searchTransactionHistory: true,
      });
      
      // If no status yet, continue checking
      if (!status || !status.value) {
        console.log(`⏳ No status available yet for: ${signature}`);
        scheduleNextCheck();
        return;
      }
      
      // Check if transaction was successful
      if (status.value.err) {
        console.error(`❌ Transaction failed: ${signature}`, status.value.err);
        isTracking = false;
        onError && onError({
          signature,
          error: status.value.err,
          message: 'Transaction failed on the Solana network'
        });
        return;
      }
      
      // Check confirmation level
      const confirmations = status.value.confirmations;
      if (confirmations !== null && confirmations >= confirmationLevel) {
        console.log(`✅ Transaction confirmed (${confirmations} confirmations): ${signature}`);
        
        // Get transaction details
        const transaction = await connection.getTransaction(signature, {
          maxSupportedTransactionVersion: 0,
        });
        
        isTracking = false;
        onSuccess && onSuccess({
          signature,
          confirmations,
          transaction,
          status: status.value,
          blockTime: transaction?.blockTime || null,
        });
        return;
      }
      
      // If we got here, transaction is pending but not yet confirmed enough
      console.log(`⏳ Transaction pending (${confirmations === null ? 'unknown' : confirmations} confirmations): ${signature}`);
      scheduleNextCheck();
      
    } catch (error) {
      console.error(`❌ Error checking transaction: ${signature}`, error);
      
      // Only call onError if we've exceeded max attempts
      if (attempts >= maxAttempts) {
        isTracking = false;
        onError && onError({
          signature,
          error,
          message: 'Failed to confirm transaction status after multiple attempts'
        });
        return;
      }
      
      // Otherwise schedule another attempt
      scheduleNextCheck();
    }
  };
  
  // Schedule the next check
  const scheduleNextCheck = () => {
    if (attempts >= maxAttempts || !isTracking) {
      console.log(`⚠️ Reached maximum attempts (${maxAttempts}) for: ${signature}`);
      isTracking = false;
      onError && onError({
        signature,
        error: new Error('Timeout waiting for confirmation'),
        message: 'Transaction confirmation timed out'
      });
      return;
    }
    
    // Schedule next check
    timer = setTimeout(checkTransaction, interval);
  };
  
  // Start the initial check
  checkTransaction();
  
  // Return methods to control the tracking
  return {
    // Stop tracking the transaction
    stop: () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      isTracking = false;
      console.log(`🛑 Stopped tracking transaction: ${signature}`);
    },
    
    // Force an immediate check
    checkNow: () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (isTracking) {
        checkTransaction();
      }
    },
    
    // Get current tracking status
    status: () => ({
      isTracking,
      attempts,
      maxAttempts
    })
  };
};

/**
 * A utility to create a promise-based transaction tracker
 * 
 * @param {string} signature - The transaction signature to monitor
 * @param {Object} options - Options passed to trackTransaction
 * @returns {Promise<Object>} - Resolves with transaction details or rejects with error
 */
export const waitForTransaction = (signature, options = {}) => {
  return new Promise((resolve, reject) => {
    trackTransaction(
      signature,
      (result) => resolve(result),
      (error) => reject(error),
      options
    );
  });
};

export default {
  trackTransaction,
  waitForTransaction
}; 