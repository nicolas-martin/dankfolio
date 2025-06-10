import { env } from '@/utils/env';
import { create } from '@bufbuild/protobuf';
import {
	GetAvailableCoinsResponseSchema,
	SearchResponseSchema,
	SearchCoinByMintResponseSchema,
	type Coin as ProtobufCoin
} from '@/gen/dankfolio/v1/coin_pb';
import {
	GetWalletBalancesResponseSchema,
	BalanceSchema,
	WalletBalanceSchema
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
	ListTradesResponseSchema
} from '@/gen/dankfolio/v1/trade_pb';

import { MOCK_TRENDING_COINS, MOCK_NEW_COINS, ALL_MOCK_COINS, MOCK_WALLET_BALANCES } from './mockData';
import { generatePriceHistory } from './helpers';

type FetchInput = string | URL | Request;
type FetchInit = RequestInit;

// Original fetch function reference
export const originalFetch = global.fetch;

// Mock fetch implementation
export const mockFetch = async (url: FetchInput, options?: FetchInit): Promise<any> => {
	const urlString = url.toString();
	const apiUrl = env.apiUrl; // Use the correct environment variable

	console.log('🎭 Mock fetch called with URL:', urlString);
	console.log('🎭 Expected API URL:', apiUrl);
	console.log('🎭 URL starts with API URL?', urlString.startsWith(apiUrl));

	// Only intercept calls to our API
	if (!urlString.startsWith(apiUrl)) {
		console.log('🎭 Not intercepting - URL does not start with API URL');
		return originalFetch(url, options);
	}

	// Parse the gRPC service and method from URL
	const path = urlString.replace(apiUrl, '');

	console.log('🎭 Mock API intercepting request:', { url: urlString, path, apiUrl });

	try {
		let mockResponse: any;

		// Handle both Connect-Web style URLs and traditional gRPC URLs
		const normalizedPath = path.replace(/^\/+/, '/').toLowerCase(); // Ensure single leading slash and lowercase

		console.log('🎭 Normalized path for comparison:', normalizedPath);

		switch (normalizedPath) {
			case '/dankfolio.v1.coinservice/getavailablecoins': {
				console.log('🎭 Returning mock GetAvailableCoins response');
				// Check if request is for trending only
				let requestData: any = {};
				if (options?.body) {
					try {
						requestData = JSON.parse(options.body as string);
					} catch (e) {
						// Ignore parsing errors
					}
				}

				const coinsToReturn = requestData.trendingOnly ? MOCK_TRENDING_COINS : ALL_MOCK_COINS;
				const response = create(GetAvailableCoinsResponseSchema, {
					coins: coinsToReturn,
				});
				mockResponse = response;
				break;
			}

			case '/dankfolio.v1.coinservice/search': {
				console.log('🎭 Returning mock Search response for /search endpoint (capital S = fetchNewCoins)');
				// This is the fetchNewCoins call - return new coins sorted by jupiter_listed_at desc
				console.log('🎭 ✅ Returning new coins (fetchNewCoins call detected via URL path)');
				const coinsToReturn = MOCK_NEW_COINS;

				console.log('🎭 New coins being returned:', coinsToReturn.map(c => ({ symbol: c.symbol, name: c.name, jupiterListedAt: c.jupiterListedAt ? new Date(Number(c.jupiterListedAt.seconds) * 1000).toISOString() : null })));

				const response = create(SearchResponseSchema, {
					coins: coinsToReturn,
					totalCount: coinsToReturn.length,
				});
				mockResponse = response;
				break;
			}

			case '/dankfolio.v1.coinservice/searchcoins': {
				console.log('🎭 Returning mock SearchCoins response for /searchcoins endpoint (general search)');
				// This is a general search call - return trending coins
				console.log('🎭 ❌ Returning trending coins for general search');
				const coinsToReturn = MOCK_TRENDING_COINS.slice(0, 3);

				console.log('🎭 Trending coins being returned:', coinsToReturn.map(c => ({ symbol: c.symbol, name: c.name })));

				const response = create(SearchResponseSchema, {
					coins: coinsToReturn,
					totalCount: coinsToReturn.length,
				});
				mockResponse = response;
				break;
			}

			case '/dankfolio.v1.coinservice/searchcoinbymint': {
				console.log('🎭 Returning mock SearchCoinByMint response');
				// Return the first coin as a mock result
				const response = create(SearchCoinByMintResponseSchema, {
					coin: ALL_MOCK_COINS[0],
				});
				mockResponse = response;
				break;
			}

			case '/dankfolio.v1.coinservice/getcoinbyid': {
				console.log('🎭 Returning mock GetCoinByID response');
				// Parse request to get the mint address
				let mintAddress = 'So11111111111111111111111111111111111111112'; // Default to SOL

				if (options?.body) {
					try {
						let requestData;

						// Handle Connect-Web request body format (Uint8Array)
						if (options.body instanceof Uint8Array) {
							const decoder = new TextDecoder();
							const bodyString = decoder.decode(options.body);
							requestData = JSON.parse(bodyString);
						} else if (typeof options.body === 'string') {
							requestData = JSON.parse(options.body);
						} else {
							requestData = options.body;
						}

						if (requestData.mintAddress) {
							mintAddress = requestData.mintAddress;
						}
					} catch (e) {
						// Ignore parsing errors, use default
					}
				}

				// Find the coin by mint address or return the first one as fallback
				const coin = ALL_MOCK_COINS.find((c: ProtobufCoin) => c.mintAddress === mintAddress) || ALL_MOCK_COINS[0];

				mockResponse = coin;
				break;
			}

			case '/dankfolio.v1.walletservice/getwalletbalances': {
				console.log('🎭 Returning mock GetWalletBalances response');

				// Parse request to get the wallet address for different test scenarios
				let walletAddress = '';
				if (options?.body) {
					try {
						let requestData;

						// Handle Connect-Web request body format (Uint8Array)
						if (options.body instanceof Uint8Array) {
							const decoder = new TextDecoder();
							const bodyString = decoder.decode(options.body);
							requestData = JSON.parse(bodyString);
						} else if (typeof options.body === 'string') {
							requestData = JSON.parse(options.body);
						} else {
							requestData = options.body;
						}

						if (requestData.address) {
							walletAddress = requestData.address;
						}
					} catch (e) {
						// Ignore parsing errors, use default
					}
				}

				console.log('🎭 Mock API checking wallet address:', walletAddress);

				// Handle different test scenarios based on address
				if (walletAddress.includes('NetworkError') || walletAddress.includes('network-error')) {
					// Simulate network error
					console.log('🎭 Simulating network error for address:', walletAddress);
					throw new Error('NETWORK_ERROR: Unable to connect to Solana network');
				}

				if (walletAddress.includes('InvalidAddress') || walletAddress === 'invalid-address') {
					// Simulate invalid address error
					console.log('🎭 Simulating invalid address error for:', walletAddress);
					throw new Error('INVALID_ADDRESS: Invalid wallet address format');
				}

				if (walletAddress.includes('Unused') || walletAddress.includes('unused')) {
					// Simulate unused address (valid but no balance)
					console.log('🎭 Simulating unused address for:', walletAddress);
					const walletBalance = create(WalletBalanceSchema, {
						balances: [], // Empty balances for unused address
					});
					const response = create(GetWalletBalancesResponseSchema, {
						walletBalance,
					});
					mockResponse = response;
					break;
				}

				if (walletAddress.includes('Active') || walletAddress.includes('GgaBFkzjuvMV7RCrZyt65zx7iRo7W6Af4cGXZMKNxK2R')) {
					// Simulate active address with balance
					console.log('🎭 Simulating active address with balance for:', walletAddress);
					const activeBalances = [
						create(BalanceSchema, { id: 'So11111111111111111111111111111111111111112', amount: 2.5 }), // SOL
						create(BalanceSchema, { id: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', amount: 100.0 }), // USDC
					];
					const walletBalance = create(WalletBalanceSchema, {
						balances: activeBalances,
					});
					const response = create(GetWalletBalancesResponseSchema, {
						walletBalance,
					});
					mockResponse = response;
					break;
				}

				// Default case - return standard mock balances
				const walletBalance = create(WalletBalanceSchema, {
					balances: MOCK_WALLET_BALANCES,
				});
				const response = create(GetWalletBalancesResponseSchema, {
					walletBalance,
				});
				mockResponse = response;
				break;
			}

			case '/dankfolio.v1.priceservice/getpricehistory': {
				console.log('🎭 Returning mock GetPriceHistory response');
				// Parse request to get the coin address
				let coinAddress = 'So11111111111111111111111111111111111111112'; // Default to SOL
				if (options?.body) {
					try {
						const requestData = JSON.parse(options.body as string);
						if (requestData.address) {
							coinAddress = requestData.address;
						}
					} catch (e) {
						// Ignore parsing errors, use default
					}
				}

				// Find the coin to get its price (SOL is at index 4 in MOCK_TRENDING_COINS)
				const coin = ALL_MOCK_COINS.find((c: ProtobufCoin) => c.mintAddress === coinAddress) || MOCK_TRENDING_COINS[4]; // Default to SOL
				const isStablecoin = coin.tags.includes('stablecoin');

				const data = create(PriceHistoryDataSchema, {
					items: generatePriceHistory(coin.price, isStablecoin),
				});

				const response = create(GetPriceHistoryResponseSchema, {
					data,
					success: true,
				});
				mockResponse = response;
				break;
			}

			case '/dankfolio.v1.priceservice/getcoinprices': {
				console.log('🎭 Returning mock GetCoinPrices response');
				// This endpoint returns current prices for multiple coins
				// We'll generate randomized prices based on the base prices with some variation

				const mockPrices: { [key: string]: number } = {};

				// Add some randomization to base prices (±5% variation)
				ALL_MOCK_COINS.forEach(coin => {
					const basePrice = coin.price;
					const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
					const randomizedPrice = basePrice * (1 + variation);
					mockPrices[coin.mintAddress] = Math.max(randomizedPrice, basePrice * 0.1); // Don't go below 10% of base price
				});

				console.log('🎭 Generated randomized coin prices:', Object.keys(mockPrices).map(mint => ({
					mint: mint.substring(0, 8) + '...',
					price: mockPrices[mint]
				})));

				// Return the prices in the expected format
				mockResponse = {
					prices: mockPrices
				};
				break;
			}

			case '/dankfolio.v1.tradeservice/getswapquote': {
				console.log('🎭 Returning mock GetSwapQuote response');
				const response = create(GetSwapQuoteResponseSchema, {
					estimatedAmount: '0.95',
					exchangeRate: '0.95',
					fee: '0.0025',
					priceImpact: '0.1',
					routePlan: ['Direct'],
					inputMint: 'So11111111111111111111111111111111111111112',
					outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
				});
				mockResponse = response;
				break;
			}

			case '/dankfolio.v1.tradeservice/prepareswap': {
				console.log('🎭 Returning mock PrepareSwap response');
				const mockTransactionBase64 = 'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQAGCekCd/S1HV8txmyKfIAWKWxswDuUWLUqjZYc6PbaNJgCS6xdNRGIgknfxCI44w8fMixamF6aM2jvWuJv9F6HQGCYGhB4xuDMrDdhavUhIeB7Cm55/scPKspWwzD2R6pEoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwZGb+UhFzL/7K26csOb57yM5bvF9xJrLEObOkAAAAAEedVb8jHAbu50xW7OaBUH/bGy3qP0jlECsc2iVrwTjwbd9uHXZaGT2cvhRs7reawctIXtX1s3kTqM9YV+/wCpjJclj04kifG7PRApFI4NgwtaE5na/xCEBI572Nvp+Fm0P/on9df2SnTAmx8pWHneSwmrNt/J3VFLMhqns4zl6Ay7y3ZxksVsqzi2N3jHaFEqLW3iYBGcYX3hKK2J6TtECAQABQILSwIABAAJA6AsAAAAAAAABwYAAgAPAwYBAQMCAAIMAgAAAIwMCAAAAAAABgECAREHBgABABEDBgEBBRsGAAIBBREFCAUOCw4NCgIBEQ8JDgAGBhAODAUj5RfLl3rjrSoBAAAAJmQAAYwMCAAAAAAA3IhZ0AEAAABQAAAGAwIAAAEJAWpgiN9xbBUoxnUHH86lRaehpUhg3jmT4dhHYEv2EYR2BX9ZW36DBC4CdVo=';
				const response = create(PrepareSwapResponseSchema, {
					unsignedTransaction: mockTransactionBase64
				});
				mockResponse = response;
				break;
			}

			case '/dankfolio.v1.walletservice/preparetransfer': {
				console.log('🎭 Returning mock PrepareTransfer response (WalletService)');
				// Use a simple, valid legacy transaction format for testing
				// This is a minimal SOL transfer transaction that can be parsed by Transaction.from()
				const mockTransactionBase64 = 'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAEDArczbMia1tLmq2poQQFqpk1DjxsqKE8GeC9ryYH1HdwvGGZjAZdDGA7Pr6QQlnw0VJXaPQvvKQVUMtq7m8OiWQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABUpTYB5Tb+LKsJQWZbJuXaPgODJ8XYzMUqv2V0+PYUAAAQIAAAEMANQBAAAAAAAA';
				const response = {
					unsignedTransaction: mockTransactionBase64
				};
				mockResponse = response;
				break;
			}

			case '/dankfolio.v1.tradeservice/submitswap': {
				console.log('🎭 Returning mock SubmitSwap response');
				const response = create(SubmitSwapResponseSchema, {
					tradeId: 'mock_trade_id_e2e_test_67890',
					transactionHash: 'mock_transaction_hash_abcdef123456'
				});
				mockResponse = response;
				break;
			}

			case '/dankfolio.v1.tradeservice/getswapstatus': {
				console.log('🎭 Returning mock GetSwapStatus response');
				// Since this endpoint doesn't exist in protobuf, return a plain object
				// that matches TradeStatusResponse interface
				const response = {
					transaction_hash: 'mock_transaction_hash_abcdef123456',
					status: 'Finalized',
					confirmations: 32,
					finalized: true
				};
				mockResponse = response;
				break;
			}

			case '/dankfolio.v1.tradeservice/gettrade': {
				console.log('🎭 Returning mock GetTrade response');
				const response = create(TradeSchema, {
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
					finalized: true
				});
				mockResponse = response;
				break;
			}

			case '/dankfolio.v1.tradeservice/listtrades': {
				console.log('🎭 Returning mock ListTrades response');
				// Create a mock trade that represents our completed swap
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
					finalized: true
				});

				const response = create(ListTradesResponseSchema, {
					trades: [mockTrade],
					totalCount: 1
				});
				mockResponse = response;
				break;
			}

			default:
				console.log('🎭 Unhandled endpoint, falling back to original fetch:', normalizedPath);
				console.log('🎭 Available endpoints:', [
					'/dankfolio.v1.coinservice/getavailablecoins',
					'/dankfolio.v1.coinservice/search',
					'/dankfolio.v1.coinservice/getcoinbyid',
					'/dankfolio.v1.walletservice/getwalletbalances',
					'/dankfolio.v1.walletservice/preparetransfer',
					'/dankfolio.v1.priceservice/getpricehistory',
					'/dankfolio.v1.priceservice/getcoinprices',
					'/dankfolio.v1.tradeservice/getswapquote',
					'/dankfolio.v1.tradeservice/prepareswap',
					'/dankfolio.v1.tradeservice/submitswap',
					'/dankfolio.v1.tradeservice/getswapstatus',
					'/dankfolio.v1.tradeservice/gettrade',
					'/dankfolio.v1.tradeservice/listtrades'
				]);
				// For unhandled endpoints, call the original fetch
				return originalFetch(url, options);
		}

		console.log('🎭 Mock API returning response for:', normalizedPath);

		// Create a mock Response object with BigInt and Timestamp-safe serialization
		const responseBody = JSON.stringify(mockResponse, (key, value) => {
			// Convert BigInt to string for JSON serialization
			if (typeof value === 'bigint') {
				return value.toString();
			}
			// Convert Timestamp objects to the format expected by protobuf JSON
			if (value && typeof value === 'object' && value.$typeName === 'google.protobuf.Timestamp') {
				// Convert to ISO string format that protobuf can parse
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
			headers: new Headers({
				'Content-Type': 'application/json',
			}),
			text: async () => responseBody,
			json: async () => JSON.parse(responseBody),
		} as any;

	} catch (error) {
		console.error('🎭 Mock API error:', error);
		// Fall back to original fetch on error
		return originalFetch(url, options);
	}
};
