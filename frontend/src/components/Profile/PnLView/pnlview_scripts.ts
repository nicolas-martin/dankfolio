import { PortfolioToken } from '@/store/portfolio';
import { PnLData, PortfolioStats } from './pnlview_types';
import { Transaction } from '@/types';

/**
 * Calculate portfolio-level statistics
 */
export const calculatePortfolioStats = (tokens: PortfolioToken[], transactions: Transaction[]): PortfolioStats => {
	const totalValue = tokens.reduce((sum, token) => sum + token.value, 0);
	
	// Calculate cost basis from transactions
	let totalCostBasis = 0;
	
	// Group transactions by coin
	const transactionsByCoin: Record<string, Transaction[]> = {};
	transactions.forEach(tx => {
		if (tx.type === 'SWAP' && tx.toCoinMintAddress) {
			if (!transactionsByCoin[tx.toCoinMintAddress]) {
				transactionsByCoin[tx.toCoinMintAddress] = [];
			}
			transactionsByCoin[tx.toCoinMintAddress].push(tx);
		}
	});

	// Calculate total cost basis for current holdings
	tokens.forEach(token => {
		const coinTransactions = transactionsByCoin[token.mintAddress] || [];
		const costBasis = calculateCostBasisForToken(token, coinTransactions);
		totalCostBasis += costBasis;
	});
	
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
 * Calculate cost basis for a token based on its transactions
 */
const calculateCostBasisForToken = (token: PortfolioToken, transactions: Transaction[]): number => {
	// Filter only completed swap transactions where this token was bought
	const buyTransactions = transactions.filter(
		tx => tx.type === 'SWAP' && 
		tx.status === 'COMPLETED' && 
		tx.price && 
		tx.amount
	);

	if (buyTransactions.length === 0) {
		// If no transactions, use current price as cost basis (conservative approach)
		return token.value;
	}

	// Calculate weighted average cost basis
	let totalCost = 0;
	let totalAmount = 0;

	buyTransactions.forEach(tx => {
		if (tx.price && tx.amount) {
			// The price in the transaction is the price per token at transaction time
			totalCost += tx.amount * tx.price;
			totalAmount += tx.amount;
		}
	});

	// If we have more tokens than we bought (e.g., from airdrops), 
	// use the average price for the remaining
	if (totalAmount < token.amount && totalAmount > 0) {
		const avgPrice = totalCost / totalAmount;
		const remainingAmount = token.amount - totalAmount;
		totalCost += remainingAmount * avgPrice;
	} else if (totalAmount === 0) {
		// No valid transactions, use current value
		return token.value;
	}

	return totalCost;
};

/**
 * Calculate token-level P&L statistics
 */
export const calculateTokenStats = (token: PortfolioToken, transactions: Transaction[]): PnLData => {
	const currentValue = token.value;
	
	// Find transactions for this specific token
	const tokenTransactions = transactions.filter(
		tx => tx.type === 'SWAP' && 
		tx.toCoinMintAddress === token.mintAddress &&
		tx.status === 'COMPLETED'
	);
	
	const costBasis = calculateCostBasisForToken(token, tokenTransactions);
	const unrealizedPnL = currentValue - costBasis;
	const pnlPercentage = costBasis > 0 ? (unrealizedPnL / costBasis) * 100 : 0;

	return {
		token,
		currentValue,
		costBasis,
		unrealizedPnL,
		pnlPercentage,
		hasPurchaseData: tokenTransactions.length > 0 && tokenTransactions.some(tx => tx.price !== undefined),
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