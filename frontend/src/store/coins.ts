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
	newlyListedCoins: Coin[];
	isLoadingNewlyListed: boolean;
	fetchNewCoins: (limit?: number) => Promise<void>;
	// enrichCoin was here
	lastFetchedNewCoinsAt: number;
	setLastFetchedNewCoinsAt: (timestamp: number) => void;
}

export const useCoinStore = create<CoinState>((set, get) => ({
	availableCoins: [],
	coinMap: {},
	isLoading: false,
	error: null,
	newlyListedCoins: [],
	isLoadingNewlyListed: false,
	lastFetchedNewCoinsAt: 0,

	setLastFetchedNewCoinsAt: (timestamp: number) => set({ lastFetchedNewCoinsAt: timestamp }),

	// enrichCoin implementation was here

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
		const cachedCoin = state.coinMap[mintAddress];

		if (!forceRefresh && cachedCoin && cachedCoin.description) { // Check for description
			log.log("💰 [CoinStore] Found complete coin in state (cache hit):", {
				mintAddress,
				symbol: cachedCoin.symbol,
				price: cachedCoin.price,
				decimals: cachedCoin.decimals,
				hasDescription: !!cachedCoin.description
			});
			log.log(`🪙 [CoinStore] Cache hit getCoinByID(${mintAddress}) | availableCoins: ${get().availableCoins.length}, coinMap keys: [${Object.keys(get().coinMap).join(', ')}]`);
			return cachedCoin;
		}

		// If forceRefresh is true, or coin is not in map, or coin is in map but lacks description,
		// then proceed to fetch from API.
		log.log(`[CoinStore] Fetching coin ${mintAddress} from API (Reason: forceRefresh=${forceRefresh}, cacheMiss=${!cachedCoin}, incomplete=${!!cachedCoin && !cachedCoin.description}).`);
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
	},

	fetchNewCoins: async (limit: number = 10) => {
		log.log('🆕 [CoinStore] Fetching newly listed coins...');
		set({ isLoadingNewlyListed: true, error: null }); // Assuming existing 'error' can be reused or add a new one.
		try {
			// Assuming grpcApi.searchCoins will be available and configured
			// to call the Search RPC method.
			// We use 'jupiter_listed_at' as per our backend proto update.
			const response = await grpcApi.searchCoins({
				query: '',
				tags: [],
				minVolume24h: 0, // Or a suitable low value
				limit: limit,
				offset: 0,
				sortBy: 'jupiter_listed_at', // Ensure this matches the proto
				sortDesc: true,
			});

			const fetchedCoins = response.coins; // Assuming response structure { coins: Coin[], totalCount: number }

			const state = get();
			// Filter out coins that are already in the main coinMap
			const newCoinsToConsider = fetchedCoins.filter(fc => !state.coinMap[fc.mintAddress]);

			// Update coinMap with these new coins as well, but only if they are not already there
			// (though filtered above, this is a safeguard for coinMap update logic)
			const currentCoinMap = state.coinMap;
			const updatedCoinMap = newCoinsToConsider.reduce((acc: Record<string, Coin>, newCoin: Coin) => {
				if (!acc[newCoin.mintAddress]) { // Ensure not to overwrite existing enhanced coins in map
					acc[newCoin.mintAddress] = newCoin;
				}
				return acc;
			}, { ...currentCoinMap } as Record<string, Coin>);

			// Filter for newlyListedCoins: must not be in availableCoins
			const trulyNewCoins = newCoinsToConsider.filter(nc =>
				!state.availableCoins.some(ac => ac.mintAddress === nc.mintAddress)
			);

			set({
				newlyListedCoins: trulyNewCoins,
				coinMap: updatedCoinMap,
				isLoadingNewlyListed: false,
			});
			log.log(`🆕 [CoinStore] Successfully fetched ${fetchedCoins.length} coins, ${trulyNewCoins.length} are truly new.`);
		} catch (err) {
			const errorMessage = (err instanceof Error) ? err.message : 'An unknown error occurred';
			set({ error: errorMessage, isLoadingNewlyListed: false }); // Reuse existing error state
			log.error('❌ [CoinStore] Error fetching newly listed coins:', errorMessage);
		}
	},
}));
