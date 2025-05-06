import { SearchFilters } from './types';
import { grpcApi } from '@/services/grpcApi';
import { Coin } from '@/types';
import { useCoinStore } from '@store/coins';
import { useToast } from '@/components/Common/Toast';
import { NavigationProp } from '@react-navigation/native';

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
		console.error('Error searching tokens:', error);
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
		console.error('Search error:', error);
		throw error;
	}
};

export const formatPrice = (price: number): string => {
	if (price >= 1) {
		return `$${price.toFixed(2)}`;
	}
	// For very small numbers, use scientific notation
	if (price < 0.00001) {
		return `$${price.toExponential(2)}`;
	}
	// For small numbers, show more decimal places
	return `$${price.toFixed(6)}`;
};

export const formatVolume = (volume: number): string => {
	if (volume >= 1_000_000_000) {
		return `$${(volume / 1_000_000_000).toFixed(1)}B`;
	}
	if (volume >= 1_000_000) {
		return `$${(volume / 1_000_000).toFixed(1)}M`;
	}
	if (volume >= 1_000) {
		return `$${(volume / 1_000).toFixed(1)}K`;
	}
	return `$${volume.toFixed(0)}`;
};

export const formatPriceChange = (change: number): string => {
	const sign = change >= 0 ? '+' : '';
	return `${sign}${change.toFixed(2)}%`;
};

export const getTokenLogoURI = (token: Coin): string => {
	return token.iconUrl || '';
};

export const formatTokenBalance = (balance: number, decimals: number): string => {
	if (!balance) return '0';
	return (balance / Math.pow(10, decimals)).toFixed(decimals);
};

export const getEnrichedCoinData = async (coin: Coin): Promise<Coin> => {
	try {
		// Get the coin store instance
		const coinStore = useCoinStore.getState();

		// Try to get enriched data from the store
		const enrichedCoin = await coinStore.getCoinByID(coin.mintAddress);

		if (!enrichedCoin) {
			throw new Error(`Failed to get enriched data for coin ${coin.mintAddress}`);
		}

		// Update the coin in the store
		coinStore.setCoin(enrichedCoin);

		return enrichedCoin;
	} catch (error) {
		console.error(`Error enriching coin data for ${coin.mintAddress}:`, error);
		throw error;
	}
};

export const handleCoinNavigation = async (
	coin: Coin,
	navigation: NavigationProp<any>,
	toast = useToast()
): Promise<void> => {
	try {
		const enrichedCoin = await getEnrichedCoinData(coin);
		navigation.navigate('CoinDetail', { coin: enrichedCoin });
	} catch (error) {
		toast.showToast({
			type: 'error',
			message: 'Failed to load coin data',
			duration: 3000
		});
		console.error('Failed to get enriched coin data:', error);
	}
}; 