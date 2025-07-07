import { create } from 'zustand';
import { grpcApi } from '@services/grpcApi';

// Using the Coin type from grpc model instead of redefining it
import type { Coin } from '@services/grpc/model';

// Constants for SOL identification
export const NATIVE_SOL_MINT = '11111111111111111111111111111111';
export const WRAPPED_SOL_MINT = 'So11111111111111111111111111111111111111112';

// Helper function to create SOL coin objects
const createSolCoin = (isNative: boolean): Coin => ({
	address: isNative ? NATIVE_SOL_MINT : WRAPPED_SOL_MINT,
	name: isNative ? 'Solana' : 'Wrapped SOL',
	symbol: isNative ? 'SOL' : 'wSOL',
	decimals: 9,
	description: isNative ? 'Native Solana token' : 'Wrapped Solana token',
	logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
	price: 0, // Will be populated from market data
	tags: isNative ? ['native'] : ['wrapped'],
	website: 'https://solana.com',
	twitter: 'https://twitter.com/solana',
});

interface CoinState {
	availableCoins: Coin[];
	newCoins: Coin[];
	trendingCoins: Coin[];
	topGainersCoins: Coin[];
	coinMap: Record<string, Coin>;
	newCoinsLoading: boolean;
	trendingCoinsLoading: boolean;
	topGainersCoinsLoading: boolean;
	newCoinsError?: Error;
	trendingCoinsError?: Error;
	topGainersCoinsError?: Error;
	fetchAvailableCoins: (limit?: number, offset?: number) => Promise<void>;
	fetchNewCoins: (limit?: number, offset?: number) => Promise<void>;
	fetchTrendingCoins: (limit?: number, offset?: number) => Promise<void>;
	fetchTopGainersCoins: (limit?: number, offset?: number) => Promise<void>;
	getCoinByID: (address: string, forceRefresh?: boolean) => Promise<Coin | null>;
	setCoin: (coin: Coin) => void;
}

export const useCoinStore = create<CoinState>((set, get) => {
	return {
		availableCoins: [],
		newCoins: [],
		trendingCoins: [],
		topGainersCoins: [],
		coinMap: {},
		newCoinsLoading: false,
		trendingCoinsLoading: false,
		topGainersCoinsLoading: false,
		newCoinsError: undefined,
		trendingCoinsError: undefined,
		topGainersCoinsError: undefined,

		fetchAvailableCoins: async (limit?: number, offset?: number) => {
			try {
				const coins = await grpcApi.getAvailableCoins(limit, offset);
				// Update coinMap with the fetched coins
				const coinMap = coins.reduce((acc: Record<string, Coin>, coin: Coin) => {
					acc[coin.address] = coin;
					return acc;
				}, {} as Record<string, Coin>);
				set({ availableCoins: coins, coinMap });
			} catch (error: unknown) {
				console.error('Failed to fetch available coins:', error);
			}
		},

		fetchNewCoins: async (limit = 20, offset = 0) => {
			set({ newCoinsLoading: true, newCoinsError: undefined });
			try {
				// Use the new direct grpcApi method
				const coins = await grpcApi.getNewCoins(limit, offset);
				set({ newCoins: coins, newCoinsLoading: false });
			} catch (error: unknown) {
				const errorObj = error instanceof Error ? error : new Error('Failed to fetch new coins');
				set({ newCoinsError: errorObj, newCoinsLoading: false });
				console.error('Failed to fetch new coins:', error);
			}
		},

		fetchTrendingCoins: async (limit = 20, offset = 0) => {
			set({ trendingCoinsLoading: true, trendingCoinsError: undefined });
			try {
				// Use the new direct grpcApi method
				const coins = await grpcApi.getTrendingCoins(limit, offset);
				set({ trendingCoins: coins, trendingCoinsLoading: false });
			} catch (error: unknown) {
				const errorObj = error instanceof Error ? error : new Error('Failed to fetch trending coins');
				set({ trendingCoinsError: errorObj, trendingCoinsLoading: false });
				console.error('Failed to fetch trending coins:', error);
			}
		},

		fetchTopGainersCoins: async (limit = 20, offset = 0) => {
			set({ topGainersCoinsLoading: true, topGainersCoinsError: undefined });
			try {
				// Use the new direct grpcApi method
				const coins = await grpcApi.getTopGainersCoins(limit, offset);
				set({ topGainersCoins: coins, topGainersCoinsLoading: false });
			} catch (error: unknown) {
				const errorObj = error instanceof Error ? error : new Error('Failed to fetch top gainers coins');
				set({ topGainersCoinsError: errorObj, topGainersCoinsLoading: false });
				console.error('Failed to fetch top gainers coins:', error);
			}
		},

		setCoin: (coin: Coin) => {
			set(state => ({
				coinMap: { ...state.coinMap, [coin.address]: coin }
			}));
		},

		getCoinByID: async (address: string, forceRefresh: boolean = false) => {
			const state = get();
			
			// Handle native SOL
			if (address === NATIVE_SOL_MINT) {
				if (!forceRefresh && state.coinMap[address]) {
					return state.coinMap[address];
				}
				// Create native SOL coin and fetch price from wrapped SOL
				const nativeSolCoin = createSolCoin(true);
				try {
					const wrappedSolCoin = await grpcApi.getCoinByID(WRAPPED_SOL_MINT);
					nativeSolCoin.price = wrappedSolCoin.price;
					nativeSolCoin.price24hChangePercent = wrappedSolCoin.price24hChangePercent;
					nativeSolCoin.marketcap = wrappedSolCoin.marketcap;
					nativeSolCoin.volume24hUSD = wrappedSolCoin.volume24hUSD;
				} catch (error) {
					console.warn(`⚠️ [CoinStore] Could not fetch price for native SOL:`, error);
				}
				get().setCoin(nativeSolCoin);
				return nativeSolCoin;
			}
			
			// Handle wrapped SOL and other tokens
			if (!forceRefresh && state.coinMap[address]) {
				return state.coinMap[address];
			}

			try {
				const coin = await grpcApi.getCoinByID(address);
				// If it's wrapped SOL, ensure proper naming
				if (address === WRAPPED_SOL_MINT) {
					coin.symbol = 'wSOL';
					coin.name = 'Wrapped SOL';
				}
				get().setCoin(coin);
				return coin;
			} catch (error) {
				console.error(`❌ [CoinStore] Error fetching coin ${address}:`, error);
				return null;
			}
		},
	};
});
