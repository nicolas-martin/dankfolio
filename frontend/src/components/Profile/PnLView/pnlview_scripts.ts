import { PortfolioToken } from '@/store/portfolio';
import { PnLData, PortfolioStats } from './pnlview_types';
import { Transaction, TransactionType, TransactionStatus } from '@/types';

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
		if (tx.type === TransactionType.SWAP && tx.toCoinMintAddress) {
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
		tx => tx.type === TransactionType.SWAP &&
			tx.status === TransactionStatus.COMPLETED &&
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

	if (totalAmount === 0) {
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

	// Log all transactions to debug
	console.log(`[PnL] All transactions for debugging:`, transactions.slice(0, 3).map(tx => ({
		id: tx.id,
		type: tx.type,
		status: tx.status,
		fromCoinMintAddress: tx.fromCoinMintAddress,
		toCoinMintAddress: tx.toCoinMintAddress,
		amount: tx.amount,
		price: tx.price,
		totalValue: tx.totalValue,
	})));

	// Find transactions for this specific token
	const tokenTransactions = transactions.filter(
		tx => tx.type === TransactionType.SWAP &&
			tx.toCoinMintAddress === token.mintAddress &&
			tx.status === TransactionStatus.COMPLETED
	);

	console.log(`[PnL] Calculating stats for ${token.coin.symbol}:`, {
		mintAddress: token.mintAddress,
		totalTransactions: transactions.length,
		matchingTransactions: tokenTransactions.length,
		transactions: tokenTransactions.map(tx => ({
			id: tx.id,
			fromCoinMintAddress: tx.fromCoinMintAddress,
			toCoinMintAddress: tx.toCoinMintAddress,
			amount: tx.amount,
			price: tx.price,
			totalValue: tx.totalValue,
			status: tx.status,
		}))
	});

	const costBasis = calculateCostBasisForToken(token, tokenTransactions);
	const unrealizedPnL = currentValue - costBasis;
	const pnlPercentage = costBasis > 0 ? (unrealizedPnL / costBasis) * 100 : 0;

	const hasPurchaseData = tokenTransactions.length > 0 && tokenTransactions.some(tx => tx.price !== undefined);

	console.log(`[PnL] Stats for ${token.coin.symbol}:`, {
		currentValue,
		costBasis,
		unrealizedPnL,
		pnlPercentage,
		hasPurchaseData,
		hasTransactions: tokenTransactions.length > 0,
		hasPriceData: tokenTransactions.some(tx => tx.price !== undefined)
	});

	return {
		token,
		currentValue,
		costBasis,
		unrealizedPnL,
		pnlPercentage,
		hasPurchaseData,
	};
};
