import { Coin } from '@/types';

export interface CoinCardProps {
	coin: Coin;
	onPress: (coin: Coin) => void;
}
