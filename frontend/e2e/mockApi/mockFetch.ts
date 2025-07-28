/// <reference lib="dom" />
import { env } from '@/utils/env';
import { create } from '@bufbuild/protobuf';
import { timestampFromDate } from '@bufbuild/protobuf/wkt';
import {
	GetAvailableCoinsResponseSchema, SearchResponseSchema, SearchCoinByAddressResponseSchema, type Coin as ProtobufCoin, CoinSchema,
	GetCoinsByIDsResponseSchema, GetAllCoinsResponseSchema,
} from '@/gen/dankfolio/v1/coin_pb';
import {
	GetWalletBalancesResponseSchema,
	BalanceSchema,
	WalletBalanceSchema,
	CreateWalletResponseSchema,
	GetPortfolioPnLResponseSchema,
	TokenPnLSchema,
} from '@/gen/dankfolio/v1/wallet_pb';
import {
	GetPriceHistoryResponseSchema,
	PriceHistoryDataSchema,
	GetPriceHistoriesByIDsResponseSchema,
	PriceHistoryResultSchema,
} from '@/gen/dankfolio/v1/price_pb';
import {
	GetSwapQuoteResponseSchema,
	PrepareSwapResponseSchema,
	SubmitSwapResponseSchema,
	TradeSchema,
	ListTradesResponseSchema,
	SolFeeBreakdownSchema,
} from '@/gen/dankfolio/v1/trade_pb';
import {
	GetProxiedImageResponseSchema,
} from '@/gen/dankfolio/v1/utility_pb';

import { MOCK_TRENDING_COINS, MOCK_TOP_GAINER_COINS, MOCK_NEW_COINS, ALL_MOCK_COINS, MOCK_WALLET_BALANCES, CAPTURED_TRANSACTION_DATA, MOCK_XSTOCKS_COINS } from './mockData';
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
	console.log('🎭 handleGetAvailableCoins called');
	const requestData = parseRequestBody(options);
	const limit = requestData.limit || 50;
	const offset = requestData.offset || 0;

	// Return all mock coins with pagination
	const paginatedCoins = ALL_MOCK_COINS.slice(offset, offset + limit);
	console.log(`🎭 handleGetAvailableCoins returning ${paginatedCoins.length} coins (total: ${ALL_MOCK_COINS.length})`);

	const response = create(GetAvailableCoinsResponseSchema, {
		coins: paginatedCoins,
		totalCount: ALL_MOCK_COINS.length,
	});
	console.log('🎭 handleGetAvailableCoins response created successfully');
	return response;
}

// New RPC method handlers for specific coin categories
async function handleGetNewCoins(options?: FetchInit) {
	const requestData = parseRequestBody(options);
	const limit = requestData.limit || 20;
	const offset = requestData.offset || 0;

	// Return new coins with pagination
	const paginatedCoins = MOCK_NEW_COINS.slice(offset, offset + limit);

	return create(GetAvailableCoinsResponseSchema, {
		coins: paginatedCoins,
		totalCount: MOCK_NEW_COINS.length,
	});
}

async function handleGetTrendingCoins(options?: FetchInit) {
	const requestData = parseRequestBody(options);
	const limit = requestData.limit || 20;
	const offset = requestData.offset || 0;

	// Return trending coins with pagination
	const paginatedCoins = MOCK_TRENDING_COINS.slice(offset, offset + limit);

	return create(GetAvailableCoinsResponseSchema, {
		coins: paginatedCoins,
		totalCount: MOCK_TRENDING_COINS.length,
	});
}

async function handleGetTopGainersCoins(options?: FetchInit) {
	const requestData = parseRequestBody(options);
	const limit = requestData.limit || 20;
	const offset = requestData.offset || 0;

	// Return top gainer coins with pagination
	const paginatedCoins = MOCK_TOP_GAINER_COINS.slice(offset, offset + limit);

	return create(GetAvailableCoinsResponseSchema, {
		coins: paginatedCoins,
		totalCount: MOCK_TOP_GAINER_COINS.length,
	});
}

async function handleGetXStocksCoins(options?: FetchInit) {
	const requestData = parseRequestBody(options);
	const limit = requestData.limit || 20;
	const offset = requestData.offset || 0;

	// Return XStocks coins with pagination
	const paginatedCoins = MOCK_XSTOCKS_COINS.slice(offset, offset + limit);

	return create(GetAvailableCoinsResponseSchema, {
		coins: paginatedCoins,
		totalCount: MOCK_XSTOCKS_COINS.length,
	});
}

async function handleSearchCoins(options?: FetchInit) {
	const requestData = parseRequestBody(options);

	// Check if this is a request for top gainers (sorted by price change percentage)
	// Handle both string and numeric enum values
	const isTopGainerRequest = (
		requestData.sortBy === 'COIN_SORT_FIELD_PRICE_CHANGE_PERCENTAGE_24H' &&
		requestData.sortDesc
	);

	if (isTopGainerRequest) {
		return create(SearchResponseSchema, {
			coins: MOCK_TOP_GAINER_COINS,
			totalCount: MOCK_TOP_GAINER_COINS.length,
		});
	}

	// Check if this is a request for new coins (sorted by jupiter_listed_at)
	// Handle both string and numeric enum values
	const isNewCoinsRequest = (
		requestData.sortBy === 'COIN_SORT_FIELD_JUPITER_LISTED_AT'
	);

	if (isNewCoinsRequest) {
		return create(SearchResponseSchema, {
			coins: MOCK_NEW_COINS,
			totalCount: MOCK_NEW_COINS.length,
		});
	}

	// Default behavior - return trending coins
	const coinsToReturn = MOCK_TRENDING_COINS.slice(0, 3);
	return create(SearchResponseSchema, {
		coins: coinsToReturn,
		totalCount: coinsToReturn.length,
	});
}

async function handleSearchCoinByMint(_options?: FetchInit) {
	return create(SearchCoinByAddressResponseSchema, {
		coin: ALL_MOCK_COINS[0],
	});
}

async function handleGetCoinById(options?: FetchInit) {
	const requestData = parseRequestBody(options);
	const address = requestData.address || requestData.mintAddress; // Support both field names

	if (!address) {
		// Return gRPC-style error for invalid request
		throw new Error('INVALID_ARGUMENT: address is required');
	}

	const coin = ALL_MOCK_COINS.find((c: ProtobufCoin) =>
		c.address.toLowerCase() === address.toLowerCase()
	);

	if (!coin) {
		// Return gRPC-style error for not found
		throw new Error(`NOT_FOUND: No coin found with address ${address}`);
	}

	return create(CoinSchema, coin);
}

async function handleGetCoinsByIDs(options?: FetchInit) {
	const requestData = parseRequestBody(options);
	const addresses = requestData.addresses || [];

	if (!addresses || addresses.length === 0) {
		// Return empty response for no addresses
		return create(GetCoinsByIDsResponseSchema, {
			coins: [],
		});
	}

	// Find all matching coins
	const coins = addresses
		.map((address: string) =>
			ALL_MOCK_COINS.find((c: ProtobufCoin) =>
				c.address.toLowerCase() === address.toLowerCase()
			)
		)
		.filter((coin): coin is ProtobufCoin => coin !== undefined);

	return create(GetCoinsByIDsResponseSchema, {
		coins,
	});
}

async function handleGetAllCoins(_options?: FetchInit) {
	// Return all mock coins without pagination
	return create(GetAllCoinsResponseSchema, {
		coins: ALL_MOCK_COINS,
	});
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
		c.address.toLowerCase() === coinAddress.toLowerCase()
	);

	if (!coin) {
		// Return gRPC-style error for not found
		throw new Error(`NOT_FOUND: No coin found with address ${coinAddress}`);
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
	const coinsToPrice = coinIds.length > 0 ? coinIds : ALL_MOCK_COINS.map(c => c.address);

	const mockPrices: { [key: string]: number } = {};
	coinsToPrice.forEach((coinId: string) => {
		const coin = ALL_MOCK_COINS.find((c: ProtobufCoin) =>
			c.address.toLowerCase() === coinId.toLowerCase()
		);
		if (coin) {
			// Use base price directly for deterministic behavior
			mockPrices[coinId] = coin.price;
		}
	});

	return { prices: mockPrices }; // This endpoint returns a plain object
}

async function handleGetPriceHistoriesByIDs(options?: FetchInit) {
	const requestData = parseRequestBody(options);
	const items = requestData.items || [];

	if (!items || items.length === 0) {
		// Return empty response for no items
		return create(GetPriceHistoriesByIDsResponseSchema, {
			results: {},
			failedAddresses: [],
		});
	}

	// Process each price history request
	const results: { [key: string]: unknown } = {};
	const failedAddresses: string[] = [];

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	items.forEach((item: any) => {
		const coinAddress = item.address;
		if (!coinAddress) {
			failedAddresses.push(coinAddress || 'unknown');
			return;
		}

		const coin = ALL_MOCK_COINS.find((c: ProtobufCoin) =>
			c.address.toLowerCase() === coinAddress.toLowerCase()
		);

		if (!coin) {
			failedAddresses.push(coinAddress);
			return;
		}

		const isStablecoin = coin.tags.includes('stablecoin');
		const priceHistoryData = create(PriceHistoryDataSchema, {
			items: generatePriceHistory(coin.price, isStablecoin),
		});

		results[coinAddress] = create(PriceHistoryResultSchema, {
			data: priceHistoryData,
			success: true,
			errorMessage: '',
		});
	});

	return create(GetPriceHistoriesByIDsResponseSchema, {
		results,
		failedAddresses,
	});
}

async function handleGetSwapQuote(options?: FetchInit) {
	const requestData = parseRequestBody(options);
	const { fromCoinId, toCoinId, amount } = requestData;

	if (!fromCoinId || !toCoinId || !amount) {
		throw new Error('INVALID_ARGUMENT: fromCoinId, toCoinId, and amount are required');
	}

	// Find the coins to get their base data
	const fromCoin = ALL_MOCK_COINS.find((c: ProtobufCoin) =>
		c.address.toLowerCase() === fromCoinId.toLowerCase()
	);
	const toCoin = ALL_MOCK_COINS.find((c: ProtobufCoin) =>
		c.address.toLowerCase() === toCoinId.toLowerCase()
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

	// Calculate detailed fee breakdown
	const tradingFeeSol = (feeAmount * fromCoin.price / 98.45).toFixed(9); // Convert to SOL (assuming SOL price ~98.45)
	const transactionFee = '0.000005'; // Base transaction fee (5000 lamports)
	const priorityFee = '0.000001'; // Priority fee
	const accountsToCreate = requestData.includeFeeBreakdown ? 1 : 0; // Simulate 1 ATA creation if detailed breakdown requested
	const accountCreationFee = accountsToCreate > 0 ? '0.00203928' : '0'; // ATA creation cost
	const totalSolFees = (
		parseFloat(tradingFeeSol) +
		parseFloat(transactionFee) +
		parseFloat(priorityFee) +
		parseFloat(accountCreationFee)
	).toFixed(9);

	// Create fee breakdown if requested
	const solFeeBreakdown = requestData.includeFeeBreakdown ? create(SolFeeBreakdownSchema, {
		tradingFee: tradingFeeSol,
		transactionFee: transactionFee,
		accountCreationFee: accountCreationFee,
		priorityFee: priorityFee,
		total: totalSolFees,
		accountsToCreate: accountsToCreate,
	}) : undefined;

	return create(GetSwapQuoteResponseSchema, {
		estimatedAmount: slippageAdjustedAmount.toFixed(6), // Return as decimal string like backend
		exchangeRate: exchangeRate.toFixed(6),
		fee: feeAmount.toFixed(6),
		priceImpact: priceImpact.toFixed(3),
		routePlan: ['Direct'],
		inputMint: fromCoinId,
		outputMint: toCoinId,
		solFeeBreakdown: solFeeBreakdown,
		totalSolRequired: totalSolFees,
		tradingFeeSol: tradingFeeSol,
	});
}

async function handlePrepareSwap(options?: FetchInit) {
	const requestData = parseRequestBody(options);
	const { fromCoinId, toCoinId, amount } = requestData;

	// Find the coins to calculate fees
	const fromCoin = ALL_MOCK_COINS.find((c: ProtobufCoin) =>
		c.address.toLowerCase() === (fromCoinId || '').toLowerCase()
	);
	const _toCoin = ALL_MOCK_COINS.find((c: ProtobufCoin) =>
		c.address.toLowerCase() === (toCoinId || '').toLowerCase()
	);

	// Calculate trading fee
	let tradingFeeSol = '0.000025'; // Default trading fee
	if (fromCoin && amount) {
		const rawAmount = parseFloat(amount);
		const decimalAmount = rawAmount / Math.pow(10, fromCoin.decimals);
		const feeAmount = decimalAmount * 0.005; // 0.5% fee
		tradingFeeSol = (feeAmount * fromCoin.price / 98.45).toFixed(9); // Convert to SOL
	}

	// Calculate detailed fee breakdown
	const transactionFee = '0.000005'; // Base transaction fee (5000 lamports)
	const priorityFee = '0.000001'; // Priority fee
	const accountsToCreate = 1; // Simulate 1 ATA creation for PrepareSwap
	const accountCreationFee = '0.00203928'; // ATA creation cost
	const totalSolFees = (
		parseFloat(tradingFeeSol) +
		parseFloat(transactionFee) +
		parseFloat(priorityFee) +
		parseFloat(accountCreationFee)
	).toFixed(9);

	// Create fee breakdown
	const solFeeBreakdown = create(SolFeeBreakdownSchema, {
		tradingFee: tradingFeeSol,
		transactionFee: transactionFee,
		accountCreationFee: accountCreationFee,
		priorityFee: priorityFee,
		total: totalSolFees,
		accountsToCreate: accountsToCreate,
	});

	const mockTransactionBase64 = 'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQAGCekCd/S1HV8txmyKfIAWKWxswDuUWLUqjZYc6PbaNJgCS6xdNRGIgknfxCI44w8fMixamF6aM2jvWuJv9F6HQGCYGhB4xuDMrDdhavUhIeB7Cm55/scPKspWwzD2R6pEoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwZGb+UhFzL/7K26csOb57yM5bvF9xJrLEObOkAAAAAEedVb8jHAbu50xW7OaBUH/bGy3qP0jlECsc2iVrwTjwbd9uHXZaGT2cvhRs7reawctIXtX1s3kTqM9YV+/wCpjJclj04kifG7PRApFI4NgwtaE5na/xCEBI572Nvp+Fm0P/on9df2SnTAmx8pWHneSwmrNt/J3VFLMhqns4zl6Ay7y3ZxksVsqzi2N3jHaFEqLW3iYBGcYX3hKK2J6TtECAQABQILSwIABAAJA6AsAAAAAAAABwYAAgAPAwYBAQMCAAIMAgAAAIwMCAAAAAAABgECAREHBgABABEDBgEBBRsGAAIBBREFCAUOCw4NCgIBEQ8JDgAGBhAODAUj5RfLl3rjrSoBAAAAJmQAAYwMCAAAAAAA3IhZ0AEAAABQAAAGAwIAAAEJAWpgiN9xbBUoxnUHH86lRaehpUhg3jmT4dhHYEv2EYR2BX9ZW36DBC4CdVo=';

	return create(PrepareSwapResponseSchema, {
		unsignedTransaction: mockTransactionBase64,
		solFeeBreakdown: solFeeBreakdown,
		totalSolRequired: totalSolFees,
		tradingFeeSol: tradingFeeSol,
	});
}

async function handlePrepareTransfer(_options?: FetchInit) {
	return { unsignedTransaction: CAPTURED_TRANSACTION_DATA.UNSIGNED_TX }; // This endpoint returns a plain object
}

async function handleSubmitTransfer(_options?: FetchInit) {
	return { transactionHash: CAPTURED_TRANSACTION_DATA.MOCK_TX_HASH }; // This endpoint returns a plain object
}

async function handleCreateWallet(_options?: FetchInit) {
	// Generate mock wallet data for testing
	const mockPublicKey = 'E2eMockWallet' + Math.random().toString(36).substring(2, 15);
	const mockSecretKey = 'MockSecret' + Math.random().toString(36).substring(2, 50);
	const mockMnemonic = 'mock test wallet seed phrase example words for testing purposes only twelve words total';

	return create(CreateWalletResponseSchema, {
		publicKey: mockPublicKey,
		secretKey: mockSecretKey,
		mnemonic: mockMnemonic,
	});
}

async function handleGetProxiedImage(options?: FetchInit) {
	const requestData = parseRequestBody(options);
	const imageUrl = requestData.imageUrl || '';

	if (!imageUrl) {
		throw new Error('INVALID_ARGUMENT: imageUrl is required');
	}

	// Return mock image data (1x1 transparent PNG)
	// This is a base64-encoded 1x1 transparent PNG
	const mockImageBytes = [137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 13, 73, 68, 65, 84, 120, 218, 98, 100, 96, 248, 95, 15, 0, 0, 2, 133, 1, 128, 235, 71, 186, 146, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130];
	const mockImageData = new Uint8Array(mockImageBytes);

	return create(GetProxiedImageResponseSchema, {
		imageData: mockImageData,
		contentType: 'image/png',
	});
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

async function handleListTrades(options?: FetchInit) {
	const requestData = parseRequestBody(options);
	const limit = requestData.limit || 20;
	const offset = requestData.offset || 0;

	// Create diverse mock trades for testing
	const mockTrades = [
		create(TradeSchema, {
			id: 'mock_trade_1_success',
			userId: requestData.userId || 'mock_user_id',
			fromCoinId: 'So11111111111111111111111111111111111111112',
			toCoinId: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
			coinSymbol: 'SOL',
			type: 'swap',
			amount: 2.5,
			price: 98.45,
			fee: 0.005,
			status: 'completed',
			transactionHash: 'mock_tx_hash_success_1',
			confirmations: 32,
			finalized: true,
			createdAt: timestampFromDate(new Date(Date.now() - 3600000)), // 1 hour ago
			completedAt: timestampFromDate(new Date(Date.now() - 3540000)), // 59 minutes ago
		}),
		create(TradeSchema, {
			id: 'mock_trade_2_profit',
			userId: requestData.userId || 'mock_user_id',
			fromCoinId: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
			toCoinId: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
			coinSymbol: 'USDC',
			type: 'swap',
			amount: 100.0,
			price: 1.0,
			fee: 0.25,
			status: 'completed',
			transactionHash: 'mock_tx_hash_profit_2',
			confirmations: 64,
			finalized: true,
			createdAt: timestampFromDate(new Date(Date.now() - 7200000)), // 2 hours ago
			completedAt: timestampFromDate(new Date(Date.now() - 7140000)),
		}),
		create(TradeSchema, {
			id: 'mock_trade_3_pending',
			userId: requestData.userId || 'mock_user_id',
			fromCoinId: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
			toCoinId: 'So11111111111111111111111111111111111111112',
			coinSymbol: 'JUP',
			type: 'swap',
			amount: 50.0,
			price: 0.87,
			fee: 0.1,
			status: 'pending',
			transactionHash: 'mock_tx_hash_pending_3',
			confirmations: 2,
			finalized: false,
			createdAt: timestampFromDate(new Date(Date.now() - 300000)), // 5 minutes ago
		}),
		create(TradeSchema, {
			id: 'mock_trade_4_failed',
			userId: requestData.userId || 'mock_user_id',
			fromCoinId: 'DankCoin1111111111111111111111111111111',
			toCoinId: 'So11111111111111111111111111111111111111112',
			coinSymbol: 'DANK',
			type: 'swap',
			amount: 1000.0,
			price: 0.000042,
			fee: 0.002,
			status: 'failed',
			transactionHash: 'mock_tx_hash_failed_4',
			confirmations: 0,
			finalized: false,
			error: 'Insufficient liquidity in pool',
			createdAt: timestampFromDate(new Date(Date.now() - 10800000)), // 3 hours ago
		}),
		create(TradeSchema, {
			id: 'mock_trade_5_loss',
			userId: requestData.userId || 'mock_user_id',
			fromCoinId: 'MoonToken111111111111111111111111111111',
			toCoinId: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
			coinSymbol: 'MOON',
			type: 'swap',
			amount: 500.0,
			price: 0.00123,
			fee: 0.001,
			status: 'completed',
			transactionHash: 'mock_tx_hash_loss_5',
			confirmations: 128,
			finalized: true,
			createdAt: timestampFromDate(new Date(Date.now() - 86400000)), // 1 day ago
			completedAt: timestampFromDate(new Date(Date.now() - 86340000)),
		}),
	];

	// Apply filters if provided
	let filteredTrades = mockTrades;
	if (requestData.status) {
		filteredTrades = filteredTrades.filter(t => t.status === requestData.status);
	}
	if (requestData.type) {
		filteredTrades = filteredTrades.filter(t => t.type === requestData.type);
	}
	if (requestData.fromCoinAddress) {
		filteredTrades = filteredTrades.filter(t => t.fromCoinId === requestData.fromCoinAddress);
	}
	if (requestData.toCoinAddress) {
		filteredTrades = filteredTrades.filter(t => t.toCoinId === requestData.toCoinAddress);
	}

	// Apply pagination
	const paginatedTrades = filteredTrades.slice(offset, offset + limit);

	return create(ListTradesResponseSchema, {
		trades: paginatedTrades,
		totalCount: filteredTrades.length,
	});
}

async function handleGetPortfolioPnL(options?: FetchInit) {
	const requestData = parseRequestBody(options);
	const walletAddress = requestData.walletAddress || '';

	// First, get all wallet balances to calculate total portfolio value
	const walletBalances = MOCK_WALLET_BALANCES;

	// Create mock token PnL data (only for tokens with trade history)
	const tokenPnls = [
		create(TokenPnLSchema, {
			coinId: 'So11111111111111111111111111111111111111112',
			symbol: 'SOL',
			name: 'Wrapped SOL',
			amountHeld: 5.25,
			costBasis: 85.50, // Average buy price
			currentPrice: 98.45,
			currentValue: 516.86, // 5.25 * 98.45
			unrealizedPnl: 67.74, // (98.45 - 85.50) * 5.25
			pnlPercentage: 15.15, // ((98.45 - 85.50) / 85.50) * 100
			hasPurchaseData: true,
		}),
		create(TokenPnLSchema, {
			coinId: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
			symbol: 'BONK',
			name: 'Bonk',
			amountHeld: 1500000,
			costBasis: 0.0000065, // Average buy price
			currentPrice: 0.0000089,
			currentValue: 13.35, // 1500000 * 0.0000089
			unrealizedPnl: 3.60, // (0.0000089 - 0.0000065) * 1500000
			pnlPercentage: 36.92, // ((0.0000089 - 0.0000065) / 0.0000065) * 100
			hasPurchaseData: true,
		}),
		create(TokenPnLSchema, {
			coinId: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
			symbol: 'JUP',
			name: 'Jupiter',
			amountHeld: 150,
			costBasis: 0.95, // Average buy price
			currentPrice: 0.87,
			currentValue: 130.50, // 150 * 0.87
			unrealizedPnl: -12.00, // (0.87 - 0.95) * 150
			pnlPercentage: -8.42, // ((0.87 - 0.95) / 0.95) * 100
			hasPurchaseData: true,
		}),
		create(TokenPnLSchema, {
			coinId: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
			symbol: 'USDC',
			name: 'USD Coin',
			amountHeld: 250.0,
			costBasis: 1.0,
			currentPrice: 1.0,
			currentValue: 250.0,
			unrealizedPnl: 0.0,
			pnlPercentage: 0.0,
			hasPurchaseData: true,
		}),
		create(TokenPnLSchema, {
			coinId: 'DankCoin1111111111111111111111111111111',
			symbol: 'DANK',
			name: 'DankCoin',
			amountHeld: 50000,
			costBasis: 0.000025, // Average buy price
			currentPrice: 0.000042,
			currentValue: 2.10, // 50000 * 0.000042
			unrealizedPnl: 0.85, // (0.000042 - 0.000025) * 50000
			pnlPercentage: 68.0, // ((0.000042 - 0.000025) / 0.000025) * 100
			hasPurchaseData: true,
		}),
		create(TokenPnLSchema, {
			coinId: 'MoonToken111111111111111111111111111111',
			symbol: 'MOON',
			name: 'Safe Moon',
			amountHeld: 2500,
			costBasis: 0.0, // No purchase data
			currentPrice: 0.00123,
			currentValue: 3.075, // 2500 * 0.00123
			unrealizedPnl: 0.0,
			pnlPercentage: 0.0,
			hasPurchaseData: false, // Received via airdrop or transfer
		}),
	];

	// Calculate totals for PnL (based only on traded tokens)
	const totalCostBasis = tokenPnls
		.filter(token => token.hasPurchaseData)
		.reduce((sum, token) => sum + (token.amountHeld * token.costBasis), 0);
	const totalUnrealizedPnl = tokenPnls.reduce((sum, token) => sum + token.unrealizedPnl, 0);
	const totalPnlPercentage = totalCostBasis > 0 ? (totalUnrealizedPnl / totalCostBasis) * 100 : 0;

	// Calculate ACTUAL total portfolio value from ALL wallet balances
	let actualTotalPortfolioValue = 0;
	for (const balance of walletBalances) {
		const coin = ALL_MOCK_COINS.find((c: ProtobufCoin) =>
			c.address.toLowerCase() === balance.id.toLowerCase()
		);
		if (coin && balance.amount > 0) {
			actualTotalPortfolioValue += balance.amount * coin.price;
		}
	}

	// Special cases for testing
	if (walletAddress.includes('empty') || walletAddress.includes('no-holdings')) {
		return create(GetPortfolioPnLResponseSchema, {
			totalPortfolioValue: 0,
			totalCostBasis: 0,
			totalUnrealizedPnl: 0,
			totalPnlPercentage: 0,
			totalHoldings: 0,
			tokenPnls: [],
		});
	}

	if (walletAddress.includes('loss') || walletAddress.includes('negative')) {
		// Return a portfolio with overall losses
		const lossTokens = [
			create(TokenPnLSchema, {
				coinId: 'MoonToken111111111111111111111111111111',
				symbol: 'MOON',
				name: 'Safe Moon',
				amountHeld: 10000,
				costBasis: 0.002,
				currentPrice: 0.00123,
				currentValue: 12.30,
				unrealizedPnl: -7.70,
				pnlPercentage: -38.5,
				hasPurchaseData: true,
			}),
		];
		// Still calculate actual portfolio value from all balances for loss scenario
		let lossScenarioTotalValue = 0;
		for (const balance of walletBalances) {
			const coin = ALL_MOCK_COINS.find((c: ProtobufCoin) =>
				c.address.toLowerCase() === balance.id.toLowerCase()
			);
			if (coin && balance.amount > 0) {
				lossScenarioTotalValue += balance.amount * coin.price;
			}
		}

		return create(GetPortfolioPnLResponseSchema, {
			totalPortfolioValue: lossScenarioTotalValue, // Use actual wallet total
			totalCostBasis: 20.0,
			totalUnrealizedPnl: -7.70,
			totalPnlPercentage: -38.5,
			totalHoldings: 1,
			tokenPnls: lossTokens,
		});
	}

	return create(GetPortfolioPnLResponseSchema, {
		totalPortfolioValue: actualTotalPortfolioValue, // Use wallet balances total
		totalCostBasis: totalCostBasis,
		totalUnrealizedPnl: totalUnrealizedPnl,
		totalPnlPercentage: totalPnlPercentage,
		totalHoldings: tokenPnls.length,
		tokenPnls: tokenPnls,
	});
}

// Endpoint Handlers Map
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const endpointHandlers: { [key: string]: (options?: FetchInit) => Promise<any> } = {
	// Legacy endpoint
	'/dankfolio.v1.coinservice/getavailablecoins': handleGetAvailableCoins,

	// New specific RPC endpoints
	'/dankfolio.v1.coinservice/getnewcoins': handleGetNewCoins,
	'/dankfolio.v1.coinservice/gettrendingcoins': handleGetTrendingCoins,
	'/dankfolio.v1.coinservice/gettopgainerscoins': handleGetTopGainersCoins,
	'/dankfolio.v1.coinservice/getxstockscoins': handleGetXStocksCoins,

	// Search endpoints
	'/dankfolio.v1.coinservice/search': handleSearchCoins, // Proper proto endpoint
	'/dankfolio.v1.coinservice/searchcoinbymint': handleSearchCoinByMint,
	'/dankfolio.v1.coinservice/searchcoinbyaddress': handleSearchCoinByMint, // Support both mint and address

	// Coin info endpoints
	'/dankfolio.v1.coinservice/getcoinbyid': handleGetCoinById,
	'/dankfolio.v1.coinservice/getcoinsbyids': handleGetCoinsByIDs,
	'/dankfolio.v1.coinservice/getallcoins': handleGetAllCoins,

	// Wallet endpoints
	'/dankfolio.v1.walletservice/getwalletbalances': handleGetWalletBalances,
	'/dankfolio.v1.walletservice/createwallet': handleCreateWallet,
	'/dankfolio.v1.walletservice/preparetransfer': handlePrepareTransfer,
	'/dankfolio.v1.walletservice/submittransfer': handleSubmitTransfer,
	'/dankfolio.v1.walletservice/getportfoliopnl': handleGetPortfolioPnL,

	// Utility endpoints
	'/dankfolio.v1.utilityservice/getproxiedimage': handleGetProxiedImage,

	// Price endpoints
	'/dankfolio.v1.priceservice/getpricehistory': handleGetPriceHistory,
	'/dankfolio.v1.priceservice/getcoinprices': handleGetCoinPrices,
	'/dankfolio.v1.priceservice/getpricehistoriesbyids': handleGetPriceHistoriesByIDs,

	// Trade endpoints
	'/dankfolio.v1.tradeservice/getswapquote': handleGetSwapQuote,
	'/dankfolio.v1.tradeservice/prepareswap': handlePrepareSwap,
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

	// Debug: Log all incoming requests
	console.log(`🎭 Mock API: Incoming request to ${normalizedPath}`);

	try {
		const handler = endpointHandlers[normalizedPath];
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let mockResponse: any;

		if (handler) {
			console.log(`🎭 Mock API: Handling ${normalizedPath}`);
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
