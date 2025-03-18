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
  price_change_24h?: number;
  tags?: string[];
}

export interface Wallet {
  address: string;
  privateKey: string;
  balance: number;
}

export type RootStackParamList = {
  Home: undefined;
  CoinDetail: {
    coinId: string;
    coinName: string;
    daily_volume?: number;
  };
  Trade: {
    coinId: string;
    coinName: string;
  };
  Profile: Record<string, never>;
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