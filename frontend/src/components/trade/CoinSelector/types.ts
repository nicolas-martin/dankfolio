import { TextInput } from 'react-native';
import { Coin } from '../../../types';

export interface CoinData {
	coin: Coin;
	balance?: {
		amount: number;
		value?: number;
	};
}

export interface CoinSelectorProps {
	label: string;
	coinData: CoinData;
	amount: {
		value: string;
		onChange?: (amount: string) => void;
		isLoading?: boolean;
	};
	isInput?: boolean;
	inputRef?: React.RefObject<TextInput>;
} 