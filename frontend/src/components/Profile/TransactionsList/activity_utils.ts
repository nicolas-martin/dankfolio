import { Transaction, TransactionType } from '@/types';
import { ActivityItem, TxAction } from './activity_types';

/**
 * Format amount with proper decimal places and thousands separators
 */
export const formatAmount = (amount: number, decimals: number = 6): string => {
	if (amount === 0) return '0';

	// Convert to fixed decimal places first
	const fixed = amount.toFixed(decimals);

	// Remove trailing zeros
	const trimmed = parseFloat(fixed).toString();

	// Add thin space thousands separator
	const parts = trimmed.split('.');
	parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '\u2009'); // thin space

	return parts.join('.');
};

/**
 * Shorten wallet address to first 4 and last 4 characters
 */
export const shortAddress = (address: string): string => {
	if (!address || address.length < 8) return address;
	return `${address.slice(0, 4)}…${address.slice(-4)}`;
};

/**
 * Format fiat amount with currency symbol
 */
export const formatFiat = (amount: number, currency: string = 'USD'): string => {
	const symbol = currency === 'USD' ? '$' : currency === 'CAD' ? 'C$' : currency;
	return `≈ ${symbol}${formatAmount(amount, 2)}`;
};

/**
 * Convert legacy Transaction to ActivityItem
 */
export const txToActivityItem = (tx: Transaction, userWalletAddress?: string): ActivityItem => {
	const action = txActionFromEvent(tx, userWalletAddress);

	return {
		id: tx.id,
		timestamp: new Date(tx.date).getTime(),
		action,
		mintIn: tx.fromCoinMintAddress,
		mintOut: tx.toCoinMintAddress,
		amountIn: tx.amount,
		amountOut: tx.outputAmount || undefined,
		counterparty: getCounterparty(tx, userWalletAddress),
		status: tx.status === 'completed' ? 'completed' :
			tx.status === 'pending' ? 'pending' : 'failed',
		transactionHash: tx.transactionHash
	};
};

/**
 * Determine transaction action based on transaction type and user involvement
 */
export const txActionFromEvent = (tx: Transaction, userWalletAddress?: string): TxAction => {
	if (tx.type === TransactionType.SWAP) {
		return 'swap';
	}

	if (tx.type === TransactionType.TRANSFER) {
		// Check if user is sender or receiver
		if (tx.fromAddress === userWalletAddress) {
			return 'sent';
		} else {
			return 'received';
		}
	}

	// Default fallback
	return 'received';
};

/**
 * Get counterparty address for send/receive transactions
 */
const getCounterparty = (tx: Transaction, userWalletAddress?: string): string | undefined => {
	if (tx.type === TransactionType.TRANSFER) {
		if (tx.address === userWalletAddress) {
			return tx.toAddress;
		} else {
			return tx.fromAddress;
		}
	}
	return undefined;
};

/**
 * Format time ago display (keep existing logic)
 */
export const formatTimeAgo = (timestamp: number): string => {
	const now = Date.now();
	const diffTime = Math.abs(now - timestamp);
	const diffMinutes = Math.floor(diffTime / (1000 * 60));
	const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
	const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

	if (diffMinutes === 0) {
		return 'Just now';
	} else if (diffMinutes < 60) {
		return `${diffMinutes}m ago`;
	} else if (diffHours < 24) {
		return `${diffHours}h ago`;
	} else if (diffDays === 1) {
		return 'Yesterday';
	} else if (diffDays < 7) {
		return `${diffDays}d ago`;
	} else {
		const date = new Date(timestamp);
		if (diffDays < 30) {
			return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
		} else {
			return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
		}
	}
};
