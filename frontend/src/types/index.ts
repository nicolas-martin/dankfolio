import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { WalletBalanceResponse } from '../services/api';

export interface Coin {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  description: string;
  icon_url: string;
  tags: string[];
  price: number;
  balance?: number;
  daily_volume: number;
  website?: string;
  twitter?: string;
  telegram?: string;
  coingecko_id?: string;
  created_at: string;
  last_updated?: string;
  value?: number;
  percentage?: number;
}

export interface Wallet {
  address: string;
  privateKey: string;
  balance: number;
}

export type RootStackParamList = {
  Home: undefined;
  Trade: { 
    initialFromCoin?: Coin | null;
    initialToCoin?: Coin | null;
  };
  Profile: {
    walletAddress: string;
    walletBalance: WalletBalanceResponse;
    solCoin: Coin | null;
  };
  CoinDetail: {
    coinId: string;
    coinName: string;
    daily_volume?: number;
    coin?: Coin;
    solCoin?: Coin | null;
  };
  CoinSelect: {
    onSelect: (coin: Coin) => void;
    excludeCoinId?: string;
    currentCoinId?: string;
  };
  ChartTest: undefined;
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