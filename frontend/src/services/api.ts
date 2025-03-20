import axios, { AxiosError } from 'axios';
import { API_URL } from '@env';
import { Coin, Wallet } from '../types/index';

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
	(error) => Promise.reject(error)
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

export interface TradeResponse {
	status: string;
	trade_id: string;
	transaction_hash: string;
}

export interface TradePayload {
	from_coin_id: string;
	to_coin_id: string;
	amount: number;
	signed_transaction: string;
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
const handleApiError = (error: AxiosError): never => {
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
	executeTrade: (payload: TradePayload) => Promise<TradeResponse>;
	getAvailableCoins: () => Promise<Coin[]>;
	getTradeQuote: (fromCoin: string, toCoin: string, amount: string) => Promise<TradeQuoteResponse>;
	getCoinMetadata: (coinId: string) => Promise<any>;
	getPriceHistory: (address: string, type: string, timeFrom: string, timeTo: string, addressType: string) => Promise<any>;
}

const api: API = {
	executeTrade: async (payload: TradePayload): Promise<TradeResponse> => {
		try {
			console.log('🔄 Executing trade with payload:', payload);
			const response = await apiClient.post('/api/trades/execute', payload, {
				headers: {
					'X-Debug-Mode': 'true'
				}
			});
			return response.data;
		} catch (error) {
			console.error('❌ Error executing trade:', error);
			throw handleApiError(error as AxiosError);
		}
	},

	getAvailableCoins: async () => {
		try {
			const response = await apiClient.get<Coin[]>('/api/coins');
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
			throw handleApiError(error as AxiosError);
		}
	},

	getCoinMetadata: async (address: string) => {
		try {
			const response = await apiClient.get(`/api/coins/${address}/metadata`);
			return response.data;
		} catch (error) {
			console.error('❌ Error fetching coin metadata:', error);
			throw handleApiError(error as AxiosError);
		}
	},

	getPriceHistory: async (address, type = '1h', timeFrom = "", timeTo = "", addressType = 'token') => {
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
				return response.data.data;
			} else {
				throw new Error('Failed to fetch price history');
			}

		} catch (error) {
			console.error('❌ Error fetching price history:', error);
			throw handleApiError(error as AxiosError);
		}
	}
};

export default api;

