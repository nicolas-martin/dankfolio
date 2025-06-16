import { create } from "zustand";
import { Coin } from "@/types"; // Assuming Coin type is available in types

interface TopTrendingGainersCacheState {
  cachedData: Coin[];
  lastFetched: number | null;
  setCache: (data: Coin[]) => void;
  clearCache: () => void;
}

export const useTopTrendingGainersCacheStore = create<TopTrendingGainersCacheState>((set) => ({
  cachedData: [],
  lastFetched: null,
  setCache: (data) => set({ cachedData: data, lastFetched: Date.now() }),
  clearCache: () => set({ cachedData: [], lastFetched: null }),
}));
