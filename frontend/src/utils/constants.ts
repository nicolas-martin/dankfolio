export const SOLANA_ADDRESS = 'So11111111111111111111111111111111111111112';
export const NATIVE_SOL_ADDRESS = '11111111111111111111111111111111';

// Refresh Intervals (in milliseconds)
export const REFRESH_INTERVALS = {
	NEW_COINS: 5 * 60 * 1000, // 5 minutes
	TRENDING_COINS: 2 * 60 * 1000, // 2 minutes  
	TRADE_PRICES: 10 * 1000, // 10 seconds
	PORTFOLIO: 30 * 1000, // 30 seconds
	TRANSACTION_STATUS: 3 * 1000, // 3 seconds
} as const;

// Price History Fetch Configuration
export const PRICE_HISTORY_FETCH_DELAY_MS = 2000;

// Timeframes for charts and data fetching
// (TimeframeOption type would ideally also be here or in a shared types file if not already)
export const TIMEFRAMES = [
	{ label: "1H", value: "1H" },
	{ label: "4H", value: "4H" },
	{ label: "1D", value: "1D" },
	{ label: "1W", value: "1W" },
	{ label: "1M", value: "1M" },
];
// For this step, assuming TimeframeOption type is appropriately handled/imported by consumers.
// If TimeframeOption is defined in './coindetail_types', components using TIMEFRAMES
// might need to import TimeframeOption from there or it should also be centralized.
