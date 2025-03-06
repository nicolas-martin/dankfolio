import axios from 'axios';
import { REACT_APP_API_URL } from '@env'

const apiClient = axios.create({
  baseURL: REACT_APP_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

apiClient.interceptors.request.use(
  (config) => {
    console.log('🔍 Request:', config.method, config.url, config.data);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

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

      const response = await apiClient.post('/api/trades/execute', payload);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  getAvailableCoins: async () => {
    try {
      console.log('Fetching available coins...');
      const response = await apiClient.get('/api/coins');
      console.log(`Fetched ${response.data?.length || 0} coins successfully`);
      return response.data;
    } catch (error) {
      console.error('Error getting coins:', error);
      throw handleApiError(error);
    }
  },

  getCoinById: async (coinId) => {
    try {
      const response = await apiClient.get(`/api/coins/${coinId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching coin ${coinId}:`, error);
      throw handleApiError(error);
    }
  },

  getTradeQuote: async (fromCoinId, toCoinId, amount) => {
    try {
      const response = await apiClient.get('/api/trades/quote', {
        params: {
          from_coin_id: fromCoinId,
          to_coin_id: toCoinId,
          amount: amount,
        }
      });

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
      const response = await apiClient.post('/api/wallets');
      console.log('✅ Wallet created successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Error creating wallet:', error.message);
      throw error;
    }
  },

  getWalletByAddress: async (address) => {
    try {
      console.log('🔍 Fetching wallet info for address:', address);
      const response = await apiClient.get(`/api/wallets/${address}`);
      console.log('✅ Wallet info retrieved successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching wallet:', error.message);
      throw handleApiError(error);
    }
  },

  getWalletBalance: async (address) => {
    try {
      console.log('💰 Fetching balance for wallet:', address);
      const response = await apiClient.get(`/api/wallets/${address}/balance`);
      console.log('✅ Wallet balance retrieved successfully');

      // Transform the backend response to match what the frontend expects
      const data = response.data;
      return {
        address: data.address,
        coins: data.balances ? data.balances.map(bal => ({
          id: bal.coin_id,
          symbol: bal.symbol,
          balance: bal.amount || 0,
          usd_value: bal.usd_value || 0
        })) : [],
        total_usd_value: data.total_usd_value || 0
      };
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
  },

  fetchAvailableCoins: async () => {
    try {
      const response = await apiClient.get('/api/coins');
      return response.data;
    } catch (error) {
      console.error('Error fetching coins:', error);
      throw new Error('Failed to fetch available coins');
    }
  },

  fetchCoinById: async (coinId) => {
    try {
      const response = await apiClient.get(`/api/coins/${coinId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching coin ${coinId}:`, error);
      throw new Error('Failed to fetch coin details');
    }
  },

  searchCoins: async (query) => {
    try {
      const response = await apiClient.get('/api/coins/search', {
        params: { q: query }
      });
      return response.data;
    } catch (error) {
      console.error('Error searching coins:', error);
      throw new Error('Failed to search coins');
    }
  },

  getPriceHistory: async (address, type = '1h', timeFrom = null, timeTo = null, addressType = 'token') => {
    try {
      const params = {
        address,
        address_type: addressType,
        type,
        time_from: timeFrom,
        time_to: timeTo
      };

      // Validate required parameters
      if (!address || !timeFrom || !timeTo) {
        throw new Error('Missing required parameters: address, type, time_from, and time_to are required');
      }

      console.log('🔍 Fetching price history with params:', JSON.stringify(params, null, 2));

      const response = await apiClient.get('/api/price/history', { params });

      if (response.status === 200) {
      console.log('✅ Successfully processed price history data');
        return response.data.data;
      } else {
        throw new Error('Failed to fetch price history');
      }

    } catch (error) {
      console.error('❌ Error fetching price history:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          params: error.config?.params
        }
      });
      throw handleApiError(error);
    }
  },

  getCoinMetadata: async (address) => {
    try {
      console.log('🔍 Fetching metadata for coin:', address);
      const response = await apiClient.get(`/api/coins/${address}/metadata`);
      console.log('✅ Successfully fetched coin metadata');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching coin metadata:', error);
      throw handleApiError(error);
    }
  }
};

export default api; 
