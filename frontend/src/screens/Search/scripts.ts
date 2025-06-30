import { SearchFilters } from './types';
import { grpcApi } from '@/services/grpcApi';
import { Coin } from '@/types';
import { useCoinStore } from '@store/coins';
import { NavigationProp } from '@react-navigation/native';
import { formatPrice, formatVolume, formatPercentage } from '@/utils/numberFormat';
import { logger } from '@/utils/logger';
import { RootStackParamList } from '@/types/navigation';

export const DEBOUNCE_DELAY = 1000; // ms

export const DEFAULT_FILTERS: SearchFilters = {
	query: '',
	sortBy: 'volume24h'
};

export const searchTokens = async (filters: SearchFilters): Promise<Coin[]> => {
	try {
		const response = await grpcApi.search(filters);
		return response.coins;
	} catch (error) {
		logger.exception(error, { functionName: 'searchTokens', params: { filters } });
		throw error;
	}
};

export const performSearch = async (
	query: string,
	filters: SearchFilters = DEFAULT_FILTERS,
	limit: number = 20,
	offset: number = 0
): Promise<Coin[]> => {
	try {
		const response = await grpcApi.search({
			query,
			limit,
			offset,
			sortBy: filters.sortBy
		});
		return response.coins;
	} catch (error) {
		logger.exception(error, { functionName: 'performSearch', params: { query, filters, limit, offset } });
		throw error;
	}
};

export const getTokenLogoURI = (token: Coin): string => {
	return token.resolvedIconUrl || '';
};

export const formatTokenBalance = (balance: number, decimals: number): string => {
	if (!balance) return '0';
	return (balance / Math.pow(10, decimals)).toFixed(decimals);
};

export const handleSearchPress = (
	navigation: NavigationProp<RootStackParamList>,
	searchQuery: string
) => {
	if (!searchQuery.trim()) return;
	navigation.navigate('Search', { defaultSortBy: 'volume24h' });
};

export const getEnrichedCoinData = async (
	coin: Coin,
	getCoinByID: (id: string, forceRefresh?: boolean) => Promise<Coin | null>
): Promise<Coin | null> => {
	try {
		const enrichedCoin = await getCoinByID(coin.mintAddress, true);
		return enrichedCoin;
	} catch (error) {
		logger.exception(error, { functionName: 'getEnrichedCoinData', params: { coinMint: coin.mintAddress } });
		return null;
	}
};

export const handleCoinNavigation = (
	coin: Coin,
	navigation: NavigationProp<RootStackParamList>
): void => {
	// Navigate immediately with the basic coin data
	logger.breadcrumb({
		category: 'navigation',
		message: 'Navigating to CoinDetail from Search (immediate navigation)',
		data: { coinSymbol: coin.symbol, coinMint: coin.mintAddress }
	});

	navigation.navigate('CoinDetail', { coin: coin });

	// Trigger background fetch to update the coin data in the store
	// The CoinDetail screen will automatically update when this completes
	getEnrichedCoinData(coin, useCoinStore.getState().getCoinByID).catch(error => {
		logger.error(`[Search] Background fetch failed for ${coin.symbol}:`, { error, coinMint: coin.mintAddress });
		// Note: We don't show toast here since user has already navigated away
	});
};

// Re-export formatting functions with any necessary customization
export { formatPrice, formatVolume };
export const formatPriceChange = (change: number): string => formatPercentage(change, 2, true); 
