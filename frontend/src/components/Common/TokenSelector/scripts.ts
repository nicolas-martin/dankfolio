import { useEffect, useState } from 'react';
import { Coin } from '@/types';
import { formatPrice } from '@/utils/numberFormat';

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
 * Minimal validation for amount input - just allows numbers and decimal point
 * @param text The input text.
 * @param onAmountChange The function to call with the validated text.
 */
export const handleAmountInputChange = (text: string, onAmountChange: (value: string) => void) => {
	// Allow only numbers and dots, pass through everything else
	const value = text.replace(/[^0-9.]/g, '');
	onAmountChange(value);
};


/**
 * Calculates the USD value based on the selected token and amount.
 * @param token The currently selected token.
 * @param amount The input amount string.
 * @returns The calculated USD value as a string, formatted properly.
 */
export const calculateUsdValue = (token?: Coin, amount?: string): string => {
	if (!token?.price || !amount) {
		return formatPrice(0, false);
	}

	// The amount is already in human-readable format (i.e., already divided by decimals)
	// and the price from the backend is normalized per token unit
	const value = parseFloat(amount) * token.price;
	return formatPrice(value, false);
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

	return portfolioTokens.find((token: PortfolioToken) => token.mintAddress === selectedToken.address);
}; 
