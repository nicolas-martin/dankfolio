// Simple API mocking for React Native E2E tests
import { env } from '@/utils/env';
import { create } from '@bufbuild/protobuf';
import { timestampFromDate } from '@bufbuild/protobuf/wkt';

type FetchInput = string | URL | Request;
type FetchInit = RequestInit;
import {
	GetAvailableCoinsResponseSchema,
	SearchResponseSchema,
	SearchCoinByMintResponseSchema,
	CoinSchema,
	type Coin as ProtobufCoin
} from '@/gen/dankfolio/v1/coin_pb';
import type {
	Balance
} from '@/gen/dankfolio/v1/wallet_pb';
import {
	GetWalletBalancesResponseSchema,
	BalanceSchema,
	WalletBalanceSchema
} from '@/gen/dankfolio/v1/wallet_pb';
import type {
	PriceHistoryItem
} from '@/gen/dankfolio/v1/price_pb';
import {
	GetPriceHistoryResponseSchema,
	PriceHistoryDataSchema,
	PriceHistoryItemSchema
} from '@/gen/dankfolio/v1/price_pb';


import {
	GetSwapQuoteResponseSchema,
	PrepareSwapResponseSchema,
	SubmitSwapResponseSchema,
	TradeSchema,
	ListTradesResponseSchema
} from '@/gen/dankfolio/v1/trade_pb';

// Environment flag to enable/disable mocking
let mockingEnabled = false;

// Mock trending coins (complete data)
const MOCK_TRENDING_COINS: ProtobufCoin[] = [
	create(CoinSchema, {
		mintAddress: 'DankCoin1111111111111111111111111111111',
		name: 'DankCoin',
		symbol: 'DANK',
		decimals: 9,
		description: 'The dankest meme coin on Solana',
		iconUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
		resolvedIconUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
		tags: ['meme', 'community'],
		price: 0.000042,
		dailyVolume: 1250000,
		website: 'https://dankcoin.meme',
		twitter: 'https://twitter.com/dankcoin',
		coingeckoId: 'dank-coin',
		createdAt: timestampFromDate(new Date('2024-01-15')),
		lastUpdated: timestampFromDate(new Date()),
		isTrending: true,
		jupiterListedAt: timestampFromDate(new Date('2024-01-20')),
	}),
	create(CoinSchema, {
		mintAddress: 'MoonToken111111111111111111111111111111',
		name: 'Moon Token',
		symbol: 'MOON',
		decimals: 6,
		description: 'To the moon and beyond! 🚀',
		iconUrl: 'https://arweave.net/KSXBz7Rp8OX_5_8cqz8JVqNuDVhOqJD7qJQJ5QJ5QJ5',
		resolvedIconUrl: 'https://arweave.net/KSXBz7Rp8OX_5_8cqz8JVqNuDVhOqJD7qJQJ5QJ5QJ5',
		tags: ['meme', 'moon'],
		price: 0.00123,
		dailyVolume: 890000,
		website: 'https://moontoken.space',
		twitter: 'https://twitter.com/moontoken',
		coingeckoId: 'moon-token',
		createdAt: timestampFromDate(new Date('2024-02-01')),
		lastUpdated: timestampFromDate(new Date()),
		isTrending: true,
		jupiterListedAt: timestampFromDate(new Date('2024-02-05')),
	}),
	create(CoinSchema, {
		mintAddress: 'Bonk111111111111111111111111111111111111',
		name: 'Bonk',
		symbol: 'BONK',
		decimals: 5,
		description: 'The first Solana dog coin for the people, by the people',
		iconUrl: 'https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I',
		resolvedIconUrl: 'https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I',
		tags: ['meme', 'dog', 'community'],
		price: 0.0000089,
		dailyVolume: 2100000,
		website: 'https://bonkcoin.com',
		twitter: 'https://twitter.com/bonk_inu',
		coingeckoId: 'bonk',
		createdAt: timestampFromDate(new Date('2022-12-25')),
		lastUpdated: timestampFromDate(new Date()),
		isTrending: false,
		jupiterListedAt: timestampFromDate(new Date('2023-01-01')),
	}),
	create(CoinSchema, {
		mintAddress: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
		name: 'Jupiter',
		symbol: 'JUP',
		decimals: 6,
		description: 'The key infrastructure for Solana trading',
		iconUrl: 'https://static.jup.ag/jup/icon.png',
		resolvedIconUrl: 'https://static.jup.ag/jup/icon.png',
		tags: ['defi', 'infrastructure'],
		price: 0.87,
		dailyVolume: 15600000,
		website: 'https://jup.ag',
		twitter: 'https://twitter.com/JupiterExchange',
		coingeckoId: 'jupiter-exchange-solana',
		createdAt: timestampFromDate(new Date('2023-10-19')),
		lastUpdated: timestampFromDate(new Date()),
		isTrending: false,
		jupiterListedAt: timestampFromDate(new Date('2023-10-19')),
	}),
	create(CoinSchema, {
		mintAddress: 'So11111111111111111111111111111111111111112',
		name: 'Wrapped SOL',
		symbol: 'SOL',
		decimals: 9,
		description: 'Wrapped Solana',
		iconUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
		resolvedIconUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
		tags: ['native'],
		price: 98.45,
		dailyVolume: 45000000,
		website: 'https://solana.com',
		twitter: 'https://twitter.com/solana',
		coingeckoId: 'solana',
		createdAt: timestampFromDate(new Date('2020-03-16')),
		lastUpdated: timestampFromDate(new Date()),
		isTrending: false,
		jupiterListedAt: timestampFromDate(new Date('2021-09-09')),
	}),
	create(CoinSchema, {
		mintAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
		name: 'USD Coin',
		symbol: 'USDC',
		decimals: 6,
		description: 'USD Coin',
		iconUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
		resolvedIconUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
		tags: ['stablecoin'],
		price: 1.0,
		dailyVolume: 125000000,
		website: 'https://centre.io',
		twitter: 'https://twitter.com/centre_io',
		coingeckoId: 'usd-coin',
		createdAt: timestampFromDate(new Date('2018-09-26')),
		lastUpdated: timestampFromDate(new Date()),
		isTrending: false,
		jupiterListedAt: timestampFromDate(new Date('2021-09-09')),
	}),
];

// Mock new coins (less complete data, sorted by jupiter_listed_at desc)
const MOCK_NEW_COINS: ProtobufCoin[] = [
	create(CoinSchema, {
		mintAddress: 'NewCoin1111111111111111111111111111111',
		name: 'Fresh Meme',
		symbol: 'FRESH',
		decimals: 9,
		description: 'Brand new meme coin just listed',
		iconUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
		resolvedIconUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
		tags: ['meme', 'new'],
		price: 0.0000001,
		dailyVolume: 50000,
		website: '', // Missing data for new coins
		twitter: '', // Missing data for new coins
		coingeckoId: '', // Missing data for new coins
		createdAt: timestampFromDate(new Date('2024-12-01')), // Very recent
		lastUpdated: timestampFromDate(new Date()),
		isTrending: false,
		jupiterListedAt: timestampFromDate(new Date('2024-12-01')), // Most recent listing
	}),
	create(CoinSchema, {
		mintAddress: 'RocketCoin111111111111111111111111111',
		name: 'Rocket Launch',
		symbol: 'ROCKET',
		decimals: 6,
		description: 'New rocket-themed token',
		iconUrl: 'https://static.jup.ag/jup/icon.png',
		resolvedIconUrl: 'https://static.jup.ag/jup/icon.png',
		tags: ['meme', 'space'],
		price: 0.000005,
		dailyVolume: 125000,
		website: '', // Missing data for new coins
		twitter: 'https://twitter.com/rocketcoin', // Partial data
		coingeckoId: '', // Missing data for new coins
		createdAt: timestampFromDate(new Date('2024-11-28')),
		lastUpdated: timestampFromDate(new Date()),
		isTrending: false,
		jupiterListedAt: timestampFromDate(new Date('2024-11-28')), // Second most recent
	}),
	create(CoinSchema, {
		mintAddress: 'DiamondCoin11111111111111111111111111',
		name: 'Diamond Hands',
		symbol: 'DIAMOND',
		decimals: 8,
		description: 'For true diamond hands only',
		iconUrl: 'https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I',
		resolvedIconUrl: 'https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I',
		tags: ['meme', 'diamond'],
		price: 0.000012,
		dailyVolume: 75000,
		website: 'https://diamondcoin.gem', // Some data available
		twitter: '', // Missing data for new coins
		coingeckoId: '', // Missing data for new coins
		createdAt: timestampFromDate(new Date('2024-11-25')),
		lastUpdated: timestampFromDate(new Date()),
		isTrending: false,
		jupiterListedAt: timestampFromDate(new Date('2024-11-25')), // Third most recent
	}),
];

// All coins combined for general searches
const ALL_MOCK_COINS = [...MOCK_TRENDING_COINS, ...MOCK_NEW_COINS];

// Mock wallet balances using exact gRPC types
const MOCK_WALLET_BALANCES: Balance[] = [
	create(BalanceSchema, { id: 'So11111111111111111111111111111111111111112', amount: 2.5 }), // SOL
	create(BalanceSchema, { id: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', amount: 1000.0 }), // USDC
	create(BalanceSchema, { id: 'DankCoin1111111111111111111111111111111', amount: 5000000.0 }), // DANK
	create(BalanceSchema, { id: 'MoonToken111111111111111111111111111111', amount: 250000.0 }), // MOON
	create(BalanceSchema, { id: 'Bonk111111111111111111111111111111111111', amount: 10000000.0 }), // BONK
	create(BalanceSchema, { id: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', amount: 150.0 }), // JUP
];

// Generate realistic price history with random walk
function generatePriceHistory(basePrice: number, isStablecoin = false): PriceHistoryItem[] {
	const items: PriceHistoryItem[] = [];
	const now = Date.now();
	const fourHoursAgo = now - (4 * 60 * 60 * 1000); // 4 hours ago
	const interval = (4 * 60 * 60 * 1000) / 24; // 24 data points over 4 hours

	let currentPrice = basePrice;
	const volatility = isStablecoin ? 0.001 : 0.05; // 0.1% for stablecoins, 5% for others
	const meanReversion = 0.1; // Tendency to revert to base price

	for (let i = 0; i < 24; i++) {
		const timestamp = fourHoursAgo + (i * interval);

		// Random walk with mean reversion
		const randomChange = (Math.random() - 0.5) * 2 * volatility;
		const meanReversionForce = (basePrice - currentPrice) * meanReversion * volatility;
		const priceChange = randomChange + meanReversionForce;

		currentPrice = Math.max(currentPrice * (1 + priceChange), basePrice * 0.5); // Prevent going below 50% of base
		currentPrice = Math.min(currentPrice, basePrice * 2); // Prevent going above 200% of base

		items.push(create(PriceHistoryItemSchema, {
			unixTime: BigInt(Math.floor(timestamp / 1000)), // Convert to seconds and BigInt as per protobuf
			value: currentPrice,
		}));
	}

	return items;
}

// Original fetch function reference
const originalFetch = global.fetch;

// Mock fetch implementation
const mockFetch = async (url: FetchInput, options?: FetchInit): Promise<any> => {
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

// Function to enable API mocking
export function enableApiMocking(): void {
	if (mockingEnabled) return;

	console.log('🎭 Enabling API mocking with gRPC-compatible responses');

	// Replace global fetch with our mock
	global.fetch = mockFetch;
	mockingEnabled = true;

	// Set global flag for debug wallet
	(global as any).__E2E_MOCKING_ENABLED__ = true;
}

// Function to disable API mocking
export function disableApiMocking(): void {
	if (!mockingEnabled) return;

	console.log('🎭 Disabling API mocking');

	// Restore original fetch
	global.fetch = originalFetch;
	mockingEnabled = false;

	// Clear global flag
	(global as any).__E2E_MOCKING_ENABLED__ = false;
}

