/**
 * Formats a number as a currency string with the specified number of decimal places
 * @param value The number to format
 * @param decimals The number of decimal places to show
 * @returns Formatted string
 */
export const formatCurrency = (value: number, decimals: number = 2): string => {
	if (typeof value !== 'number' || isNaN(value)) {
		return '0.00';
	}
	return value.toFixed(decimals);
}; 