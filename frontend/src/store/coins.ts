import { create } from 'zustand';
import { grpcApi } from '@services/grpcApi';

// Using the Coin type from grpc model instead of redefining it
import type { Coin } from '@services/grpc/model';

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
	fetchAvailableCoins: (trendingOnly?: boolean) => Promise<void>;
	fetchNewCoins: (limit?: number, offset?: number) => Promise<void>;
	fetchTrendingCoins: (limit?: number, offset?: number) => Promise<void>;
	fetchTopGainersCoins: (limit?: number, offset?: number) => Promise<void>;
	getCoinByID: (mintAddress: string, forceRefresh?: boolean) => Promise<Coin | null>;
	setCoin: (coin: Coin) => void;
}

export const useCoinStore = create<CoinState>((set, get) => ({
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

	fetchAvailableCoins: async (trendingOnly?: boolean) => {
		try {
			const coins = await grpcApi.getAvailableCoins(trendingOnly);
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

	getCoinByID: async (mintAddress: string, forceRefresh: boolean = false) => {
		const state = get();
		if (!forceRefresh && state.coinMap[mintAddress]) {
			return state.coinMap[mintAddress];
		}

		try {
			const coin = await grpcApi.getCoinByID(mintAddress);
			get().setCoin(coin);
			return coin;
		} catch (error) {
			console.error(`❌ [CoinStore] Error fetching coin ${mintAddress}:`, error);
			return null;
		}
	},
}));
