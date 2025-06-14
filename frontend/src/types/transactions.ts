export interface Transaction {
	id: string;
	type: 'SWAP' | 'TRANSFER' | 'UNKNOWN'; // Using string literal union for known types
	fromCoinSymbol: string; // Placeholder, was fromCoinId from backend
	toCoinSymbol: string; // Placeholder, was toCoinId from backend
	fromCoinIconUrl?: string; // Optional, for later enhancement
	toCoinIconUrl?: string; // Optional, for later enhancement
	amount: number; // Representing the amount of fromCoinSymbol or toCoinSymbol
	status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'UNKNOWN'; // Using string literal union for known statuses
	date: string; // ISO date string
	transactionHash?: string; // Optional
}
