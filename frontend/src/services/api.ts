import axios from 'axios';
import { API_URL } from '@env';
import { Coin, Wallet } from '../types';

// Default to localhost if API_URL is not set
const baseURL = API_URL || 'http://localhost:8080';

console.log('🔧 API URL:', baseURL); // Debug log

const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Add request interceptor for debugging
apiClient.interceptors.request.use(
  (config) => {
    console.log('🔍 Request:', {
      method: config.method,
      url: config.url,
      baseURL: config.baseURL,
      data: config.data,
      headers: config.headers
    });
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
apiClient.interceptors.response.use(
  (response) => {
    console.log('✅ Response:', {
      status: response.status,
      data: response.data,
      headers: response.headers
    });
    return response;
  },
  (error) => {
    console.error('❌ Response Error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      config: error.config
    });
    return Promise.reject(error);
  }
);

interface ErrorDetails {
  message: string;
  status?: number;
  data?: any;
}

interface TradeResponse {
  success: boolean;
  error?: string;
  txHash?: string;
}

interface WalletResponse {
  address: string;
  private_key: string;
}

interface WalletBalance {
  address: string;
  balances?: {
    coin_id: string;
    symbol: string;
    amount: number;
    usd_value: number;
  }[];
  total_usd_value: number;
}

interface WalletBalanceResponse {
  address: string;
  coins: {
    id: string;
    symbol: string;
    balance: number;
    usd_value: number;
  }[];
  total_usd_value: number;
}

interface TradeQuoteResponse {
  estimatedAmount: number;
  exchangeRate: string;
  fee?: {
    total: string;
    spread: string;
    gas: string;
  };
}

// Enhanced error handler
const handleApiError = (error: any): never => {
  const errorDetails: ErrorDetails = {
    message: error.message || 'Unknown error',
    status: error.response?.status,
    data: error.response?.data,
  };

  console.error('API Error:', JSON.stringify(errorDetails, null, 2));

  if (errorDetails?.data?.error?.includes('Transaction')) {
    console.error('Transaction Error Details:', errorDetails.data.error);
  }

  throw errorDetails;
};

interface API {
  executeTrade: (fromCoinId: string, toCoinId: string, amount: string, signedTransaction: string) => Promise<TradeResponse>;
  getAvailableCoins: () => Promise<Coin[]>;
  getCoinById: (coinId: string) => Promise<Coin>;
  getTradeQuote: (fromCoin: string, toCoin: string, amount: string) => Promise<TradeQuoteResponse>;
  getTrades: () => Promise<any[]>;
  createWallet: () => Promise<WalletResponse>;
  getWalletByAddress: (address: string) => Promise<Wallet>;
  getWalletBalance: (address: string) => Promise<WalletBalanceResponse>;
  fetchAvailableCoins: () => Promise<Coin[]>;
  fetchCoinById: (coinId: string) => Promise<Coin>;
  searchCoins: (query: string) => Promise<Coin[]>;
  getPriceHistory: (address: string, timeframe: string) => Promise<any>;
  getCoinMetadata: (address: string) => Promise<any>;
}

const api: API = {
  executeTrade: async (fromCoinId: string, toCoinId: string, amount: string, signedTransaction: string) => {
    console.log('Executing trade:', { fromCoinId, toCoinId, amount });

    try {
      const payload = {
        from_coin_id: fromCoinId,
        to_coin_id: toCoinId,
        amount: amount,
        signed_transaction: signedTransaction,
      };

      console.log('Trade request payload:', JSON.stringify(payload, null, 2));

      const response = await apiClient.post<TradeResponse>('/api/trades/execute', payload);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  getAvailableCoins: async () => {
    try {
      console.log('🔍 Fetching available coins from:', `${baseURL}/api/coins`);
      const response = await apiClient.get<Coin[]>('/api/coins');
      console.log('📦 Response data:', JSON.stringify(response.data, null, 2));
      console.log(`✅ Fetched ${response.data?.length || 0} coins successfully`);
      return response.data;
    } catch (error) {
      console.error('❌ Error getting coins:', error);
      if (axios.isAxiosError(error)) {
        console.error('🔍 Request details:', {
          url: error.config?.url,
          method: error.config?.method,
          baseURL: error.config?.baseURL,
          status: error.response?.status,
          data: error.response?.data
        });
      }
      throw handleApiError(error);
    }
  },

  getCoinById: async (coinId: string) => {
    try {
      const response = await apiClient.get<Coin>(`/api/coins/${coinId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching coin ${coinId}:`, error);
      throw handleApiError(error);
    }
  },

  getTradeQuote: async (fromCoin: string, toCoin: string, amount: string) => {
    try {
      const response = await apiClient.get<TradeQuoteResponse>('/api/trades/quote', {
        params: {
          from_coin_id: fromCoin,
          to_coin_id: toCoin,
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
      const response = await apiClient.get<any[]>('/api/trades');
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  createWallet: async () => {
    try {
      console.log('🔐 Creating new wallet...');
      const response = await apiClient.post<WalletResponse>('/api/wallets');
      console.log('✅ Wallet created successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Error creating wallet:', error);
      throw handleApiError(error);
    }
  },

  getWalletByAddress: async (address: string) => {
    try {
      console.log('🔍 Fetching wallet info for address:', address);
      const response = await apiClient.get<Wallet>(`/api/wallets/${address}`);
      console.log('✅ Wallet info retrieved successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching wallet:', error);
      throw handleApiError(error);
    }
  },

  getWalletBalance: async (address: string) => {
    try {
      console.log('💰 Fetching balance for wallet:', address);
      const response = await apiClient.get<WalletBalance>(`/api/wallets/${address}/balance`);
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
      console.error('❌ Error fetching wallet balance:', error);
      throw handleApiError(error);
    }
  },

  fetchAvailableCoins: async () => {
    try {
      const response = await apiClient.get<Coin[]>('/api/coins');
      return response.data;
    } catch (error) {
      console.error('Error fetching coins:', error);
      throw new Error('Failed to fetch available coins');
    }
  },

  fetchCoinById: async (coinId: string) => {
    try {
      const response = await apiClient.get<Coin>(`/api/coins/${coinId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching coin ${coinId}:`, error);
      throw new Error('Failed to fetch coin details');
    }
  },

  searchCoins: async (query: string) => {
    try {
      const response = await apiClient.get<Coin[]>('/api/coins/search', {
        params: { q: query }
      });
      return response.data;
    } catch (error) {
      console.error('Error searching coins:', error);
      throw new Error('Failed to search coins');
    }
  },

  getPriceHistory: async (address: string, timeframe: string = '1H') => {
    try {
      // Calculate time_from and time_to based on timeframe
      const now = Math.floor(Date.now() / 1000);
      let time_from = now;
      let type = '5m'; // Default interval type
      
      switch (timeframe) {
        case '1H':
          time_from = now - 3600; // 1 hour ago
          type = '5m';
          break;
        case '24H':
          time_from = now - 86400; // 24 hours ago
          type = '15m';
          break;
        case '7D':
          time_from = now - 604800; // 7 days ago
          type = '1h';
          break;
        case '30D':
          time_from = now - 2592000; // 30 days ago
          type = '4h';
          break;
        default:
          time_from = now - 3600; // Default to 1 hour
          type = '5m';
      }

      const response = await apiClient.get('/api/price/history', {
        params: {
          address,
          address_type: 'token',
          type,
          time_from,
          time_to: now
        }
      });
      
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  getCoinMetadata: async (address: string) => {
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