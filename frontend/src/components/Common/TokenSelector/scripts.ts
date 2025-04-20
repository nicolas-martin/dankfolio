import { Coin } from '@/types';

/**
 * Validates the amount input to allow only digits and a single decimal point.
 * @param text The input text.
 * @param onAmountChange The function to call with the validated text.
 */
export const handleAmountInputChange = (text: string, onAmountChange: (value: string) => void) => {
	// Remove any non-numeric characters except decimal point
	const cleanedText = text.replace(/[^0-9.]/g, '');

	// Ensure only one decimal point
	const parts = cleanedText.split('.');
	if (parts.length > 2) {
		return;
	}

	// Limit decimal places to 9
	if (parts[1] && parts[1].length > 9) {
		return;
	}

	onAmountChange(cleanedText);
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

	const value = parseFloat(amount) * token.price;
	return value.toFixed(2);
};

/**
 * Finds the corresponding portfolio token for the selected coin.
 * @param selectedToken The currently selected coin.
 * @param portfolioTokens The list of tokens in the portfolio.
 * @returns The matching portfolio token or undefined if not found.
 */
export const findPortfolioToken = (selectedToken?: Coin, portfolioTokens: any[] = []): any => {
	if (!selectedToken) {
		return undefined;
	}

	return portfolioTokens.find(token => token.id === selectedToken.id);
}; 
