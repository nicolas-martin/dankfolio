import { SearchFilters } from './types';
import grpcApi from '@/services/grpcApi';
import { Token } from '@/services/grpc/model';

export const DEBOUNCE_DELAY = 300; // ms

export const DEFAULT_FILTERS: SearchFilters = {
	tags: [],
	minVolume24h: 0,
	sortBy: 'volume_24h',
	sortDesc: true
};

export const performSearch = async (
	query: string,
	filters: SearchFilters = DEFAULT_FILTERS,
	limit: number = 20,
	offset: number = 0
): Promise<Token[]> => {
	try {
		const response = await grpcApi.searchTokens({
			query,
			tags: filters.tags,
			minVolume24h: filters.minVolume24h,
			limit,
			offset,
			sortBy: filters.sortBy,
			sortDesc: filters.sortDesc
		});
		return response.tokens;
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

export const getTokenLogoURI = (token: Token): string => {
	return token.logoURI || 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png';
}; 