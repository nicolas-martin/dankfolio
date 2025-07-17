import { PortfolioToken } from '@/store/portfolio';
import { PnLData, PortfolioStats } from './pnlview_types';

/**
 * Calculate portfolio-level statistics
 */
export const calculatePortfolioStats = (tokens: PortfolioToken[]): PortfolioStats => {
	const totalValue = tokens.reduce((sum, token) => sum + token.value, 0);
	
	// TODO: Once we have purchase price data in transactions, calculate actual cost basis
	const totalCostBasis = 0; // Placeholder for now
	const totalUnrealizedPnL = totalValue - totalCostBasis;
	const totalPnLPercentage = totalCostBasis > 0 ? (totalUnrealizedPnL / totalCostBasis) * 100 : 0;

	return {
		totalValue,
		totalCostBasis,
		totalUnrealizedPnL,
		totalPnLPercentage,
		totalHoldings: tokens.length,
	};
};

/**
 * Calculate token-level P&L statistics
 */
export const calculateTokenStats = (token: PortfolioToken): PnLData => {
	const currentValue = token.value;
	
	// TODO: Once we have purchase price data in transactions, calculate actual cost basis
	// For now, we'll return placeholder data
	const costBasis = 0;
	const unrealizedPnL = currentValue - costBasis;
	const pnlPercentage = costBasis > 0 ? (unrealizedPnL / costBasis) * 100 : 0;

	return {
		token,
		currentValue,
		costBasis,
		unrealizedPnL,
		pnlPercentage,
		hasPurchaseData: false, // Will be true once we have transaction price data
	};
};

/**
 * Format token amount based on its value
 */
export const formatTokenAmount = (amount: number, decimals: number = 4): string => {
	if (amount === 0) return '0';
	if (amount < 0.0001) return '<0.0001';
	if (amount < 1) return amount.toFixed(decimals);
	if (amount < 1000) return amount.toFixed(2);
	if (amount < 1000000) return `${(amount / 1000).toFixed(2)}K`;
	return `${(amount / 1000000).toFixed(2)}M`;
};