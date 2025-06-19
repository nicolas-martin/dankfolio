import { formatPct } from "@/utils/numberFormat"
import { SolFeeBreakdown } from "./tradedetails_types";

export const formatExchangeRate = (rate: string): string => `Rate: ${rate}`;
export const formatPriceImpactPct = (priceImpact: string): string => `Price Impact: ${formatPct(priceImpact, 4)}%`;

// Format SOL amounts with appropriate precision
export const formatSolAmount = (amount: string): string => {
	const num = parseFloat(amount);
	if (num === 0) return '0 SOL';
	
	// Show more precision for small amounts
	if (num < 0.000001) {
		return `${num.toFixed(9)} SOL`;
	} else if (num < 0.001) {
		return `${num.toFixed(6)} SOL`;
	} else {
		return `${num.toFixed(4)} SOL`;
	}
};

// Format the total SOL required with emphasis
export const formatTotalSolRequired = (amount: string): string => {
	return `Total SOL Required: ${formatSolAmount(amount)}`;
};

// Check if SOL fee breakdown is available and has meaningful data
export const hasSolFeeBreakdown = (breakdown?: SolFeeBreakdown): boolean => {
	return !!(breakdown && (
		parseFloat(breakdown.tradingFee) > 0 ||
		parseFloat(breakdown.transactionFee) > 0 ||
		parseFloat(breakdown.accountCreationFee) > 0 ||
		parseFloat(breakdown.priorityFee) > 0
	));
};

// Calculate if account creation is the major cost component
export const isAccountCreationMajorCost = (breakdown?: SolFeeBreakdown): boolean => {
	if (!breakdown) return false;
	
	const accountCreation = parseFloat(breakdown.accountCreationFee);
	const total = parseFloat(breakdown.total);
	
	return accountCreation > 0 && (accountCreation / total) > 0.5; // More than 50% of total cost
};
