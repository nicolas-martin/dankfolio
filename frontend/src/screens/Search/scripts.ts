import { SearchFilters } from './types';
import { grpcApi } from '@/services/grpcApi';
import { Coin } from '@/types';
import { useCoinStore } from '@store/coins';
import { useToast } from '@/components/Common/Toast';
import { NavigationProp } from '@react-navigation/native';
import { formatPrice, formatVolume, formatPercentage } from '@/utils/numberFormat';
import { logger } from '@/utils/logger';

export const DEBOUNCE_DELAY = 1000; // ms

export const DEFAULT_FILTERS: SearchFilters = {
	query: '',
	tags: [],
	minVolume24h: 0,
	sortBy: 'volume',
	sortDesc: true
};

export const searchTokens = async (filters: SearchFilters): Promise<Coin[]> => {
	try {
		const response = await grpcApi.searchCoins(filters);
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
		const response = await grpcApi.searchCoins({
			query,
			tags: filters.tags,
			minVolume24h: filters.minVolume24h,
			limit,
			offset,
			sortBy: filters.sortBy,
			sortDesc: filters.sortDesc
		});
		return response.coins;
	} catch (error) {
		logger.exception(error, { functionName: 'performSearch', params: { query, filters, limit, offset } });
		throw error;
	}
};

export const getTokenLogoURI = (token: Coin): string => {
	return token.resolvedIconUrl || token.iconUrl || '';
};

export const formatTokenBalance = (balance: number, decimals: number): string => {
	if (!balance) return '0';
	return (balance / Math.pow(10, decimals)).toFixed(decimals);
};

export const handleSearchPress = (
	navigation: NavigationProp<any>,
	searchQuery: string
) => {
	if (!searchQuery.trim()) return;
	navigation.navigate('Search', { searchQuery });
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

export const handleCoinNavigation = async (
	coin: Coin,
	navigation: NavigationProp<any>,
	toast = useToast()
): Promise<void> => {
	try {
		const enrichedCoin = await getEnrichedCoinData(coin, useCoinStore.getState().getCoinByID);
		logger.breadcrumb({
			category: 'navigation',
			message: 'Navigating to CoinDetail from Search',
			data: { coinSymbol: coin.symbol, coinMint: coin.mintAddress }
		});
		navigation.navigate('CoinDetail', { coin: enrichedCoin });
	} catch (error) {
		toast.showToast({
			type: 'error',
			message: 'Failed to load coin data',
			duration: 3000
		});
		logger.exception(error, { functionName: 'handleCoinNavigation', params: { coinMint: coin.mintAddress } });
	}
};

// Re-export formatting functions with any necessary customization
export { formatPrice, formatVolume };
export const formatPriceChange = (change: number): string => formatPercentage(change, 2, true); 
