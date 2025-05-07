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
	if (price === null || price === undefined) return 'N/A';

	const prefix = includeDollarSign ? '$' : '';

	if (price === 0) return `${prefix}0.00`;

	// Dynamic decimal places based on price magnitude
	if (price < 0.01) return `${prefix}${price.toFixed(8)}`;
	if (price < 1) return `${prefix}${price.toFixed(6)}`;
	if (price < 10) return `${prefix}${price.toFixed(4)}`;
	if (price < 1000) return `${prefix}${price.toFixed(2)}`;
	if (price < 1000000) return `${prefix}${(price / 1000).toFixed(2)}K`;
	return `${prefix}${(price / 1000000).toFixed(2)}M`;
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
	const sign = includeSign && value >= 0 ? '+' : '';
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
 * Formats a token balance with appropriate decimals
 * @param balance - The token balance
 * @param decimals - Number of decimal places
 * @returns Formatted balance string
 */
export const formatTokenBalance = (
	balance: number,
	decimals: number = 6
): string => {
	if (!balance) return '0';
	return balance.toLocaleString(undefined, {
		minimumFractionDigits: 2,
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
