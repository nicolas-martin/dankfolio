import { create } from 'zustand';
import { Coin } from '@/types';
import grpcApi from '@/services/grpcApi';
import { SOLANA_ADDRESS } from '@/utils/constants';

interface CoinState {
	availableCoins: Coin[];
	coinMap: Record<string, Coin>;
	isLoading: boolean;
	error: string | null;

	// Actions
	setAvailableCoins: (coins: Coin[]) => void;
	setCoin: (coin: Coin) => void;
	fetchAvailableCoins: (trendingOnly?: boolean) => Promise<void>;
	getCoinByID: (id: string, forceRefresh?: boolean) => Promise<Coin | null>;
}

export const useCoinStore = create<CoinState>((set, get) => ({
	availableCoins: [],
	coinMap: {},
	isLoading: false,
	error: null,

	setAvailableCoins: (coins: Coin[]) => {
		const coinMap = coins.reduce((acc, coin) => {
			acc[coin.id] = coin;
			return acc;
		}, {} as Record<string, Coin>);
		set({ availableCoins: coins, coinMap });
	},

	setCoin: (coin: Coin) => set(state => ({
		coinMap: { ...state.coinMap, [coin.id]: coin }
	})),

	fetchAvailableCoins: async (trendingOnly?: boolean) => {
		try {
			set({ isLoading: true, error: null });
			const coins = await grpcApi.getAvailableCoins(trendingOnly);

			if (!trendingOnly) {
				const solCoin = coins.find(c => c.id === SOLANA_ADDRESS);
				if (!solCoin) {
					console.log('🔍 SOL not found in available coins, fetching separately...');
					const solData = await get().getCoinByID(SOLANA_ADDRESS, true);
					if (solData) {
						coins.unshift(solData);
					}
				}
			}

			// Always update coinMap immediately after fetching available coins
			const coinMap = coins.reduce((acc, coin) => {
				acc[coin.id] = coin;
				return acc;
			}, {} as Record<string, Coin>);
			set({ coinMap });

			console.log(`💰 Fetched ${trendingOnly ? 'trending' : 'all'} available coins:`, coins.map(c => ({ symbol: c.symbol, id: c.id })));

			if (!trendingOnly) {
				set({ availableCoins: coins, isLoading: false });
			} else {
				set({ isLoading: false });
			}

			console.log('🗺️ Updated coin store:', {
				availableCoinsCount: get().availableCoins.length,
				coinMapSize: Object.keys(get().coinMap).length,
				hasSol: !!get().coinMap[SOLANA_ADDRESS]
			});
		} catch (error) {
			set({ error: (error as Error).message, isLoading: false });
			console.error(`❌ Error fetching ${trendingOnly ? 'trending' : 'all'} available coins:`, error);
		}
	},

	getCoinByID: async (id: string, forceRefresh: boolean = false) => {
		const state = get();
		if (!forceRefresh && state.coinMap[id]) {
			console.log("💰 Found coin in state:", {
				id,
				symbol: state.coinMap[id].symbol,
				price: state.coinMap[id].price,
				decimals: state.coinMap[id].decimals
			});
			return state.coinMap[id];
		}

		try {
			const coin = await grpcApi.getCoinByID(id);
			console.log("💰 Fetched coin from API:", {
				id,
				symbol: coin.symbol,
				price: coin.price,
				decimals: coin.decimals
			});
			state.setCoin(coin);
			return coin;
		} catch (error) {
			console.error(`❌ Error fetching coin ${id}:`, error);
			set({ error: (error as Error).message });
			return null;
		}
	}
}));
