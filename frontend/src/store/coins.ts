import { create } from 'zustand';
import { Coin } from '../types';
import api from '../services/api';

interface CoinState {
	availableCoins: Coin[];
	coinMap: Record<string, Coin>;
	isLoading: boolean;
	error: string | null;

	// Actions
	setAvailableCoins: (coins: Coin[]) => void;
	setCoin: (coin: Coin) => void;
	fetchAvailableCoins: () => Promise<void>;
	getCoinByID: (id: string) => Promise<Coin | null>;
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

	fetchAvailableCoins: async () => {
		try {
			set({ isLoading: true, error: null });
			const coins = await api.getAvailableCoins();

			// Make sure SOL is included in available coins
			const solCoin = coins.find(c => c.id === 'So11111111111111111111111111111111111111112');
			if (!solCoin) {
				console.log('🔍 SOL not found in available coins, fetching separately...');
				const solData = await api.getCoinByID('So11111111111111111111111111111111111111112');
				coins.unshift(solData); // Add SOL at the beginning of the array
			}

			console.log('💰 Available coins:', coins.map(c => ({ symbol: c.symbol, id: c.id })));

			// Update both availableCoins and coinMap
			const coinMap = coins.reduce((acc, coin) => {
				acc[coin.id] = coin;
				return acc;
			}, {} as Record<string, Coin>);

			set({ availableCoins: coins, coinMap });
			console.log('🗺️ Updated coin store:', {
				availableCoinsCount: coins.length,
				coinMapSize: Object.keys(coinMap).length,
				hasSol: !!coinMap['So11111111111111111111111111111111111111112']
			});
		} catch (error) {
			set({ error: (error as Error).message });
			console.error('❌ Error fetching available coins:', error);
		} finally {
			set({ isLoading: false });
		}
	},

	getCoinByID: async (id: string) => {
		const state = get();
		if (state.coinMap[id]) {
			console.log("💰 Found coin in state:", {
				id,
				symbol: state.coinMap[id].symbol,
				price: state.coinMap[id].price,
				decimals: state.coinMap[id].decimals
			});
			return state.coinMap[id];
		}

		try {
			const coin = await api.getCoinByID(id);
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
