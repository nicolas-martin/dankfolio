import { Transaction, TransactionType } from '@/types';

/**
 * Format transaction date for display
 * Shows time for today's transactions, relative dates for recent, and full date for older
 */
export const formatTransactionDate = (dateString: string): string => {
	const date = new Date(dateString);
	const now = new Date();
	const diffTime = Math.abs(now.getTime() - date.getTime());
	const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
	const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

	// Today - show time
	if (diffHours < 24) {
		const hours = diffHours;
		if (hours === 0) {
			const minutes = Math.floor(diffTime / (1000 * 60));
			if (minutes === 0) {
				return 'Just now';
			}
			return `${minutes}m ago`;
		}
		return `${hours}h ago`;
	}
	
	// Yesterday
	if (diffDays === 1) {
		return 'Yesterday';
	}
	
	// Within a week - show days
	if (diffDays < 7) {
		return `${diffDays}d ago`;
	}
	
	// Within a month - show date without year
	if (diffDays < 30) {
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}
	
	// Older - show full date with year
	return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
};

/**
 * Get the appropriate icon name for a transaction type
 */
export const getTransactionIcon = (type: Transaction['type']): string => {
	switch (type) {
		case TransactionType.SWAP:
			return 'swap-horizontal';
		case TransactionType.TRANSFER:
			return 'arrow-top-right';
		default:
			return 'help-circle-outline';
	}
};

/**
 * Generate Solscan URL for a transaction
 */
export const getSolscanUrl = (transactionHash: string): string => {
	return `https://solscan.io/tx/${transactionHash}`;
};