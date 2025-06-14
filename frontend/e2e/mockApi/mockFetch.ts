/// <reference lib="dom" />
import { env } from '@/utils/env';
import { create } from '@bufbuild/protobuf';
import {
	GetAvailableCoinsResponseSchema, SearchResponseSchema, SearchCoinByMintResponseSchema, type Coin as ProtobufCoin, CoinSchema,
} from '@/gen/dankfolio/v1/coin_pb';
import {
	GetWalletBalancesResponseSchema,
	BalanceSchema,
	WalletBalanceSchema,
} from '@/gen/dankfolio/v1/wallet_pb';
import {
	GetPriceHistoryResponseSchema,
	PriceHistoryDataSchema,
} from '@/gen/dankfolio/v1/price_pb';
import {
	GetSwapQuoteResponseSchema,
	PrepareSwapResponseSchema,
	SubmitSwapResponseSchema,
	TradeSchema,
	ListTradesResponseSchema,
} from '@/gen/dankfolio/v1/trade_pb';

import { MOCK_TRENDING_COINS, MOCK_NEW_COINS, ALL_MOCK_COINS, MOCK_WALLET_BALANCES, CAPTURED_TRANSACTION_DATA } from './mockData';
import { generatePriceHistory } from './helpers';

type FetchInput = string | URL | Request;
type FetchInit = RequestInit;

// Original fetch function reference
export const originalFetch = global.fetch;

// Helper function to parse request body
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseRequestBody(options?: FetchInit): any {
	if (!options?.body) {
		return {};
	}
	try {
		if (options.body instanceof Uint8Array) {
			const decoder = new TextDecoder();
			const bodyString = decoder.decode(options.body);
			return JSON.parse(bodyString);
		} else if (typeof options.body === 'string') {
			return JSON.parse(options.body);
		} else {
			// For other body types (e.g., already an object if fetch was called programmatically with one)
			return options.body;
		}
	} catch (e) {
		console.warn('🎭 Mock API: Failed to parse request body', e);
		return {};
	}
}

// Handler Functions
async function handleGetAvailableCoins(options?: FetchInit) {
	const requestData = parseRequestBody(options);
	const coinsToReturn = requestData.trendingOnly ? MOCK_TRENDING_COINS : ALL_MOCK_COINS;
	return create(GetAvailableCoinsResponseSchema, {
		coins: coinsToReturn,
	});
}


async function handleSearch(_options?: FetchInit) {
	const coinsToReturn = MOCK_NEW_COINS;
	return create(SearchResponseSchema, {
		coins: coinsToReturn,
		totalCount: coinsToReturn.length,
	});
}


async function handleSearchCoins(_options?: FetchInit) {
	const coinsToReturn = MOCK_TRENDING_COINS.slice(0, 3);
	return create(SearchResponseSchema, {
		coins: coinsToReturn,
		totalCount: coinsToReturn.length,
	});
}


async function handleSearchCoinByMint(_options?: FetchInit) {
	return create(SearchCoinByMintResponseSchema, {
		coin: ALL_MOCK_COINS[0],
	});
}

async function handleGetCoinById(options?: FetchInit) {
	const requestData = parseRequestBody(options);
	const mintAddress = requestData.mintAddress;

	if (!mintAddress) {
		// Return gRPC-style error for invalid request
		throw new Error('INVALID_ARGUMENT: mintAddress is required');
	}

	const coin = ALL_MOCK_COINS.find((c: ProtobufCoin) =>
		c.mintAddress.toLowerCase() === mintAddress.toLowerCase()
	);

	if (!coin) {
		// Return gRPC-style error for not found
		throw new Error(`NOT_FOUND: No coin found with mint address ${mintAddress}`);
	}

	return create(CoinSchema, coin);
}

async function handleGetWalletBalances(options?: FetchInit) {
	const requestData = parseRequestBody(options);
	const walletAddress = requestData.address || '';

	if (walletAddress.includes('NetworkError') || walletAddress.includes('network-error')) {
		throw new Error('NETWORK_ERROR: Unable to connect to Solana network');
	}
	if (walletAddress.includes('InvalidAddress') || walletAddress === 'invalid-address') {
		throw new Error('INVALID_ADDRESS: Invalid wallet address format');
	}
	if (walletAddress.includes('Unused') || walletAddress.includes('unused')) {
		const walletBalance = create(WalletBalanceSchema, { balances: [] });
		return create(GetWalletBalancesResponseSchema, { walletBalance });
	}
	if (walletAddress.includes('Active')) {
		const activeBalances = [
			create(BalanceSchema, { id: 'So11111111111111111111111111111111111111112', amount: 2.5 }),
			create(BalanceSchema, { id: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', amount: 100.0 }),
		];
		const walletBalance = create(WalletBalanceSchema, { balances: activeBalances });
		return create(GetWalletBalancesResponseSchema, { walletBalance });
	}

	const walletBalance = create(WalletBalanceSchema, { balances: MOCK_WALLET_BALANCES });
	return create(GetWalletBalancesResponseSchema, { walletBalance });
}

async function handleGetPriceHistory(options?: FetchInit) {
	const requestData = parseRequestBody(options);
	const coinAddress = requestData.address;

	if (!coinAddress) {
		// Return gRPC-style error for invalid request
		throw new Error('INVALID_ARGUMENT: address is required');
	}

	const coin = ALL_MOCK_COINS.find((c: ProtobufCoin) =>
		c.mintAddress.toLowerCase() === coinAddress.toLowerCase()
	);

	if (!coin) {
		// Return gRPC-style error for not found
		throw new Error(`NOT_FOUND: No coin found with mint address ${coinAddress}`);
	}

	const isStablecoin = coin.tags.includes('stablecoin');
	const data = create(PriceHistoryDataSchema, {
		items: generatePriceHistory(coin.price, isStablecoin),
	});
	return create(GetPriceHistoryResponseSchema, { data, success: true });
}

async function handleGetCoinPrices(options?: FetchInit) {
	const requestData = parseRequestBody(options);
	const coinIds = requestData.coinIds || [];

	// If no specific coins requested, return prices for all coins
	const coinsToPrice = coinIds.length > 0 ? coinIds : ALL_MOCK_COINS.map(c => c.mintAddress);

	const mockPrices: { [key: string]: number } = {};
	coinsToPrice.forEach((coinId: string) => {
		const coin = ALL_MOCK_COINS.find((c: ProtobufCoin) =>
			c.mintAddress.toLowerCase() === coinId.toLowerCase()
		);
		if (coin) {
			// Use base price directly for deterministic behavior
			mockPrices[coinId] = coin.price;
		}
	});

	return { prices: mockPrices }; // This endpoint returns a plain object
}

async function handleGetSwapQuote(options?: FetchInit) {
	const requestData = parseRequestBody(options);
	const { fromCoinId, toCoinId, amount } = requestData;

	if (!fromCoinId || !toCoinId || !amount) {
		throw new Error('INVALID_ARGUMENT: fromCoinId, toCoinId, and amount are required');
	}

	// Find the coins to get their base data
	const fromCoin = ALL_MOCK_COINS.find((c: ProtobufCoin) =>
		c.mintAddress.toLowerCase() === fromCoinId.toLowerCase()
	);
	const toCoin = ALL_MOCK_COINS.find((c: ProtobufCoin) =>
		c.mintAddress.toLowerCase() === toCoinId.toLowerCase()
	);

	if (!fromCoin || !toCoin) {
		throw new Error('NOT_FOUND: One or both coins not found');
	}


	// Convert raw amount to decimal amount for calculation
	const rawAmount = parseFloat(amount);
	const fromDecimals = fromCoin.decimals;
	const decimalAmount = rawAmount / Math.pow(10, fromDecimals);

	// Calculate estimated output amount based on prices
	// estimatedAmount = (inputAmount * fromCoinPrice) / toCoinPrice
	const estimatedDecimalAmount = (decimalAmount * fromCoin.price) / toCoin.price;

	// Apply some slippage/fees (reduce by 0.5%)
	const slippageAdjustedAmount = estimatedDecimalAmount * 0.995;

	// Calculate exchange rate (raw output amount / raw input amount)
	const exchangeRate = (slippageAdjustedAmount * Math.pow(10, toCoin.decimals)) / rawAmount;

	// Calculate fee (0.5% of input amount in decimal)
	const feeAmount = decimalAmount * 0.005;

	// Calculate price impact (simulate based on amount - larger amounts have higher impact)
	const priceImpact = Math.min(decimalAmount / 1000 * 0.1, 2.0); // Max 2% impact

	return create(GetSwapQuoteResponseSchema, {
		estimatedAmount: slippageAdjustedAmount.toFixed(6), // Return as decimal string like backend
		exchangeRate: exchangeRate.toFixed(6),
		fee: feeAmount.toFixed(6),
		priceImpact: priceImpact.toFixed(3),
		routePlan: ['Direct'],
		inputMint: fromCoinId,
		outputMint: toCoinId,
	});
}


async function handlePrepareSwap(_options?: FetchInit) {
	const mockTransactionBase64 = 'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQAGCekCd/S1HV8txmyKfIAWKWxswDuUWLUqjZYc6PbaNJgCS6xdNRGIgknfxCI44w8fMixamF6aM2jvWuJv9F6HQGCYGhB4xuDMrDdhavUhIeB7Cm55/scPKspWwzD2R6pEoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwZGb+UhFzL/7K26csOb57yM5bvF9xJrLEObOkAAAAAEedVb8jHAbu50xW7OaBUH/bGy3qP0jlECsc2iVrwTjwbd9uHXZaGT2cvhRs7reawctIXtX1s3kTqM9YV+/wCpjJclj04kifG7PRApFI4NgwtaE5na/xCEBI572Nvp+Fm0P/on9df2SnTAmx8pWHneSwmrNt/J3VFLMhqns4zl6Ay7y3ZxksVsqzi2N3jHaFEqLW3iYBGcYX3hKK2J6TtECAQABQILSwIABAAJA6AsAAAAAAAABwYAAgAPAwYBAQMCAAIMAgAAAIwMCAAAAAAABgECAREHBgABABEDBgEBBRsGAAIBBREFCAUOCw4NCgIBEQ8JDgAGBhAODAUj5RfLl3rjrSoBAAAAJmQAAYwMCAAAAAAA3IhZ0AEAAABQAAAGAwIAAAEJAWpgiN9xbBUoxnUHH86lRaehpUhg3jmT4dhHYEv2EYR2BX9ZW36DBC4CdVo=';
	return create(PrepareSwapResponseSchema, {
		unsignedTransaction: mockTransactionBase64,
	});
}


async function handlePrepareTransfer(_options?: FetchInit) {
	return { unsignedTransaction: CAPTURED_TRANSACTION_DATA.UNSIGNED_TX }; // This endpoint returns a plain object
}


async function handleSubmitTransfer(_options?: FetchInit) {
	return { transactionHash: CAPTURED_TRANSACTION_DATA.MOCK_TX_HASH }; // This endpoint returns a plain object
}


async function handleSubmitSwap(_options?: FetchInit) {
	return create(SubmitSwapResponseSchema, {
		tradeId: 'mock_trade_id_e2e_test_67890',
		transactionHash: 'mock_transaction_hash_abcdef123456',
	});
}


async function handleGetSwapStatus(_options?: FetchInit) {
	return { // This endpoint returns a plain object
		transaction_hash: 'mock_transaction_hash_abcdef123456',
		status: 'Finalized',
		confirmations: 32,
		finalized: true,
	};
}


async function handleGetTrade(_options?: FetchInit) {
	return create(TradeSchema, {
		id: 'mock_trade_id_e2e_test_67890',
		userId: 'mock_user_id',
		fromCoinId: 'So11111111111111111111111111111111111111112',
		toCoinId: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
		coinSymbol: 'SOL',
		type: 'swap',
		amount: 1.25,
		price: 0.95,
		fee: 0.0025,
		status: 'completed',
		transactionHash: 'mock_transaction_hash_abcdef123456',
		confirmations: 32,
		finalized: true,
	});
}


async function handleListTrades(_options?: FetchInit) {
	const mockTrade = create(TradeSchema, {
		id: 'mock_trade_id_e2e_test_67890',
		userId: 'mock_user_id',
		fromCoinId: 'So11111111111111111111111111111111111111112',
		toCoinId: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
		coinSymbol: 'SOL',
		type: 'swap',
		amount: 1.25,
		price: 0.95,
		fee: 0.0025,
		status: 'completed',
		transactionHash: 'mock_transaction_hash_abcdef123456',
		confirmations: 32,
		finalized: true,
	});
	return create(ListTradesResponseSchema, {
		trades: [mockTrade],
		totalCount: 1,
	});
}

// Endpoint Handlers Map
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const endpointHandlers: { [key: string]: (options?: FetchInit) => Promise<any> } = {
	'/dankfolio.v1.coinservice/getavailablecoins': handleGetAvailableCoins,
	'/dankfolio.v1.coinservice/search': handleSearch,
	'/dankfolio.v1.coinservice/searchcoins': handleSearchCoins,
	'/dankfolio.v1.coinservice/searchcoinbymint': handleSearchCoinByMint,
	'/dankfolio.v1.coinservice/getcoinbyid': handleGetCoinById,
	'/dankfolio.v1.walletservice/getwalletbalances': handleGetWalletBalances,
	'/dankfolio.v1.priceservice/getpricehistory': handleGetPriceHistory,
	'/dankfolio.v1.priceservice/getcoinprices': handleGetCoinPrices,
	'/dankfolio.v1.tradeservice/getswapquote': handleGetSwapQuote,
	'/dankfolio.v1.tradeservice/prepareswap': handlePrepareSwap,
	'/dankfolio.v1.walletservice/preparetransfer': handlePrepareTransfer,
	'/dankfolio.v1.walletservice/submittransfer': handleSubmitTransfer,
	'/dankfolio.v1.tradeservice/submitswap': handleSubmitSwap,
	'/dankfolio.v1.tradeservice/getswapstatus': handleGetSwapStatus,
	'/dankfolio.v1.tradeservice/gettrade': handleGetTrade,
	'/dankfolio.v1.tradeservice/listtrades': handleListTrades,
};

// Mock fetch implementation
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mockFetch = async (url: FetchInput, options?: FetchInit): Promise<any> => {
	const urlString = url.toString();
	const apiUrl = env.apiUrl;

	// Only intercept calls to our API
	if (!urlString.startsWith(apiUrl)) {
		console.log('🎭 Not intercepting - URL does not start with API URL');
		return originalFetch(url, options);
	}

	const path = urlString.replace(apiUrl, '');
	const normalizedPath = path.replace(/^\/+/, '/').toLowerCase();

	try {
		const handler = endpointHandlers[normalizedPath];
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let mockResponse: any;

		if (handler) {
			mockResponse = await handler(options);
		} else {
			console.log('🎭 Unhandled endpoint, falling back to original fetch:', normalizedPath);
			console.log('🎭 Available endpoint handlers:', Object.keys(endpointHandlers));
			return originalFetch(url, options);
		}


		const responseBody = JSON.stringify(mockResponse, (_key, value) => {
			if (typeof value === 'bigint') {
				return value.toString();
			}
			if (value && typeof value === 'object' && value.$typeName === 'google.protobuf.Timestamp') {
				const seconds = typeof value.seconds === 'bigint' ? Number(value.seconds) : value.seconds;
				const nanos = value.nanos || 0;
				const date = new Date(seconds * 1000 + nanos / 1000000);
				return date.toISOString();
			}
			return value;
		});

		return {
			ok: true,
			status: 200,
			statusText: 'OK',
			headers: new Headers({ 'Content-Type': 'application/json' }),
			text: async () => responseBody,
			json: async () => JSON.parse(responseBody),
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} as any;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} catch (error: any) {
		console.error('🎭 Mock API error in handler or main mockFetch:', error.message);
		// Fall back to original fetch on error (e.g. simulated network error)
		// Check if it's one of our simulated errors, otherwise it could be an issue in the mocking logic itself
		if (error.message.startsWith('NETWORK_ERROR:') || error.message.startsWith('INVALID_ADDRESS:')) {
			// For simulated errors, we want to throw them so the calling code sees the error
			// However, the fetch API expects a Response object that's an error, or a thrown TypeError for network issues.
			// For simplicity in mock, we'll re-throw, and Connect-Web/gRPC client should handle it.
			// Alternatively, construct an error Response: `return new Response(error.message, { status: 500 });`
			// But throwing ensures it's treated as a network failure / client-side exception.
			throw error;
		}
		// For other errors within mock logic, it's better to fall back to original fetch if possible
		console.error('🎭 Error was not a simulated one. Falling back to original fetch for safety.');
		return originalFetch(url, options);
	}
};
