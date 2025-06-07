import { create } from 'zustand';
import { Coin } from '@/types';
import { grpcApi } from '@/services/grpcApi';
import { logger as log } from '@/utils/logger';
import { SOLANA_ADDRESS, REFRESH_INTERVALS } from '@/utils/constants';
import useNewCoinsCacheStore from './newCoinsCache';

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
	fetchNewCoins: (limit?: number, forceRefresh?: boolean) => Promise<void>;
	clearNewCoinsCache: () => void;
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
		} catch (error: unknown) {
			if (error instanceof Error) {
				set({ error: error.message, isLoading: false });
				log.error(`❌ Error fetching ${trendingOnly ? 'trending' : 'all'} available coins:`, error.message);
			} else {
				set({ error: 'An unknown error occurred', isLoading: false });
				log.error(`❌ An unknown error occurred while fetching ${trendingOnly ? 'trending' : 'all'} available coins:`, error);
			}
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
		} catch (error: unknown) {
			if (error instanceof Error) {
				log.error(`❌ [CoinStore] Error fetching coin ${mintAddress}:`, error.message);
				set({ error: error.message });
			} else {
				log.error(`❌ [CoinStore] An unknown error occurred while fetching coin ${mintAddress}:`, error);
				set({ error: 'An unknown error occurred' });
			}
			log.log(`🪙 [CoinStore] Error in getCoinByID(${mintAddress}) | availableCoins: ${get().availableCoins.length}, coinMap keys: [${Object.keys(get().coinMap).join(', ')}]`);
			return null;
		}
	},

	fetchNewCoins: async (limit: number = 10, forceRefresh: boolean = false) => {
		const state = get();

		// Check cache first (unless force refresh is requested)
		if (!forceRefresh) {
			const cachedData = useNewCoinsCacheStore.getState().getCache();
			if (cachedData) {
				log.log('🆕 [CoinStore] Using cached new coins data', {
					cachedCoinsCount: cachedData.data.length,
					cacheExpiry: new Date(cachedData.expiry).toISOString(),
					lastFetched: new Date(cachedData.lastFetched).toISOString()
				});

				// Update store with cached data
				set({
					newlyListedCoins: cachedData.data,
					isLoadingNewlyListed: false,
				});
				return;
			}
		}

		log.log('🆕 [CoinStore] Cache miss or force refresh - fetching newly listed coins via GRPC search...', {
			limit,
			forceRefresh,
			cacheExpired: useNewCoinsCacheStore.getState().isExpired()
		});

		set({ isLoadingNewlyListed: true, error: null });
		try {
			// Add debug log before the API call
			log.log('🔍 [CoinStore] Preparing search request with params:', {
				query: '',
				tags: [],
				minVolume24h: 0,
				limit: limit,
				offset: 0,
				sortBy: 'jupiter_listed_at',
				sortDesc: true,
			});

			// Use grpcApi.searchCoins to call the Search RPC method
			// Sort by 'jupiter_listed_at' to get the newest coins first
			const response = await grpcApi.searchCoins({
				query: '',
				tags: [],
				minVolume24h: 0, // Include all coins regardless of volume
				limit: limit,
				offset: 0,
				sortBy: 'jupiter_listed_at', // Sort by Jupiter listing date
				sortDesc: true, // Newest first
			});

			// Add debug log for the raw response structure
			log.log('🔍 [CoinStore] Raw response structure check:', {
				responseType: typeof response,
				hasCoinsProperty: response && 'coins' in response,
				coinsArrayLength: response?.coins?.length || 0,
				firstCoinKeys: response?.coins?.[0] ? Object.keys(response.coins[0]) : []
			});

			// Safely log coin data without BigInt serialization issues
			log.log('🔍 [CoinStore] Coin data sample (first coin):', response?.coins?.[0] ? {
				symbol: response.coins[0].symbol,
				mintAddress: response.coins[0].mintAddress,
				jupiterListedAt: response.coins[0].jupiterListedAt ? 
					response.coins[0].jupiterListedAt.toISOString() : 'undefined',
				price: response.coins[0].price,
				dailyVolume: response.coins[0].dailyVolume
			} : 'No coins returned');

			// Log the raw gRPC response
			log.log('🔍 [CoinStore] Raw gRPC response for newly listed coins:', {
				totalCoins: response.coins.length,
				requestParams: { limit, sortBy: 'jupiter_listed_at', sortDesc: true },
				coins: response.coins.map(coin => ({
					symbol: coin.symbol,
					mintAddress: coin.mintAddress,
					jupiterListedAt: coin.jupiterListedAt ? coin.jupiterListedAt.toISOString() : null,
					price: coin.price,
					dailyVolume: coin.dailyVolume
				}))
			});

			const fetchedCoins = response.coins;

			// Check for duplicates in the backend response and log them clearly
			const mintAddresses = fetchedCoins.map(coin => coin.mintAddress);
			const uniqueMintAddresses = new Set(mintAddresses);

			if (mintAddresses.length !== uniqueMintAddresses.size) {
				const duplicates = mintAddresses.filter((address, index) =>
					mintAddresses.indexOf(address) !== index
				);
				const uniqueDuplicates = [...new Set(duplicates)];

				log.error('🚨 [CoinStore] DUPLICATE COINS DETECTED IN BACKEND RESPONSE!', {
					totalCoins: fetchedCoins.length,
					uniqueCoins: uniqueMintAddresses.size,
					duplicateCount: mintAddresses.length - uniqueMintAddresses.size,
					duplicateMintAddresses: uniqueDuplicates,
					duplicateCoins: fetchedCoins.filter(coin => uniqueDuplicates.includes(coin.mintAddress))
						.map(coin => ({
							symbol: coin.symbol,
							mintAddress: coin.mintAddress,
							name: coin.name
						}))
				});
			} else {
				log.log('✅ [CoinStore] No duplicates detected in backend response');
			}

			// Modified: Don't filter out coins that are in coinMap - we want to show newly listed coins
			// regardless of whether they're in the coinMap. Only filter out duplicates.
			log.log('🔍 [CoinStore] Using fetched coins directly without filtering against coinMap', {
				fetchedCoinsCount: fetchedCoins.length
			});

			// Cache the newly fetched data with expiry time
			const cacheExpiryMs = Date.now() + REFRESH_INTERVALS.NEW_COINS;
			useNewCoinsCacheStore.getState().setCache(fetchedCoins, cacheExpiryMs);

			log.log('💾 [CoinStore] Cached new coins data', {
				cachedCoinsCount: fetchedCoins.length,
				cacheExpiry: new Date(cacheExpiryMs).toISOString()
			});

			set({
				newlyListedCoins: fetchedCoins,
				// DON'T update coinMap here - keep new coins separate
				isLoadingNewlyListed: false,
			});

			// Update the last fetched timestamp on successful fetch
			state.setLastFetchedNewCoinsAt(Date.now());

			log.log(`🆕 [CoinStore] ✅ Successfully fetched ${fetchedCoins.length} coins via GRPC, using all fetched coins for display.`);
		} catch (error: unknown) {
			if (error instanceof Error) {
				set({ error: error.message, isLoadingNewlyListed: false });
				log.error('❌ [CoinStore] Error fetching newly listed coins via GRPC:', error.message);
				log.error('❌ [CoinStore] Error details:', {
					name: error.name,
					message: error.message,
					stack: error.stack
				});
			} else {
				set({ error: 'An unknown error occurred', isLoadingNewlyListed: false });
				log.error('❌ [CoinStore] An unknown error occurred while fetching newly listed coins via GRPC:', error);
			}
		}
	},

	clearNewCoinsCache: () => {
		useNewCoinsCacheStore.getState().clearCache();
		set({
			newlyListedCoins: [],
			isLoadingNewlyListed: false,
		});
		set({ lastFetchedNewCoinsAt: 0 });
		log.log('🆕 [CoinStore] New coins cache cleared');
	},
}));
