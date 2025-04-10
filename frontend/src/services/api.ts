import axios, { AxiosError } from 'axios';

import { REACT_APP_API_URL } from '@env';

const baseURL = REACT_APP_API_URL;
if (!baseURL) {
	throw new Error('No API URL provided for api');
}

const apiClient = axios.create({
	baseURL,
	headers: {
		'Content-Type': 'application/json',
		'Accept': 'application/json',
	},
	timeout: 30000,
});

// Add request interceptor for debugging
apiClient.interceptors.request.use(
	(config) => {
		console.log('🔍 Request:', {
			method: config.method,
			url: config.url,
			baseURL: config.baseURL,
			data: config.data,
			params: config.params,
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

export interface Coin {
	id: string;
	name: string;
	symbol: string;
	decimals: number;
	description: string;
	icon_url: string;
	tags: string[];
	price: number;
	daily_volume: number;
	website?: string;
	twitter?: string;
	telegram?: string;
	coingecko_id?: string;
	created_at: string;
	last_updated?: string;
}

export interface balance {
	id: string;
	amount: number;
}

export interface WalletBalanceResponse {
	balances: balance[];
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

interface API {
	submitTrade: (payload: TradePayload) => Promise<SubmitTradeResponse>; // Renamed and updated response type
	getTradeStatus: (txHash: string) => Promise<TradeStatusResponse>; // Added new status check function
	getAvailableCoins: (trendingOnly?: boolean) => Promise<Coin[]>;
	getTradeQuote: (fromCoin: string, toCoin: string, amount: string) => Promise<TradeQuoteResponse>;
	getPriceHistory: (address: string, type: string, timeFrom: string, timeTo: string, addressType: string) => Promise<PriceHistoryResponse>;
	getWalletBalance: (address: string) => Promise<WalletBalanceResponse>;
	getCoinByID: (id: string) => Promise<Coin>;
	getTokenPrices: (tokenIds: string[]) => Promise<Record<string, number>>;
}

const api: API = {
	submitTrade: async (payload: TradePayload): Promise<SubmitTradeResponse> => { // Renamed function
		try {
			const response = await apiClient.post('/api/trades/submit', payload, { // Updated endpoint
				headers: {
					'X-Debug-Mode': 'false'
				}
			});
			return response.data;
		} catch (error) {
			throw handleApiError(error as AxiosError);
		}
	},

	getAvailableCoins: async (trendingOnly?: boolean) => {
		try {
			const params = trendingOnly ? { trending: 'true' } : {};
			const response = await apiClient.get<Coin[]>('/api/tokens', { params });
			return response.data;
		} catch (error) {
			throw handleApiError(error as AxiosError);
		}
	},

	getTradeQuote: async (fromCoin: string, toCoin: string, amount: string): Promise<TradeQuoteResponse> => {
		try {
			const response = await apiClient.get<TradeQuoteResponse>('/api/trades/quote', {
				params: {
					from_coin_id: fromCoin,
					to_coin_id: toCoin,
					amount
				}
			});
			return response.data;
		} catch (error) {
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
			throw handleApiError(error as AxiosError);
		}
	},

	getWalletBalance: async (address: string): Promise<WalletBalanceResponse> => {
		try {
			const response = await apiClient.get<WalletBalanceResponse>(`/api/wallets/${address}/balance`);
			return response.data;
		} catch (error) {
			throw handleApiError(error as AxiosError);
		}
	},

	getCoinByID: async (id: string): Promise<Coin> => {
		try {
			const response = await apiClient.get<Coin>(`/api/tokens/${id}`);
			return response.data;
		} catch (error) {
			throw handleApiError(error as AxiosError);
		}
	},

	getTokenPrices: async (tokenIds: string[]): Promise<Record<string, number>> => {
		try {
			const response = await apiClient.get<Record<string, number>>('/api/tokens/prices', {
				params: {
					ids: tokenIds.join(',')
				}
			});
			return response.data;
		} catch (error) {
			throw handleApiError(error as AxiosError);
		}
	},

	getTradeStatus: async (txHash: string): Promise<TradeStatusResponse> => { // Added new function
		try {
			const response = await apiClient.get<TradeStatusResponse>(`/api/trades/status/${txHash}`);
			return response.data;
		} catch (error) {
			throw handleApiError(error as AxiosError);
		}
	},
};

interface ErrorDetails {
	message: string;
	status?: number;
	data?: any;
}

// Renamed to reflect the submit action's response
export interface SubmitTradeResponse {
	trade_id?: string; // Optional as per backend handler
	transaction_hash: string;
}

// New interface for the status endpoint response
export interface TradeStatusResponse {
	transaction_hash: string;
	status: string; // e.g., "Pending", "Confirmed", "Finalized"
	confirmations: number;
	finalized: boolean;
	error?: any; // Include error details if the transaction failed
}

export interface TradePayload {
	from_coin_id: string;
	to_coin_id: string;
	amount: number;
	signed_transaction: string;
}

export interface TradeQuoteResponse {
	estimatedAmount: string;
	exchangeRate: string;
	fee: string;
	priceImpact: string;
	routePlan: string[];
	inputMint: string;
	outputMint: string;
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
