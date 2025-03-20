import axios, { AxiosError } from 'axios';

import { REACT_APP_API_URL } from '@env';

import { Coin, Wallet } from '../types/index'

// Default to localost if API_URL is not set
const baseURL = REACT_APP_API_URL
if (!baseURL) {
	console.error('🚨 No API URL provided for api');
	throw new Error('No API URL provided for api');
}

console.log('🔧 API URL:', baseURL); // Debug log

interface API {
	executeTrade: (payload: TradePayload) => Promise<TradeResponse>;
	getAvailableCoins: () => Promise<Coin[]>;
	getTradeQuote: (fromCoin: string, toCoin: string, amount: string) => Promise<TradeQuoteResponse>;
	getCoinMetadata: (address: string) => Promise<CoinMetadata>;
	getPriceHistory: (address: string, type: string, timeFrom: string, timeTo: string, addressType: string) => Promise<PriceHistoryResponse>;
	getWalletBalance: (address: string) => Promise<WalletBalanceResponse>;
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
			const response = await apiClient.get<Coin[]>('/api/tokens');
			return response.data;
		} catch (error) {
			console.error('❌ Error getting coins:', error);
			throw handleApiError(error as AxiosError);
		}
	},

	getTradeQuote: async (fromCoin: string, toCoin: string, amount: string): Promise<TradeQuoteResponse> => {
		try {
			console.log('🔄 Getting trade quote:', {
				from_coin_id: fromCoin,
				to_coin_id: toCoin,
				amount
			});

			const response = await apiClient.get<TradeQuoteResponse>('/api/trades/quote', {
				params: {
					from_coin_id: fromCoin,
					to_coin_id: toCoin,
					amount
				}
			});

			console.log('✅ Trade quote received:', response.data);
			return response.data;
		} catch (error) {
			console.error('❌ Error getting trade quote:', error);
			throw handleApiError(error as AxiosError);
		}
	},

	getCoinMetadata: async (address: string) => {
		try {
			const response = await apiClient.get<CoinMetadata>(`/api/tokens/${address}/metadata`);
			return response.data;
		} catch (error) {
			console.error('❌ Error getting coin metadata:', error);
			throw handleApiError(error as AxiosError);
		}
	},

	getPriceHistory: async (address: string, type: string, timeFrom: string, timeTo: string, addressType: string) => {
		try {
			const response = await apiClient.get<PriceHistoryResponse>('/api/price/history', {
				params: {
					address,
					type,
					time_from: timeFrom,
					time_to: timeTo,
					address_type: addressType
				}
			});
			return response.data;
		} catch (error) {
			console.error('❌ Error getting price history:', error);
			throw handleApiError(error as AxiosError);
		}
	},

	getWalletBalance: async (address: string): Promise<WalletBalanceResponse> => {
		try {
			console.log('🔍 Fetching wallet balance for address:', address);
			const response = await apiClient.get<WalletBalanceResponse>(`/api/wallets/${address}/balance`);
			return response.data;
		} catch (error) {
			console.error('❌ Error fetching wallet balance:', error);
			throw handleApiError(error as AxiosError);
		}
	}
};

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

export interface CoinMetadata {
	symbol: string;
	name: string;
	decimals: number;
	logo_url: string;
	address: string;
	website?: string;
	twitter?: string;
	telegram?: string;
	discord?: string;
	coingecko_id?: string;
}

export interface PriceHistoryResponse {
	data: {
		items: Array<{
			unixTime: number;
			value: number;
		}>;
	};
	success: boolean;
}

export interface WalletBalanceResponse {
	tokens: TokenInfo[];
}

export interface TokenInfo {
	symbol: string;
	name: string;
	balance: number;
	price: number;
	value: number;
	percentage: number;
	logoURL: string;
	mint: string;
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

export default api;
