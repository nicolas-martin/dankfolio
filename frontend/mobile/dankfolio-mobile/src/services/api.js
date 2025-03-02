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
      console.log('Fetching available coins...');
      const response = await apiClient.get('/api/v1/coins');
      console.log(`Fetched ${response.data?.length || 0} coins successfully`);
      return response.data;
    } catch (error) {
      console.error('Error getting coins:', error);
      throw handleApiError(error);
    }
  },

  // Get trade quote for given coin pair and amount
  getTradeQuote: async (fromCoinId, toCoinId, amount) => {
    try {
      console.log('Fetching trade quote:', { fromCoinId, toCoinId, amount });
      
      const response = await apiClient.get('/api/v1/trades/quote', {
        params: {
          from_coin_id: fromCoinId,
          to_coin_id: toCoinId,
          amount: amount,
        }
      });
      
      console.log('Trade quote received:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error getting trade quote:', error);
      throw handleApiError(error);
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
  
  // Get wallet information by address
  getWalletByAddress: async (address) => {
    try {
      console.log('🔍 Fetching wallet info for address:', address);
      const response = await apiClient.get(`/api/v1/wallets/${address}`);
      console.log('✅ Wallet info retrieved successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching wallet:', error.message);
      throw handleApiError(error);
    }
  },
  
  // Get wallet balance by address
  getWalletBalance: async (address) => {
    try {
      console.log('💰 Fetching balance for wallet:', address);
      const response = await apiClient.get(`/api/v1/wallets/${address}/balance`);
      console.log('✅ Wallet balance retrieved successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching wallet balance:', error.message);
      throw handleApiError(error);
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