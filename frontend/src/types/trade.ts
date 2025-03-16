import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { Coin, Wallet } from './index';

export type TradeScreenProps = NativeStackScreenProps<RootStackParamList, 'Trade'>;

export interface TradeQuoteResponse {
  estimatedAmount: string;
  exchangeRate: string;
  fee?: {
    total: string;
    spread: string;
    gas: string;
  };
}

export interface TradeDetails {
  estimatedFee: string;
  spread: string;
  gasFee: string;
}

export interface AmountInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onFocus?: () => void;
  inputRef?: React.RefObject<any>;
}

export interface NotificationState {
  visible: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

export interface TradeNotificationProps {
  type: NotificationState['type'];
  message: string;
  onDismiss: () => void;
} 