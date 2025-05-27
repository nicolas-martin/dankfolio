import create from 'zustand';

interface PriceHistoryCache {
  [key: string]: {
    data: any; // Replace 'any' with the actual data type for price history
    expiry: number;
  };
}

interface PriceHistoryCacheStore {
  cache: PriceHistoryCache;
  getCache: (key: string) => { data: any; expiry: number } | undefined;
  setCache: (key: string, data: any, expiry: number) => void;
  clearExpiredCache: () => void;
}

const usePriceHistoryCacheStore = create<PriceHistoryCacheStore>((set, get) => ({
  cache: {},
  getCache: (key) => {
    const cachedItem = get().cache[key];
    if (cachedItem && cachedItem.expiry > Date.now()) {
      return cachedItem;
    }
    return undefined;
  },
  setCache: (key, data, expiry) => {
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
