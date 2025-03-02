import axios from 'axios';
import { Platform } from 'react-native';

// Create API client with default configuration
const apiClient = axios.create({
  baseURL: 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': `DankfolioApp/${Platform.OS}`,
  },
  timeout: 30000, // 30 seconds
});

// Enhanced error handler
const handleApiError = (error) => {
  // Construct a detailed error object
  const errorDetails = {
    message: error.message || 'Unknown error',
    status: error.response?.status,
    data: error.response?.data,
  };
  
  // Log detailed information for debugging
  console.error('API Error:', JSON.stringify(errorDetails, null, 2));
  
  // If it's a transaction error, provide more context
  if (errorDetails?.data?.error?.includes('Transaction')) {
    console.error('Transaction Error Details:', errorDetails.data.error);
  }
  
  throw errorDetails;
};

// API methods
const api = {
  executeTrade: async (fromCoinId, toCoinId, amount, signedTransaction) => {
    console.log('Executing trade:', { fromCoinId, toCoinId, amount });
    
    try {
      const payload = {
        from_coin_id: fromCoinId,
        to_coin_id: toCoinId,
        amount: amount,
        signed_transaction: signedTransaction,
      };
      
      // Log the request for debugging
      console.log('Trade request payload:', JSON.stringify(payload, null, 2));

      // Updated endpoint to match backend's expected route
      const response = await apiClient.post('/api/trades/execute', payload);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  getAvailableCoins: async () => {
    try {
      const response = await apiClient.get('/api/v1/coins');
      return response.data;
    } catch (error) {
      console.error('Error getting coins:', error);
      // Fallback to hardcoded coins
      return [
        { id: 'So11111111111111111111111111111111111111112', name: 'SOL', symbol: 'SOL' },
        { id: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', name: 'USD Coin', symbol: 'USDC' },
        { id: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', name: 'USDT', symbol: 'USDT' },
      ];
    }
  },

  getTrades: async () => {
    try {
      const response = await apiClient.get('/api/trades');
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

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
  
  // Mock error response for testing
  mockErrorResponse: {
    error: 'Mock error response',
    code: 500,
    message: 'Internal server error',
  }
};

export default api; 