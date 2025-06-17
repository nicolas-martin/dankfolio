import { NotificationProps } from '@/types';
import { PortfolioToken } from '@/store/portfolio';
import { logger } from '@/utils/logger';
import { Coin } from '@/types';

// Constants
export const WALLET_ADDRESS_DISPLAY_LENGTH = 4;

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

// Async operations
export const handleRefresh = async (
	wallet: { address: string },
	setIsRefreshing: (value: boolean) => void,
	fetchPortfolioBalance: (address: string, forceRefresh?: boolean) => Promise<void>,
	showToast: (props: NotificationProps) => void
) => {
	if (!wallet) return;
	
	logger.breadcrumb({ 
		category: 'profile', 
		message: 'Portfolio refresh initiated from ProfileScreen' 
	});
	
	setIsRefreshing(true);
	try {
		await fetchPortfolioBalance(wallet.address, true); // Force refresh for updated prices
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred while refreshing portfolio';
		showToast({
			message: `Error refreshing portfolio: ${errorMessage}`,
			type: 'error'
		});
	} finally {
		setIsRefreshing(false);
	}
};
