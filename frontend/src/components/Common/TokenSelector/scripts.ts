import { useEffect, useState } from 'react';
import { Coin } from '@/types';

// Define PortfolioToken based on usage elsewhere (e.g., TokenSelector/index.tsx)
export interface PortfolioToken {
	mintAddress: string;
	amount: number;
	coin: Coin;
	// Add other relevant fields if necessary
}

/**
 * Custom hook to debounce a value
 * @param value The value to debounce
 * @param delay The delay in milliseconds
 * @returns The debounced value
 */
export const useDebounce = <T>(value: T, delay: number): T => {
	const [debouncedValue, setDebouncedValue] = useState<T>(value);

	useEffect(() => {
		const handler = setTimeout(() => {
			setDebouncedValue(value);
		}, delay);

		return () => {
			clearTimeout(handler);
		};
	}, [value, delay]);

	return debouncedValue;
};

/**
 * Validates the amount input to allow only digits and a single decimal point.
 * @param text The input text.
 * @param onAmountChange The function to call with the validated text.
 */
export const handleAmountInputChange = (text: string, onAmountChange: (value: string) => void) => {
    // Allow only numbers and dots initially
    let value = text.replace(/[^0-9.]/g, '');

    const decimalParts = value.split('.');

    if (decimalParts.length > 1) { // If there's at least one dot
        const integerPart = decimalParts[0];
        // Join all parts after the first dot, then truncate to 9 decimal places
        const fractionalPart = decimalParts.slice(1).join('').substring(0, 9);
        value = integerPart + '.' + fractionalPart;
    }
    // If decimalParts.length is 1, it means no dots, or dots were at the beginning/end and got handled by replace or split.
    // e.g. "123" -> value = "123"
    // e.g. ".123" -> value = ".123" (decimalParts[0] is "", fractionalPart is "123")
    // e.g. "123." -> value = "123." (decimalParts[0] is "123", fractionalPart is "")

    onAmountChange(value);
};

/**
 * Calculates the USD value based on the selected token and amount.
 * @param token The currently selected token.
 * @param amount The input amount string.
 * @returns The calculated USD value as a string, formatted to two decimal places.
 */
export const calculateUsdValue = (token?: Coin, amount?: string): string => {
	if (!token?.price || !amount) {
		return '0.00';
	}

	// The amount is already in human-readable format (i.e., already divided by decimals)
	// and the price from the backend is normalized per token unit
	const value = parseFloat(amount) * token.price;
	return value.toFixed(4);
};

/**
 * Finds the corresponding portfolio token for the selected coin.
 * @param selectedToken The currently selected coin.
 * @param portfolioTokens The list of tokens in the portfolio.
 * @returns The matching portfolio token or undefined if not found.
 */
export const findPortfolioToken = (selectedToken?: Coin, portfolioTokens: PortfolioToken[] = []): PortfolioToken | undefined => {
	if (!selectedToken) {
		return undefined;
	}

	return portfolioTokens.find((token: PortfolioToken) => token.mintAddress === selectedToken.mintAddress);
}; 
