import { PortfolioToken } from '@/store/portfolio';
import { Coin } from '@/types';

export interface TokensListProps {
	tokens: PortfolioToken[];
	onTokenPress: (coin: Coin) => void;
}