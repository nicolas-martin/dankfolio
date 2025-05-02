import { create } from 'zustand';
import { Coin } from '@/types';
import { grpcApi } from '@/services/grpcApi';
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
	getCoinByID: (mintAddress: string, forceRefresh?: boolean) => Promise<Coin | null>;
}

export const useCoinStore = create<CoinState>((set, get) => ({
	availableCoins: [],
	coinMap: {},
	isLoading: false,
	error: null,

	setAvailableCoins: (coins: Coin[]) => {
		const coinMap = coins.reduce((acc, coin) => {
			acc[coin.mintAddress] = coin;
			return acc;
		}, {} as Record<string, Coin>);
		set({ availableCoins: coins, coinMap });
	},

	setCoin: (coin: Coin) => set(state => ({
		coinMap: { ...state.coinMap, [coin.mintAddress]: coin }
	})),

	fetchAvailableCoins: async (trendingOnly?: boolean) => {
		try {
			set({ isLoading: true, error: null });
			const coins = await grpcApi.getAvailableCoins(trendingOnly);

			if (!trendingOnly) {
				const solCoin = coins.find((c: Coin) => c.mintAddress === SOLANA_ADDRESS);
				if (!solCoin) {
					console.log('🔍 SOL not found in available coins, fetching separately...');
					const solData = await get().getCoinByID(SOLANA_ADDRESS, true);
					if (solData) {
						coins.unshift(solData);
					}
				}
			}

			// Always update coinMap immediately after fetching available coins
			const coinMap = coins.reduce((acc: Record<string, Coin>, coin: Coin) => {
				acc[coin.mintAddress] = coin;
				return acc;
			}, {} as Record<string, Coin>);
			set({ coinMap });

			console.log(`💰 Fetched ${trendingOnly ? 'trending' : 'all'} available coins:`, coins.map((c: Coin) => ({ symbol: c.symbol, mintAddress: c.mintAddress })));

			// Update availableCoins regardless of trendingOnly flag
			set({ availableCoins: coins, isLoading: false });

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

	getCoinByID: async (mintAddress: string, forceRefresh: boolean = false) => {
		const state = get();
		if (!forceRefresh && state.coinMap[mintAddress]) {
			console.log("💰 Found coin in state:", {
				mintAddress,
				symbol: state.coinMap[mintAddress].symbol,
				price: state.coinMap[mintAddress].price,
				decimals: state.coinMap[mintAddress].decimals
			});
			return state.coinMap[mintAddress];
		}

		try {
			const coin = await grpcApi.getCoinByID(mintAddress);
			console.log("💰 Fetched coin from API:", {
				mintAddress,
				symbol: coin.symbol,
				price: coin.price,
				decimals: coin.decimals
			});
			state.setCoin(coin);
			return coin;
		} catch (error) {
			console.error(`❌ Error fetching coin ${mintAddress}:`, error);
			set({ error: (error as Error).message });
			return null;
		}
	}
}));
