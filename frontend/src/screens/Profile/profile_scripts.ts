import Clipboard from '@react-native-clipboard/clipboard';
import { NotificationProps } from '@/types';
import { ProfileCoin } from './profile_types';
import { logger } from '@/utils/logger';

export const handleTokenPress = (token: ProfileCoin['coin'], navigate: (screen: string, params: unknown) => void) => {
	logger.breadcrumb({
		category: 'navigation',
		message: 'Navigating to CoinDetail from ProfileScreen token press',
		data: { coinSymbol: token.symbol, coinMint: token.mintAddress },
	});
	navigate('CoinDetail', { coin: token });
};

export const copyToClipboard = async (text: string, type: string, showToast: (props: NotificationProps) => void) => {
	try {
		Clipboard.setString(text);
		logger.breadcrumb({ category: 'ui', message: 'Copied to clipboard', data: { type, textLength: text.length } });
		showToast({
			type: 'success',
			message: `${type} address copied to clipboard`,
			duration: 2000
		});
	} catch (error) {
		logger.breadcrumb({ category: 'ui', level: 'error', message: 'Failed to copy to clipboard', data: { type } });
		showToast({
			type: 'error',
			message: 'Failed to copy to clipboard',
			duration: 2000
		});
	}
};

export const formatAddress = (address: string): string => {
	if (!address) return '';
	return `${address.slice(0, 4)}...${address.slice(-4)}`;
};

export const sortTokensByValue = (tokens: ProfileCoin[]): ProfileCoin[] => {
	return [...tokens].sort((a, b) => b.value - a.value);
};

export const handleRefresh = async (
	wallet: { address: string },
	setIsRefreshing: (value: boolean) => void,
	fetchPortfolioBalance: (address: string) => Promise<void>,
	showToast: (props: NotificationProps) => void
) => {
	if (!wallet) return;
	// Breadcrumb for refresh initiation is in Profile/index.tsx as it's UI initiated
	setIsRefreshing(true);
	try {
		await fetchPortfolioBalance(wallet.address);
	} catch (error) {
		showToast({
			message: 'Error refreshing portfolio',
			type: 'error'
		});
	} finally {
		setIsRefreshing(false);
	}
};
