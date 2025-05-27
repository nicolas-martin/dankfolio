import { create } from 'zustand';
import { PriceData } from '@/types';

interface PriceHistoryCache {
	[key: string]: {
		data: PriceData[];
		expiry: number;
	};
}

interface PriceHistoryCacheStore {
	cache: PriceHistoryCache;
	getCache: (key: string) => { data: PriceData[]; expiry: number } | undefined;
	setCache: (key: string, data: PriceData[], expiry: number) => void;
	clearExpiredCache: () => void;
}

const usePriceHistoryCacheStore = create<PriceHistoryCacheStore>((set, get) => ({
	cache: {},
	getCache: (key: string) => {
		const cachedItem = get().cache[key];
		if (cachedItem && cachedItem.expiry > Date.now()) {
			return cachedItem;
		}
		return undefined;
	},
	setCache: (key: string, data: PriceData[], expiry: number) => {
		set((state) => ({
			cache: {
				...state.cache,
				[key]: { data, expiry },
			},
		}));
	},
	clearExpiredCache: () => {
		const now = Date.now();
		const newCache: PriceHistoryCache = {};
		for (const key in get().cache) {
			if (get().cache[key].expiry > now) {
				newCache[key] = get().cache[key];
			}
		}
		set({ cache: newCache });
	},
}));

export default usePriceHistoryCacheStore;
