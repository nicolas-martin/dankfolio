import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

export interface Wallet {
  address: string;
  privateKey: string;
  balance: number;
}

import { Coin } from '../types';

export type { Coin };

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