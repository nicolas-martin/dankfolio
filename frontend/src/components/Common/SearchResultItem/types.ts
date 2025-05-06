import { Coin } from '@/types';

export interface SearchResultItemProps {
	coin: Coin;
	onPress?: (coin: Coin) => void;
	isEnriched?: boolean;
} 