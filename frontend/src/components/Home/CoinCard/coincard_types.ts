import { Coin } from '@/types';

export interface CoinCardProps {
	coin: Coin;
	onPress: (coin: Coin) => void;
	balance?: number; // Assuming balance is optional as per original
	value?: number;   // Assuming value is optional
	isHorizontal?: boolean; // New prop
}
