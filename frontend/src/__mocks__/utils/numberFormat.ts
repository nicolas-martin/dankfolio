/**
 * Mock implementation of numberFormat utilities for testing
 */

export const toRawAmount = jest.fn((amount: string, decimals: number): string => {
	const cleanAmount = amount.replace(/,/g, '');
	const rawAmount = (parseFloat(cleanAmount) * Math.pow(10, decimals)).toString();
	return rawAmount.split('.')[0];
});

export const formatNumber = jest.fn((
	value: number | null | undefined,
	includeDollarSign: boolean = false,
	decimals: number = 2
): string => {
	if (value === null || value === undefined) return 'N/A';
	const prefix = includeDollarSign ? '$' : '';
	return `${prefix}${value.toFixed(decimals)}`;
});

export const formatPct = jest.fn((value: string, decimals: number = 2): string => {
	const intVal = parseFloat(value);
	if (intVal === 0) return "0.0000";
	return `${intVal.toFixed(decimals)}`;
});

export const formatPrice = jest.fn((
	price: number | null | undefined,
	includeDollarSign: boolean = true
): string => {
	if (price === null || price === undefined) return 'N/A';
	const prefix = includeDollarSign ? '$' : '';
	return `${prefix}${price.toFixed(2)}`;
});

export const formatPercentage = jest.fn((
	value: number | null | undefined,
	decimals: number = 2,
	includeSign: boolean = true
): string => {
	if (value === null || value === undefined) return 'N/A';
	const sign = includeSign && value >= 0 ? '+' : '';
	return `${sign}${value.toFixed(decimals)}%`;
});

export const formatVolume = jest.fn((
	volume: number | null | undefined,
	includeDollarSign: boolean = true
): string => {
	if (volume === null || volume === undefined) return 'N/A';
	const prefix = includeDollarSign ? '$' : '';
	return `${prefix}${volume.toFixed(0)}`;
});

export const formatTokenBalance = jest.fn((
	balance: number,
	decimals: number = 6
): string => {
	if (!balance) return '0';
	return balance.toFixed(decimals);
});

export const formatValueChange = jest.fn((
	valueChange: number,
	percentageChange: number
): string => {
	const arrow = valueChange >= 0 ? '↑' : '↓';
	const absValue = Math.abs(valueChange);
	const absPercentage = Math.abs(percentageChange);
	return `${arrow} $${absValue.toFixed(2)} (${absPercentage.toFixed(2)}%)`;
});

export const formatAddress = jest.fn((
	address: string,
	startChars: number = 4,
	endChars: number = 4
): string => {
	if (!address) return '';
	return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}); 