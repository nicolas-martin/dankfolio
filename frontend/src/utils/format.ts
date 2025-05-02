export const formatPrice = (price: number): string => {
	if (!price && price !== 0) return 'N/A';

	if (price < 0.01) {
		return `$${price.toFixed(8)}`;
	}

	if (price < 1) {
		return `$${price.toFixed(4)}`;
	}

	if (price < 1000) {
		return `$${price.toFixed(2)}`;
	}

	if (price < 1000000) {
		return `$${(price / 1000).toFixed(2)}K`;
	}

	return `$${(price / 1000000).toFixed(2)}M`;
};

export const formatPercentage = (value: number): string => {
	if (!value && value !== 0) return 'N/A';
	const sign = value >= 0 ? '+' : '';
	return `${sign}${value.toFixed(2)}%`;
}; 