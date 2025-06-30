/**
 * Utility functions for formatting numbers, prices, percentages and currencies
 */

/**
 * Converts a human-readable amount to raw blockchain amount
 * @param amount - The human-readable amount as string
 * @param decimals - Number of decimal places for the token
 * @returns Raw amount as string
 */
export const toRawAmount = (amount: string, decimals: number): string => {
	// Remove any commas from the input
	const cleanAmount = amount.replace(/,/g, '');
	// Convert to number and multiply by 10^decimals
	const rawAmount = (parseFloat(cleanAmount) * Math.pow(10, decimals)).toString();
	// Remove any decimal places from the result
	return rawAmount.split('.')[0];
};

/**
 * Determines the appropriate number of decimal places based on value magnitude
 * @param value - The numeric value to analyze
 * @param maxDecimals - Maximum number of decimal places (fallback)
 * @returns Number of decimal places to use
 */
const getDynamicDecimals = (value: number, maxDecimals: number = 6): number => {
	if (value >= 1000) {
		// Large numbers (1000+): 2 decimals - e.g., "146,231.50"
		return 2;
	} else if (value >= 100) {
		// Medium-large numbers (100-999): 2 decimals - e.g., "123.45"
		return 2;
	} else if (value >= 10) {
		// Medium numbers (10-99): 4 decimals - e.g., "12.3456"
		return 4;
	} else if (value >= 1) {
		// Small numbers (1-9): 6 decimals - e.g., "1.234567"
		return 6;
	} else if (value >= 0.01) {
		// Very small numbers (0.01-0.99): Use maxDecimals - e.g., "0.123456"
		return maxDecimals;
	} else {
		// Tiny numbers (<0.01): Use maxDecimals for precision - e.g., "0.000123"
		return maxDecimals;
	}
};

/**
 * Formats a number with K/M/B suffixes
 * @param value - The number to format
 * @param includeDollarSign - Whether to include $ prefix
 * @param decimals - Number of decimal places
 * @returns Formatted number string
 */
export const formatNumber = (
	value: number | null | undefined,
	includeDollarSign: boolean = false,
	decimals: number = 2
): string => {
	if (value === null || value === undefined) return 'N/A';

	const prefix = includeDollarSign ? '$' : '';

	if (value >= 1e9) return `${prefix}${(value / 1e9).toFixed(decimals)}B`;
	if (value >= 1e6) return `${prefix}${(value / 1e6).toFixed(decimals)}M`;
	if (value >= 1e3) return `${prefix}${(value / 1e3).toFixed(decimals)}K`;
	return `${prefix}${value.toFixed(decimals)}`;
};

export const formatPct = (value: string, decimals: number = 2): string => {
	const intVal = parseFloat(value)
	if (intVal === 0) {
		return "0.0000";
	}

	return `${intVal.toFixed(decimals)}`;
}

/**
 * Formats a price with appropriate decimal places based on magnitude
 * @param price - The price to format
 * @param includeDollarSign - Whether to include $ prefix
 * @returns Formatted price string
 */
export const formatPrice = (
	price: number | null | undefined,
	includeDollarSign: boolean = true
): string => {
	if (price === null || price === undefined || isNaN(price)) return includeDollarSign ? '$0.00' : '0.00';

	const prefix = includeDollarSign ? '$' : '';

	if (price === 0) return `${prefix}0.00`;

	// Use dynamic decimal places based on price magnitude
	const decimals = getDynamicDecimals(price, 8);

	// For very large numbers, use K/M notation
	if (price >= 1000000) return `${prefix}${(price / 1000000).toFixed(2)}M`;
	if (price >= 1000 && decimals === 2) {
		// For large numbers, show with commas and appropriate decimals
		return `${prefix}${price.toLocaleString(undefined, {
			minimumFractionDigits: 0,
			maximumFractionDigits: decimals
		})}`;
	}

	return `${prefix}${price.toFixed(decimals)}`;
};

/**
 * Formats a percentage with sign and decimal places
 * @param value - The percentage value
 * @param decimals - Number of decimal places
 * @param includeSign - Whether to include +/- sign
 * @returns Formatted percentage string
 */
export const formatPercentage = (
	value: number | null | undefined,
	decimals: number = 2,
	includeSign: boolean = true
): string => {
	if (value === null || value === undefined) return 'N/A';
	const sign = includeSign && value > 0 ? '+' : '';
	return `${sign}${value.toFixed(decimals)}%`;
};

/**
 * Formats a percentage with K/M suffix for large values
 * @param value - The percentage value
 * @param decimals - Number of decimal places  
 * @param includeSign - Whether to include +/- sign
 * @returns Formatted percentage string with suffix for large values
 */
export const formatCompactPercentage = (
	value: number | null | undefined,
	decimals: number = 1,
	includeSign: boolean = true
): string => {
	if (value === null || value === undefined) return 'N/A';

	const sign = includeSign && value > 0 ? '+' : '';
	const absValue = Math.abs(value);

	// Handle very large percentages with K/M suffix
	if (absValue >= 100000) {
		return `${sign}${(value / 1000).toFixed(0)}K%`;
	}
	if (absValue >= 10000) {
		return `${sign}${(value / 1000).toFixed(1)}K%`;
	}
	if (absValue >= 1000) {
		// For values between 1000-9999, show without decimals
		return `${sign}${value.toFixed(0)}%`;
	}

	// For smaller values, use regular formatting
	return `${sign}${value.toFixed(decimals)}%`;
};

/**
 * Formats a volume number with appropriate suffix
 * @param volume - The volume number
 * @param includeDollarSign - Whether to include $ prefix
 * @returns Formatted volume string
 */
export const formatVolume = (
	volume: number | null | undefined,
	includeDollarSign: boolean = true
): string => {
	if (volume === null || volume === undefined) return 'N/A';

	const prefix = includeDollarSign ? '$' : '';

	if (volume >= 1e9) return `${prefix}${(volume / 1e9).toFixed(1)}B`;
	if (volume >= 1e6) return `${prefix}${(volume / 1e6).toFixed(1)}M`;
	if (volume >= 1e3) return `${prefix}${(volume / 1e3).toFixed(1)}K`;
	return `${prefix}${volume.toFixed(0)}`;
};

/**
 * Formats a token balance with appropriate decimals based on magnitude
 * @param balance - The token balance
 * @param maxDecimals - Maximum number of decimal places (fallback)
 * @returns Formatted balance string
 */
export const formatTokenBalance = (
	balance: number,
	maxDecimals: number = 6
): string => {
	if (!balance) return '0';

	// Use dynamic decimal places based on balance magnitude
	const decimals = getDynamicDecimals(balance, maxDecimals);

	return balance.toLocaleString(undefined, {
		minimumFractionDigits: balance >= 1000 ? 0 : 2, // No minimum decimals for large numbers
		maximumFractionDigits: decimals
	});
};

/**
 * Formats a value change with arrow indicator
 * @param valueChange - The value change
 * @param percentageChange - The percentage change
 * @returns Formatted change string
 */
export const formatValueChange = (
	valueChange: number,
	percentageChange: number
): string => {
	const arrow = valueChange >= 0 ? '↑' : '↓';
	const absValue = Math.abs(valueChange);
	const absPercentage = Math.abs(percentageChange);

	return `${arrow} $${formatPrice(absValue, false)} (${absPercentage.toFixed(2)}%)`;
};

/**
 * Formats a wallet address for display
 * @param address - The wallet address
 * @param startChars - Number of starting characters to show
 * @param endChars - Number of ending characters to show
 * @returns Formatted address string
 */
export const formatAddress = (
	address: string,
	startChars: number = 4,
	endChars: number = 4
): string => {
	if (!address) return '';
	return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
};


