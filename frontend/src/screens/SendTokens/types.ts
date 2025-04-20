import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@types/navigation';

export type SendTokensScreenProps = NativeStackScreenProps<RootStackParamList, 'SendTokens'>;

export interface TokenTransferFormData {
	toAddress: string;
	amount: string;
	selectedTokenMint: string;
}

export interface TokenOption {
	value: string;
	label: string;
	balance: number;
} 
