import axios from 'axios';
import { Platform } from 'react-native';

// Environment configuration
const DEBUG_MODE = __DEV__; // Enable debug mode in development
const API_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 2; // Maximum number of retries for failed requests

// Create API client with default configuration
const apiClient = axios.create({
//   baseURL: 'https://api.dankfolio.com', // Replace with your API URL
  baseURL: 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': `DankfolioApp/${Platform.OS}`, // Add platform info to requests
  },
  timeout: API_TIMEOUT,
});

// Add request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    if (DEBUG_MODE) {
      console.log(`🚀 API Request: ${config.method.toUpperCase()} ${config.url}`);
      if (config.data && DEBUG_MODE) {
        // Mask sensitive data for logging
        const maskedData = { ...config.data };
        if (maskedData.signed_transaction) {
          maskedData.signed_transaction = `${maskedData.signed_transaction.substring(0, 10)}...`;
        }
        if (maskedData.privateKey) {
          maskedData.privateKey = '***MASKED***';
        }
        console.log('Request Data:', maskedData);
      }
    }
    // Add timestamp to track request duration
    config.metadata = { startTime: new Date() };
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for logging
apiClient.interceptors.response.use(
  (response) => {
    // Calculate request duration
    const duration = response.config.metadata ? 
      new Date() - response.config.metadata.startTime : 
      0;
    
    if (DEBUG_MODE) {
      console.log(`✅ API Response: ${response.status} ${response.config.url} (${duration}ms)`);
    }
    return response;
  },
  async (error) => {
    // Calculate request duration even for errors
    const duration = error.config?.metadata ? 
      new Date() - error.config.metadata.startTime : 
      0;
    
    // Enhanced error logging
    console.error(`❌ API Error: ${error.config?.url} (${duration}ms)`);
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(`Status: ${error.response.status}`);
      console.error('Response Data:', error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received - likely a network issue');
    } else {
      // Something happened in setting up the request
      console.error('Request setup error:', error.message);
    }
    
    // Implement retry logic for network errors
    const config = error.config;
    if (
      !config || 
      !MAX_RETRIES || 
      config._retryCount >= MAX_RETRIES || 
      error.response?.status === 400 || // Don't retry bad requests
      error.response?.status === 401 || // Don't retry unauthorized
      error.response?.status === 403 // Don't retry forbidden
    ) {
      return Promise.reject(error);
    }

    // Set retry count
    config._retryCount = config._retryCount || 0;
    config._retryCount += 1;
    
    console.log(`🔄 Retrying request (${config._retryCount}/${MAX_RETRIES}): ${config.url}`);
    
    // Create new promise for retry
    return new Promise((resolve) => {
      // Add exponential backoff delay
      const backoffDelay = config._retryCount * 1000; // 1s, 2s, etc.
      setTimeout(() => resolve(apiClient(config)), backoffDelay);
    });
  }
);

// API methods
const api = {
  /**
   * Execute a trade with a signed transaction
   * @param {string} fromCoinId - Source token mint address
   * @param {string} toCoinId - Destination token mint address
   * @param {number} amount - Amount to trade
   * @param {string} signedTransaction - Base64 encoded signed transaction
   * @returns {Promise<Object>} Trade result
   */
  executeTrade: async (fromCoinId, toCoinId, amount, signedTransaction) => {
    console.log(`🔄 Starting trade execution: ${amount} from ${fromCoinId.substring(0, 8)}... to ${toCoinId.substring(0, 8)}...`);
    
    try {
      if (!signedTransaction) {
        throw new Error('Signed transaction is required');
      }
      
      if (!fromCoinId || !toCoinId) {
        throw new Error('Source and destination coin IDs are required');
      }
      
      const payload = {
        from_coin_id: fromCoinId,
        to_coin_id: toCoinId,
        amount: amount,
        signed_transaction: signedTransaction,
        client_timestamp: new Date().toISOString(),
      };
      
      // Log transaction attempt
      console.log(`📝 Submitting trade: ${amount} ${fromCoinId.substring(0, 8)}... → ${toCoinId.substring(0, 8)}...`);
      
      const response = await apiClient.post('/api/v1/trades', payload);
      
      console.log(`✅ Trade executed successfully! Transaction ID: ${response.data.transaction_id || 'N/A'}`);
      return response.data;
    } catch (error) {
      // Enhanced error handling with specific error types
      let enhancedError = error;
      
      if (error.response?.status === 400) {
        enhancedError.message = `Trade validation failed: ${error.response.data.error || 'Invalid request'}`;
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        enhancedError.message = 'Authentication error: Please log in again';
      } else if (error.response?.status === 500) {
        enhancedError.message = 'Server error processing the trade. Please try again later.';
      } else if (!error.response) {
        enhancedError.message = 'Network error: Please check your connection and try again';
      }
      
      console.error('❌ Trade execution failed:', enhancedError.message);
      throw enhancedError;
    }
  },

  /**
   * Get available coins for trading
   * @returns {Promise<Array>} List of available coins
   */
  getAvailableCoins: async () => {
    try {
      console.log('📋 Fetching available coins...');
      const response = await apiClient.get('/api/v1/coins');
      console.log(`✅ Retrieved ${response.data.length} coins`);
      return response.data;
    } catch (error) {
      console.error('❌ Error getting available coins:', error.message);
      // For demo, return some hardcoded coins if the endpoint is not available
      console.log('⚠️ Falling back to hardcoded coin list');
      return [
        { id: 'So11111111111111111111111111111111111111112', name: 'SOL', symbol: 'SOL' },
        { id: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', name: 'USD Coin', symbol: 'USDC' },
        { id: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', name: 'USDT', symbol: 'USDT' },
        { id: 'MEME123456789', name: 'Doge Coin', symbol: 'DOGE' },
        { id: 'MEME987654321', name: 'Pepe Coin', symbol: 'PEPE' }
      ];
    }
  },

  /**
   * Get a list of trades
   * @param {Object} filters - Optional filters like date range, status, etc.
   * @returns {Promise<Array>} List of trades
   */
  getTrades: async (filters = {}) => {
    try {
      console.log('📋 Fetching trade history...');
      // Add query parameters for filters if provided
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value);
        }
      });
      
      const queryString = params.toString();
      const url = `/api/v1/trades${queryString ? `?${queryString}` : ''}`;
      
      const response = await apiClient.get(url);
      console.log(`✅ Retrieved ${response.data.length} trades`);
      return response.data;
    } catch (error) {
      console.error('❌ Error getting trades:', error.message);
      throw error;
    }
  },

  /**
   * Create a new wallet
   * @returns {Promise<Object>} New wallet details
   */
  createWallet: async () => {
    try {
      console.log('🔐 Creating new wallet...');
      const response = await apiClient.post('/api/v1/wallets');
      console.log('✅ Wallet created successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Error creating wallet:', error.message);
      throw error;
    }
  },
  
  /**
   * Get current network stats (prices, transaction fees, etc.)
   * @returns {Promise<Object>} Network statistics
   */
  getNetworkStatus: async () => {
    try {
      console.log('📊 Fetching network stats...');
      const response = await apiClient.get('/api/v1/network/stats');
      return response.data;
    } catch (error) {
      console.error('❌ Error getting network stats:', error.message);
      // Return default stats as fallback
      return {
        solPrice: 0,
        averageFee: 0.000005,
        networkStatus: 'unknown'
      };
    }
  }
};

export default api; 