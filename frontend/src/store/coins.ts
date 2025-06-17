import { create } from 'zustand';
import { grpcApi } from '@services/grpcApi';

// Using the Coin type from grpc model instead of redefining it
import type { Coin } from '@services/grpc/model';

interface CoinState {
	newCoins: Coin[];
	trendingCoins: Coin[];
	topGainersCoins: Coin[];
	newCoinsLoading: boolean;
	trendingCoinsLoading: boolean;
	topGainersCoinsLoading: boolean;
	newCoinsError?: Error;
	trendingCoinsError?: Error;
	topGainersCoinsError?: Error;
	fetchNewCoins: (limit?: number, offset?: number) => Promise<void>;
	fetchTrendingCoins: (limit?: number, offset?: number) => Promise<void>;
	fetchTopGainersCoins: (limit?: number, offset?: number) => Promise<void>;
}

export const useCoinStore = create<CoinState>((set) => ({
	newCoins: [],
	trendingCoins: [],
	topGainersCoins: [],
	newCoinsLoading: false,
	trendingCoinsLoading: false,
	topGainersCoinsLoading: false,
	newCoinsError: undefined,
	trendingCoinsError: undefined,
	topGainersCoinsError: undefined,

	fetchNewCoins: async (limit = 20, offset = 0) => {
		set({ newCoinsLoading: true, newCoinsError: undefined });
		try {
			// Use the new direct grpcApi method
			const coins = await grpcApi.getNewCoins(limit, offset);
			set({ newCoins: coins, newCoinsLoading: false });
		} catch (error: any) {
			set({ newCoinsError: error, newCoinsLoading: false });
			console.error('Failed to fetch new coins:', error);
		}
	},

	fetchTrendingCoins: async (limit = 20, offset = 0) => {
		set({ trendingCoinsLoading: true, trendingCoinsError: undefined });
		try {
			// Use the new direct grpcApi method
			const coins = await grpcApi.getTrendingCoins(limit, offset);
			set({ trendingCoins: coins, trendingCoinsLoading: false });
		} catch (error: any) {
			set({ trendingCoinsError: error, trendingCoinsLoading: false });
			console.error('Failed to fetch trending coins:', error);
		}
	},

	fetchTopGainersCoins: async (limit = 20, offset = 0) => {
		set({ topGainersCoinsLoading: true, topGainersCoinsError: undefined });
		try {
			// Use the new direct grpcApi method
			const coins = await grpcApi.getTopGainersCoins(limit, offset);
			set({ topGainersCoins: coins, topGainersCoinsLoading: false });
		} catch (error: any) {
			set({ topGainersCoinsError: error, topGainersCoinsLoading: false });
			console.error('Failed to fetch top gainers coins:', error);
		}
	},
}));
