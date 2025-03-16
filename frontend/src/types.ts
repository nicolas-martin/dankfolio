export interface Coin {
  id: string;
  name: string;
  symbol: string;
  price: number;
  description?: string;
  icon_url?: string;
  iconUrl?: string;
  decimals: number;
  daily_volume?: number;
  change_24h?: number;
  tags?: string[];
  metadata?: {
    website?: string;
    twitter?: string;
    discord?: string;
    telegram?: string;
  };
}

export interface Wallet {
  address: string;
  privateKey: string;
  balance: number;
}

export interface RootStackParamList {
  Home: undefined;
  CoinDetail: { coinId: string };
  Trade: {
    initialFromCoin: Coin | null;
    initialToCoin: Coin | null;
    wallet?: string;
  };
}

// ... rest of the types ... 