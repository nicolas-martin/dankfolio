if (!process.env.REACT_APP_API_URL) {
	throw new Error('REACT_APP_API_URL environment variable is required');
}

const API_URL: string = process.env.REACT_APP_API_URL;
const baseURL = API_URL;

const defaultHeaders = {
	'Content-Type': 'application/json',
	'Accept': 'application/json',
	'X-Debug-Mode': 'true',
};

// Debug function to log requests
const logRequest = (method: string, url: string, data?: any, params?: any, headers?: any) => {
	console.log('🔍 Request:', {
		method,
		url,
		baseURL,
		data,
		params,
		headers
	});
};

// Debug function to log responses
const logResponse = (status: number, data: any, headers: any) => {
	console.log('✅ Response:', {
		status,
		data,
		headers
	});
};

// Debug function to log errors
const logError = (message: string, status?: number, data?: any, config?: any) => {
	console.error('❌ Response Error:', {
		message,
		status,
		data,
		config
	});
};

const handleFetchError = async (response: Response): Promise<any> => {
	const errorDetails: ErrorDetails = {
		message: response.statusText || 'Unknown error',
		status: response.status,
	};

	try {
		errorDetails.data = await response.json();
	} catch (e) {
		errorDetails.data = await response.text();
	}

	logError(errorDetails.message, errorDetails.status, errorDetails.data);
	throw errorDetails;
};

const apiFetch = async (url: string, method: string = 'GET', data: any = null, params: any = null, customHeaders: any = {}) => {
	const headers = { ...defaultHeaders, ...customHeaders };
	const fullURL = baseURL + url;

	logRequest(method, url, data, params, headers);

	let queryString = '';
	if (params && method === 'GET') {
		queryString = '?' + new URLSearchParams(params).toString();
	}

	const options: RequestInit = {
		method,
		headers,
		body: data ? JSON.stringify(data) : null,
	};

	try {
		const response = await fetch(fullURL + queryString, options);

		logResponse(response.status, response.statusText, response.headers);

		if (!response.ok) {
			return handleFetchError(response);
		}

		try {
			const responseData = await response.json();
			return responseData;
		} catch (e) {
			return response.text();
		}

	} catch (error: any) {
		logError(error.message);
		throw { message: error.message };
	}
};

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

export interface TokenTransferPrepareRequest {
	fromAddress: string;
	toAddress: string;
	tokenMint?: string; // Optional, empty for SOL
	amount: number;
}

export interface TokenTransferPrepareResponse {
	unsignedTransaction: string;
}

export interface TokenTransferSubmitRequest {
	signedTransaction: string;
}

export interface TokenTransferResponse {
	transactionHash: string;
}

interface API {
	submitSwap: (payload: TradePayload) => Promise<SubmitTradeResponse>; // Renamed and updated response type
	getSwapStatus: (txHash: string) => Promise<TradeStatusResponse>; // Added new status check function
	getAvailableCoins: (trendingOnly?: boolean) => Promise<Coin[]>;
	getTradeQuote: (fromCoin: string, toCoin: string, amount: string) => Promise<TradeQuoteResponse>;
	getPriceHistory: (address: string, type: string, timeFrom: string, timeTo: string, addressType: string) => Promise<PriceHistoryResponse>;
	getWalletBalance: (address: string) => Promise<WalletBalanceResponse>;
	getCoinByID: (id: string) => Promise<Coin>;
	getTokenPrices: (tokenIds: string[]) => Promise<Record<string, number>>;
	prepareTokenTransfer: (payload: TokenTransferPrepareRequest) => Promise<TokenTransferPrepareResponse>;
	submitTokenTransfer: (payload: TokenTransferSubmitRequest) => Promise<TokenTransferResponse>;
}

const api: API = {
	submitSwap: async (payload: TradePayload): Promise<SubmitTradeResponse> => { // Renamed function
		return apiFetch('/api/trades/submit', 'POST', payload);
	},

	getAvailableCoins: async (trendingOnly?: boolean) => {
		const params = trendingOnly ? { trending: 'true' } : {};
		return apiFetch('/api/tokens', 'GET', null, params);
	},

	getTradeQuote: async (fromCoin: string, toCoin: string, amount: string): Promise<TradeQuoteResponse> => {
		const params = {
			from_coin_id: fromCoin,
			to_coin_id: toCoin,
			amount
		};
		return apiFetch('/api/trades/quote', 'GET', null, params);
	},

	getPriceHistory: async (address: string, type: string, timeFrom: string, timeTo: string, addressType: string) => {
		const params = {
			address,
			type,
			time_from: timeFrom,
			time_to: timeTo,
			address_type: addressType
		};
		return apiFetch('/api/price/history', 'GET', null, params);
	},

	getWalletBalance: async (address: string): Promise<WalletBalanceResponse> => {
		return apiFetch(`/api/wallets/${address}/balance`, 'GET');
	},

	getCoinByID: async (id: string): Promise<Coin> => {
		return apiFetch(`/api/tokens/${id}`, 'GET');
	},

	getTokenPrices: async (tokenIds: string[]): Promise<Record<string, number>> => {
		const params = {
			ids: tokenIds.join(',')
		};
		return apiFetch('/api/tokens/prices', 'GET', null, params);
	},

	getSwapStatus: async (txHash: string): Promise<TradeStatusResponse> => { // Added new function
		return apiFetch(`/api/trades/status/${txHash}`, 'GET');
	},

	prepareTokenTransfer: async (payload: TokenTransferPrepareRequest): Promise<TokenTransferPrepareResponse> => {
		return apiFetch('/api/transfer/prepare', 'POST', payload);
	},

	submitTokenTransfer: async (payload: TokenTransferSubmitRequest): Promise<TokenTransferResponse> => {
		return apiFetch('/api/transfer/submit', 'POST', payload);
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

export default api;
