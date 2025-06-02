export const SOLANA_ADDRESS = 'So11111111111111111111111111111111111111112'; 

// Refresh Intervals (in milliseconds)
export const REFRESH_INTERVALS = {
	NEW_COINS: 5 * 60 * 1000, // 5 minutes
	TRENDING_COINS: 2 * 60 * 1000, // 2 minutes  
	TRADE_PRICES: 10 * 1000, // 10 seconds
	PORTFOLIO: 30 * 1000, // 30 seconds
	TRANSACTION_STATUS: 3 * 1000, // 3 seconds
} as const; 
