import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export interface Coin {
  id: string;
  name: string;
  symbol: string;
  price: number;
  description?: string;
  icon_url: string;
  decimals: number;
  daily_volume: number;
  tags: string[];
  priceChange24h?: number;
  priceChangePercentage24h?: number;
  balance?: number;
  metadata?: {
    website?: string;
    twitter?: string;
    discord?: string;
    telegram?: string;
  };
  jupiterInfo?: {
    tags?: string[];
    decimals?: number;
  };
}

export interface Wallet {
  address: string;
  privateKey: string;
  balance: number;
}

export type RootStackParamList = {
  Home: undefined;
  Trade: {
    initialFromCoin?: Coin;
    initialToCoin?: Coin;
    wallet?: string;
    coins?: Coin[];
  };
  Profile: undefined;
  CoinDetail: {
    coinId: string;
    coinName: string;
  };
  CoinSelect: {
    onSelect: (coinId: string) => void;
    excludeCoinId?: string;
    currentCoinId?: string;
  };
  [key: string]: undefined | object;
}

export interface NotificationProps {
  visible: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onDismiss: () => void;
}

export type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export interface ScreenProps {
  navigation: NavigationProp;
}

export interface Trade {
  id: string;
  from_coin_id: string;
  to_coin_id: string;
  amount: number;
  fee: number;
  status: 'completed' | 'failed' | 'pending';
  created_at: string;
}

export interface PriceData {
  timestamp: string;
  value: string | number;
  unixTime?: number;
}

export interface Token {
  symbol: string;
  name: string;
  balance: number;
  value: number;
  percentage: number;
  address: string;
  logoURI?: string;
}

// Re-export all types from other files
export * from './trade'; 