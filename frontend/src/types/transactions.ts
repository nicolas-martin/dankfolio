export enum TransactionType {
	SWAP = 'swap',
	TRANSFER = 'transfer',
	UNKNOWN = 'unknown'
}

export enum TransactionStatus {
	PENDING = 'pending',
	COMPLETED = 'completed',
	FAILED = 'failed',
	UNKNOWN = 'unknown'
}

// Polling status enum that matches backend status values
export enum PollingStatus {
	IDLE = 'idle',
	PENDING = 'pending',
	POLLING = 'polling',
	PROCESSED = 'processed',
	CONFIRMED = 'confirmed',
	FINALIZED = 'finalized',
	FAILED = 'failed',
	UNKNOWN = 'unknown'
}

export interface Transaction {
	id: string;
	type: TransactionType;
	fromCoinMintAddress?: string; // Mint address of the from coin
	toCoinMintAddress?: string; // Mint address of the to coin
	fromCoinIconUrl?: string; // Optional, for later enhancement
	toCoinIconUrl?: string; // Optional, for later enhancement
	amount: number; // Representing the amount of fromCoinSymbol or toCoinSymbol
	price?: number; // Price per token at the time of transaction
	totalValue?: number; // Total value of the transaction (amount * price)
	status: TransactionStatus;
	date: string; // ISO date string
	transactionHash?: string; // Optional
	fee?: number; // Transaction fee
	platformFeeAmount?: number; // Platform fee amount
}
