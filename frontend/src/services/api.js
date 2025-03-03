import axios from 'axios';
import { Platform } from 'react-native';

// Create API client with default configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

const apiClient = axios.create({
        baseURL: API_BASE_URL,
        headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
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
                        console.log(`Fetching details for coin ID: ${coinId}`);
                        const response = await apiClient.get(`/api/coins/${coinId}`);
                        console.log('Coin details fetched successfully:', response.data.symbol);
                        return response.data;
                } catch (error) {
                        console.error(`Error fetching coin ${coinId}:`, error);
                        throw handleApiError(error);
                }
        },

        getTradeQuote: async (fromCoinId, toCoinId, amount) => {
                try {
                        console.log('Fetching trade quote:', { fromCoinId, toCoinId, amount });

                        const response = await apiClient.get('/api/trades/quote', {
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
        }
};

export default api; 
