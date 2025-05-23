import { create } from 'zustand';
import { Coin } from '@/types';
import { grpcApi } from '@/services/grpcApi';
import { logger as log } from '@/utils/logger';
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
		log.log(`🪙 [CoinStore] Before fetchAvailableCoins | availableCoins: ${get().availableCoins.length}, coinMap keys: [${Object.keys(get().coinMap).join(', ')}]`);
		try {
			set({ isLoading: true, error: null });
			const coins = await grpcApi.getAvailableCoins(trendingOnly);

			if (!trendingOnly) {
				const solCoin = coins.find((c: Coin) => c.mintAddress === SOLANA_ADDRESS);
				if (!solCoin) {
					log.log('SOL not found in available coins, fetching separately...'); // Changed to debug
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

			log.log(`Fetched ${trendingOnly ? 'trending' : 'all'} available coins:`, coins.map((c: Coin) => ({ symbol: c.symbol, mintAddress: c.mintAddress }))); // Changed to debug

			// Update availableCoins regardless of trendingOnly flag
			set({ availableCoins: coins, isLoading: false });

			log.log('🗺️ Updated coin store:', {
				availableCoinsCount: get().availableCoins.length,
				coinMapSize: Object.keys(get().coinMap).length,
				hasSol: !!get().coinMap[SOLANA_ADDRESS]
			});
			log.log(`🪙 [CoinStore] After fetchAvailableCoins | availableCoins: ${get().availableCoins.length}, coinMap keys: [${Object.keys(get().coinMap).join(', ')}]`);
		} catch (error) {
			set({ error: (error as Error).message, isLoading: false });
			log.error(`❌ Error fetching ${trendingOnly ? 'trending' : 'all'} available coins:`, error);
			log.log(`🪙 [CoinStore] Error in fetchAvailableCoins | availableCoins: ${get().availableCoins.length}, coinMap keys: [${Object.keys(get().coinMap).join(', ')}]`);
		}
	},

	getCoinByID: async (mintAddress: string, forceRefresh: boolean = false) => {
		log.log(`[CoinStore] getCoinByID called for ${mintAddress} (forceRefresh: ${forceRefresh})`); // Changed to debug
		log.log(`🪙 [CoinStore] Before getCoinByID(${mintAddress}, forceRefresh=${forceRefresh}) | availableCoins: ${get().availableCoins.length}, coinMap keys: [${Object.keys(get().coinMap).join(', ')}]`);
		const state = get();
		if (!forceRefresh && state.coinMap[mintAddress]) {
			log.log("💰 [CoinStore] Found coin in state (cache hit):", {
				mintAddress,
				symbol: state.coinMap[mintAddress].symbol,
				price: state.coinMap[mintAddress].price,
				decimals: state.coinMap[mintAddress].decimals
			});
			log.log(`🪙 [CoinStore] Cache hit getCoinByID(${mintAddress}) | availableCoins: ${get().availableCoins.length}, coinMap keys: [${Object.keys(get().coinMap).join(', ')}]`);
			return state.coinMap[mintAddress];
		}

		log.log(`[CoinStore] Fetching coin ${mintAddress} from API...`); // Changed to debug
		try {
			const coin = await grpcApi.getCoinByID(mintAddress);
			log.log("💰 [CoinStore] Fetched coin from API:", {
				mintAddress,
				symbol: coin.symbol,
				price: coin.price,
				decimals: coin.decimals
			});
			state.setCoin(coin);
			log.log(`🪙 [CoinStore] After API fetch getCoinByID(${mintAddress}) | availableCoins: ${get().availableCoins.length}, coinMap keys: [${Object.keys(get().coinMap).join(', ')}]`);
			return coin;
		} catch (error) {
			log.error(`❌ [CoinStore] Error fetching coin ${mintAddress}:`, error);
			set({ error: (error as Error).message });
			log.log(`🪙 [CoinStore] Error in getCoinByID(${mintAddress}) | availableCoins: ${get().availableCoins.length}, coinMap keys: [${Object.keys(get().coinMap).join(', ')}]`);
			return null;
		}
	}
}));
