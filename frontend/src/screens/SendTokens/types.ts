import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@navigation/types';
import { Token } from '@store/portfolio/types';

export type SendTokensScreenProps = NativeStackScreenProps<RootStackParamList, 'SendTokens'>;

export interface TokenTransferFormData {
	toAddress: string;
	amount: string;
	selectedToken: string | undefined;
}

export interface TokenOption {
	value: string;
	label: string;
	balance: number;
} 