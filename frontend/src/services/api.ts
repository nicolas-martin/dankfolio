import axios, { AxiosError } from 'axios';

import { REACT_APP_API_URL } from '@env';

// Default to localost if API_URL is not set
const baseURL = REACT_APP_API_URL
if (!baseURL) {
	console.error('🚨 No API URL provided for api');
	throw new Error('No API URL provided for api');
}

console.log('🔧 API URL:', baseURL); // Debug log

export interface Coin {
	id: string;
	name: string;
	symbol: string;
	decimals: number;
	description: string;
	icon_url: string;
	tags: string[];
	price: number;
	balance?: number;
	daily_volume: number;
	website?: string;
	twitter?: string;
	telegram?: string;
	coingecko_id?: string;
	created_at: string;
	last_updated?: string;
	value?: number;
	percentage?: number;
}

// TokenInfo extends Coin but makes certain fields required for wallet tokens
export interface TokenInfo extends Coin {
	balance: number;   // Required for wallet tokens
	value: number;     // Required for wallet tokens
	percentage: number; // Required for wallet tokens
}

// WalletBalanceResponse matches the backend's WalletBalance struct
export interface WalletBalanceResponse {
tokens: TokenInfo[];
}

interface API {
	executeTrade: (payload: TradePayload) => Promise<TradeResponse>;
	getAvailableCoins: () => Promise<Coin[]>;
	getTradeQuote: (fromCoin: string, toCoin: string, amount: string) => Promise<TradeQuoteResponse>;
	getPriceHistory: (address: string, type: string, timeFrom: string, timeTo: string, addressType: string) => Promise<PriceHistoryResponse>;
	getWalletBalance: (address: string) => Promise<WalletBalanceResponse>;
	getCoinByID: (id: string) => Promise<Coin>;
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
			console.log('✅ Wallet balance received:', response.data); // Log the entire payload
			return response.data;
		} catch (error) {
			console.error('❌ Error fetching wallet balance:', error);
			throw handleApiError(error as AxiosError);
		}
	},

	getCoinByID: async (id: string): Promise<Coin> => {
		console.log('🔄 Fetching coin by ID:', id);
		const response = await apiClient.get<Coin>(`/api/tokens/${id}`);
		return response.data;
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

export interface TradeQuoteResponse {
	estimatedAmount: number;
	exchangeRate: string;
	fee: {
		total: string;
		priceImpactPct: string;
		gas: string;
	};
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
