export interface Transaction {
	id: string;
	type: 'SWAP' | 'TRANSFER' | 'UNKNOWN'; // Using string literal union for known types
	fromCoinSymbol: string; // Placeholder, was fromCoinId from backend
	toCoinSymbol: string; // Placeholder, was toCoinId from backend
	fromCoinMintAddress?: string; // Mint address of the from coin
	toCoinMintAddress?: string; // Mint address of the to coin
	fromCoinIconUrl?: string; // Optional, for later enhancement
	toCoinIconUrl?: string; // Optional, for later enhancement
	amount: number; // Representing the amount of fromCoinSymbol or toCoinSymbol
	price?: number; // Price per token at the time of transaction
	totalValue?: number; // Total value of the transaction (amount * price)
	status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'UNKNOWN'; // Using string literal union for known statuses
	date: string; // ISO date string
	transactionHash?: string; // Optional
	fee?: number; // Transaction fee
	platformFeeAmount?: number; // Platform fee amount
}
