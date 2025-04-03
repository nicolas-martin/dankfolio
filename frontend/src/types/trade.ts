import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from './index';

export type TradeScreenProps = NativeStackScreenProps<RootStackParamList, 'Trade'>;

// TODO: Duplicate?
export interface TradeQuoteResponse {
	estimatedAmount: string;
	exchangeRate: string;
	fee: string;
	priceImpact: string;
	routePlan: string[];
	inputMint: string;
	outputMint: string;
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
