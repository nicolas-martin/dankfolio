import { create } from 'zustand';
import { grpcApi } from 'src/services/grpcApi'; // Assuming grpcApi is where the client is exposed
import {
  GetNewCoinsRequest,
  GetTrendingCoinsRequest,
  GetTopGainersCoinsRequest,
  Coin as GrpcCoin, // Assuming this is the gRPC Coin type
} from 'src/gen/dankfolio/v1/coin_pb'; // Adjust import path as necessary

// Assuming a local Coin type for the frontend store
export interface Coin {
  mintAddress: string;
  name: string;
  symbol: string;
  decimals: number;
  description: string;
  iconUrl: string;
  resolvedIconUrl?: string;
  tags: string[];
  price: number;
  dailyVolume: number;
  website?: string;
  twitter?: string;
  telegram?: string;
  coingeckoId?: string;
  createdAt?: Date; // Assuming conversion from Timestamp
  lastUpdated?: Date; // Assuming conversion from Timestamp
  isTrending: boolean;
  jupiterListedAt?: Date; // Assuming conversion from Timestamp
  priceChangePercentage24h?: number;
  volume24hUsd?: number;
  liquidity?: number;
  volume24hChangePercent?: number;
  fdv?: number;
  marketCap?: number;
  rank?: number;
}

// Helper to convert gRPC Coin to frontend Coin type
// Adjust based on actual gRPC Timestamp handling (e.g., .toDate() if available)
const mapGrpcCoinToCoin = (grpcCoin: GrpcCoin.AsObject): Coin => {
  return {
    mintAddress: grpcCoin.mintAddress,
    name: grpcCoin.name,
    symbol: grpcCoin.symbol,
    decimals: grpcCoin.decimals,
    description: grpcCoin.description,
    iconUrl: grpcCoin.iconUrl,
    resolvedIconUrl: grpcCoin.resolvedIconUrl,
    tags: grpcCoin.tagsList,
    price: grpcCoin.price,
    dailyVolume: grpcCoin.dailyVolume,
    website: grpcCoin.website,
    twitter: grpcCoin.twitter,
    telegram: grpcCoin.telegram,
    coingeckoId: grpcCoin.coingeckoId,
    createdAt: grpcCoin.createdAt ? new Date(grpcCoin.createdAt.seconds * 1000 + grpcCoin.createdAt.nanos / 1e6) : undefined,
    lastUpdated: grpcCoin.lastUpdated ? new Date(grpcCoin.lastUpdated.seconds * 1000 + grpcCoin.lastUpdated.nanos / 1e6) : undefined,
    isTrending: grpcCoin.isTrending,
    jupiterListedAt: grpcCoin.jupiterListedAt ? new Date(grpcCoin.jupiterListedAt.seconds * 1000 + grpcCoin.jupiterListedAt.nanos / 1e6) : undefined,
    priceChangePercentage24h: grpcCoin.priceChangePercentage24h,
    volume24hUsd: grpcCoin.volume24hUsd,
    liquidity: grpcCoin.liquidity,
    volume24hChangePercent: grpcCoin.volume24hChangePercent,
    fdv: grpcCoin.fdv,
    marketCap: grpcCoin.marketCap,
    rank: grpcCoin.rank,
  };
};

interface CoinState {
  newCoins: Coin[];
  trendingCoins: Coin[];
  topGainersCoins: Coin[];
  newCoinsLoading: boolean;
  trendingCoinsLoading: boolean;
  topGainersCoinsLoading: boolean;
  newCoinsError?: Error;
  trendingCoinsError?: Error;
  topGainersCoinsError?: Error;
  fetchNewCoins: (limit?: number, offset?: number) => Promise<void>;
  fetchTrendingCoins: (limit?: number, offset?: number) => Promise<void>;
  fetchTopGainersCoins: (limit?: number, offset?: number) => Promise<void>;
}

export const useCoinStore = create<CoinState>((set) => ({
  newCoins: [],
  trendingCoins: [],
  topGainersCoins: [],
  newCoinsLoading: false,
  trendingCoinsLoading: false,
  topGainersCoinsLoading: false,
  newCoinsError: undefined,
  trendingCoinsError: undefined,
  topGainersCoinsError: undefined,

  fetchNewCoins: async (limit = 20, offset = 0) => {
    set({ newCoinsLoading: true, newCoinsError: undefined });
    try {
      const request = new GetNewCoinsRequest();
      request.setLimit(limit);
      request.setOffset(offset);
      // Assuming grpcApi.coin.getNewCoins returns a promise that resolves to the response object
      const response = await grpcApi.coin.getNewCoins(request);
      const coins = response.getCoinsList().map(mapGrpcCoinToCoin);
      set({ newCoins: coins, newCoinsLoading: false });
    } catch (error: any) {
      set({ newCoinsError: error, newCoinsLoading: false });
      console.error('Failed to fetch new coins:', error);
    }
  },

  fetchTrendingCoins: async (limit = 20, offset = 0) => {
    set({ trendingCoinsLoading: true, trendingCoinsError: undefined });
    try {
      const request = new GetTrendingCoinsRequest();
      request.setLimit(limit);
      request.setOffset(offset);
      const response = await grpcApi.coin.getTrendingCoins(request);
      const coins = response.getCoinsList().map(mapGrpcCoinToCoin);
      set({ trendingCoins: coins, trendingCoinsLoading: false });
    } catch (error: any) {
      set({ trendingCoinsError: error, trendingCoinsLoading: false });
      console.error('Failed to fetch trending coins:', error);
    }
  },

  fetchTopGainersCoins: async (limit = 20, offset = 0) => {
    set({ topGainersCoinsLoading: true, topGainersCoinsError: undefined });
    try {
      const request = new GetTopGainersCoinsRequest();
      request.setLimit(limit);
      request.setOffset(offset);
      const response = await grpcApi.coin.getTopGainersCoins(request);
      const coins = response.getCoinsList().map(mapGrpcCoinToCoin);
      set({ topGainersCoins: coins, topGainersCoinsLoading: false });
    } catch (error: any) {
      set({ topGainersCoinsError: error, topGainersCoinsLoading: false });
      console.error('Failed to fetch top gainers coins:', error);
    }
  },
}));
