import { create } from 'zustand';
import { Coin } from '@/types';

interface NewCoinsCache {
	data: Coin[];
	expiry: number;
	lastFetched: number;
}

interface NewCoinsCacheStore {
	cache: NewCoinsCache | null;
	getCache: () => NewCoinsCache | null;
	setCache: (data: Coin[], expiry: number) => void;
	clearCache: () => void;
	isExpired: () => boolean;
}

const useNewCoinsCacheStore = create<NewCoinsCacheStore>((set, get) => ({
	cache: null,

	getCache: () => {
		const cache = get().cache;
		if (cache && cache.expiry > Date.now()) {
			return cache;
		}
		return null;
	},

	setCache: (data: Coin[], expiry: number) => {
		set({
			cache: {
				data,
				expiry,
				lastFetched: Date.now(),
			},
		});
	},

	clearCache: () => {
		set({ cache: null });
	},

	isExpired: () => {
		const cache = get().cache;
		return !cache || cache.expiry <= Date.now();
	},
}));

export default useNewCoinsCacheStore; 
