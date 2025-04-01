export const toRawAmount = (amount: string, decimals: number): string => {
	// Remove any commas from the input
	const cleanAmount = amount.replace(/,/g, '');
	// Convert to number and multiply by 10^decimals
	const rawAmount = (parseFloat(cleanAmount) * Math.pow(10, decimals)).toString();
	// Remove any decimal places from the result
	return rawAmount.split('.')[0];
};

export const formatNumber = (
	value: number | null | undefined,
	includeDollarSign: boolean = false,
	decimals: number = 2
): string => {
	if (value === null || value === undefined) return 'N/A';

	const prefix: string = includeDollarSign ? '$' : '';

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
 * Format a price number with appropriate decimal places
 * @param value - The price to format
 * @param includeDollarSign - Whether to include $ sign
 * @returns Formatted price string
 */
export const formatPrice = (
	value: number | null | undefined,
	includeDollarSign: boolean = true
): string => {
	if (value === null || value === undefined) return 'N/A';

	const prefix: string = includeDollarSign ? '$' : '';
	return `${prefix}${value.toFixed(6)} `;
};

/**
 * Format a percentage with appropriate sign and decimal places
 * @param value - The percentage value
 * @param decimals - Number of decimal places
 * @returns Formatted percentage string
 */
export const formatPercentage = (
	value: number | null | undefined,
	decimals: number = 2
): string => {
	if (value === null || value === undefined) return 'N/A';
	return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
};
