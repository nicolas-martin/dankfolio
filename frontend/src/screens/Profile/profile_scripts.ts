import { PortfolioToken } from '@/store/portfolio';
import { logger } from '@/utils/logger';
import { Coin } from '@/types';

// Constants
const WALLET_ADDRESS_DISPLAY_LENGTH = 4;

// Token management functions
export const sortTokensByValue = (tokens: PortfolioToken[]): PortfolioToken[] => {
	return [...tokens].sort((a, b) => b.value - a.value);
};

export const calculateTotalPortfolioValue = (tokens: PortfolioToken[]): number => {
	return tokens.reduce((sum, token) => sum + token.value, 0);
};

export const createCoinCardProps = (token: PortfolioToken) => ({
	...token.coin,
	value: token.value,
	balance: token.amount
});

// Navigation handlers
export const handleTokenPress = (token: Coin, navigate: (screen: string, params: unknown) => void) => {
	logger.breadcrumb({
		category: 'navigation',
		message: 'Navigating to CoinDetail from ProfileScreen token press',
		data: { coinSymbol: token.symbol, coinMint: token.address },
	});
	navigate('CoinDetail', { coin: token });
};

// Utility functions
export const formatAddress = (address: string): string => {
	if (!address) return '';
	return `${address.slice(0, WALLET_ADDRESS_DISPLAY_LENGTH)}...${address.slice(-WALLET_ADDRESS_DISPLAY_LENGTH)}`;
};

