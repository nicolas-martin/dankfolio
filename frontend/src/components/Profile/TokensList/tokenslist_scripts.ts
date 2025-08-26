import { PortfolioToken } from '@/store/portfolio';

export const sortTokensByValue = (tokens: PortfolioToken[]): PortfolioToken[] => {
	return [...tokens].sort((a, b) => b.value - a.value);
};

export const createCoinCardProps = (token: PortfolioToken) => ({
	...token.coin,
	value: token.value,
	balance: token.amount
});