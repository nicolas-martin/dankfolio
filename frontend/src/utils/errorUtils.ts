import { logger } from '@/utils/logger';

/**
 * Trade-specific error messages that provide user-friendly alternatives
 * to technical gRPC/API error messages
 */
export const TRADE_ERROR_MESSAGES = {
	// Jupiter/Route specific errors
	COULD_NOT_FIND_ANY_ROUTE: 'No trading route available for this token pair. Try a different amount or token.',
	NO_ROUTE_FOUND: 'No trading route available for this token pair. Try a different amount or token.',
	INSUFFICIENT_LIQUIDITY: 'Insufficient liquidity for this trade. Try a smaller amount.',
	SLIPPAGE_TOO_HIGH: 'Price impact is too high. Try a smaller amount or adjust slippage tolerance.',

	// Balance/wallet errors
	INSUFFICIENT_BALANCE: 'Insufficient balance for this transaction.',
	INSUFFICIENT_SOL: 'Insufficient SOL for transaction fees.',
	WALLET_NOT_CONNECTED: 'Please connect your wallet to continue.',

	// Generic fallbacks
	QUOTE_FAILED: 'Unable to get trade quote. Please try again.',
	TRADE_FAILED: 'Trade execution failed. Please try again.',
	NETWORK_ERROR: 'Network error. Please check your connection and try again.',
} as const;

/**
 * Extract user-friendly error message from gRPC/API errors
 * Specifically handles Jupiter "COULD_NOT_FIND_ANY_ROUTE" errors
 */
export const getUserFriendlyTradeError = (error: unknown): string => {
	let errorMessage = '';

	if (error instanceof Error) {
		errorMessage = error.message;
	} else if (typeof error === 'string') {
		errorMessage = error;
	} else {
		logger.warn('[ErrorUtils] Unknown error type received:', error);
		return TRADE_ERROR_MESSAGES.QUOTE_FAILED;
	}

	// Log the original error for debugging
	logger.error('[ErrorUtils] Processing trade error:', errorMessage);

	// Check for authentication/authorization errors
	if (errorMessage.includes('401') ||
		errorMessage.toLowerCase().includes('unauthorized') ||
		errorMessage.toLowerCase().includes('authentication')) {
		return 'Service temporarily unavailable. Please try again later.';
	}

	// Check for Jupiter route errors (case-insensitive)
	if (errorMessage.toLowerCase().includes('could not find any route') ||
		errorMessage.toLowerCase().includes('could_not_find_any_route')) {
		return TRADE_ERROR_MESSAGES.COULD_NOT_FIND_ANY_ROUTE;
	}

	// Check for other specific error patterns
	if (errorMessage.toLowerCase().includes('insufficient liquidity')) {
		return TRADE_ERROR_MESSAGES.INSUFFICIENT_LIQUIDITY;
	}

	if (errorMessage.toLowerCase().includes('slippage') ||
		errorMessage.toLowerCase().includes('price impact')) {
		return TRADE_ERROR_MESSAGES.SLIPPAGE_TOO_HIGH;
	}

	if (errorMessage.toLowerCase().includes('insufficient balance')) {
		return TRADE_ERROR_MESSAGES.INSUFFICIENT_BALANCE;
	}

	if (errorMessage.toLowerCase().includes('insufficient sol')) {
		return TRADE_ERROR_MESSAGES.INSUFFICIENT_SOL;
	}

	if (errorMessage.toLowerCase().includes('wallet not connected') ||
		errorMessage.toLowerCase().includes('unauthenticated')) {
		return TRADE_ERROR_MESSAGES.WALLET_NOT_CONNECTED;
	}

	// Only match network errors if they don't contain user-friendly messages already
	if ((errorMessage.toLowerCase().includes('network') ||
		errorMessage.toLowerCase().includes('connection')) &&
		!errorMessage.toLowerCase().includes('please')) {
		return TRADE_ERROR_MESSAGES.NETWORK_ERROR;
	}

	// For unknown errors, try to extract meaningful parts
	// Remove technical prefixes like error codes
	const cleanedMessage = errorMessage.replace(/^(internal|unknown|failed|error):\s*/i, '');

	// Check if the message contains technical jargon that users shouldn't see
	const technicalKeywords = [
		'grpc', 'protobuf', 'status code', 'serialization', 'transmission',
		'endpoint', 'buffer', 'rpc', 'connect', 'metadata', 'stream'
	];

	const isTechnical = technicalKeywords.some(keyword =>
		cleanedMessage.toLowerCase().includes(keyword)
	);

	// If the cleaned message is still too technical, long, or contains jargon, use generic fallback
	if (cleanedMessage.length > 100 || isTechnical) {
		return TRADE_ERROR_MESSAGES.QUOTE_FAILED;
	}

	// Check if the message looks like a user-friendly message (contains common words)
	const userFriendlyPatterns = [
		/^[A-Z][a-z]/,  // Starts with capital letter
		/please/i, /try/i, /unable/i, /failed to/i, /cannot/i, /invalid/i
	];

	const isUserFriendly = userFriendlyPatterns.some(pattern =>
		pattern.test(cleanedMessage)
	);

	// If it looks user-friendly, return it; otherwise use generic message
	if (isUserFriendly && cleanedMessage.length > 0) {
		return cleanedMessage;
	}

	return TRADE_ERROR_MESSAGES.QUOTE_FAILED;
};

/**
 * Check if an error indicates a temporary/retry-able condition
 */
export const isRetryableTradeError = (error: unknown): boolean => {
	const errorMessage = error instanceof Error ? error.message : String(error);

	const retryablePatterns = [
		'network',
		'connection',
		'timeout',
		'temporarily unavailable',
		'rate limit',
		'server error',
		'internal error'
	];

	return retryablePatterns.some(pattern =>
		errorMessage.toLowerCase().includes(pattern)
	);
};

/**
 * Extract error code from gRPC errors if available
 */
export const getErrorCode = (error: unknown): string | number | undefined => {
	if (error && typeof error === 'object' && 'code' in error) {
		return (error as { code: string | number }).code;
	}
	return undefined;
};

/**
 * Search-specific error messages that provide user-friendly alternatives
 * to technical gRPC/API error messages
 */
export const SEARCH_ERROR_MESSAGES = {
	// API/Market data errors
	MARKET_DATA_UNAVAILABLE: 'Unable to access market data at this time. Please try again later.',
	TOKEN_NOT_FOUND: 'Token not found. Please check the address and try again.',
	INVALID_ADDRESS: 'Invalid token address. Please enter a valid Solana token address.',

	// Generic fallbacks
	SEARCH_FAILED: 'Search failed. Please try again.',
	NETWORK_ERROR: 'Network error. Please check your connection and try again.',
} as const;

/**
 * Extract user-friendly error message from search errors
 */
export const getUserFriendlySearchError = (error: unknown): string => {
	let errorMessage = '';

	if (error instanceof Error) {
		errorMessage = error.message;
	} else if (typeof error === 'string') {
		errorMessage = error;
	} else {
		logger.warn('[ErrorUtils] Unknown search error type received:', error);
		return SEARCH_ERROR_MESSAGES.SEARCH_FAILED;
	}

	// Log the original error for debugging
	logger.error('[ErrorUtils] Processing search error:', errorMessage);

	// Check for specific error patterns
	if (errorMessage.toLowerCase().includes('unable to access market data')) {
		return SEARCH_ERROR_MESSAGES.MARKET_DATA_UNAVAILABLE;
	}

	if (errorMessage.toLowerCase().includes('token not found')) {
		return SEARCH_ERROR_MESSAGES.TOKEN_NOT_FOUND;
	}

	if (errorMessage.toLowerCase().includes('invalid address') ||
		errorMessage.toLowerCase().includes('invalid token address')) {
		return SEARCH_ERROR_MESSAGES.INVALID_ADDRESS;
	}

	if (errorMessage.toLowerCase().includes('unable to fetch token data')) {
		return SEARCH_ERROR_MESSAGES.MARKET_DATA_UNAVAILABLE;
	}

	// Network errors
	if ((errorMessage.toLowerCase().includes('network') ||
		errorMessage.toLowerCase().includes('connection')) &&
		!errorMessage.toLowerCase().includes('please')) {
		return SEARCH_ERROR_MESSAGES.NETWORK_ERROR;
	}

	// Check if the message already looks user-friendly
	const userFriendlyPatterns = [
		/please try again/i,
		/unable to/i,
		/check the address/i
	];

	const isUserFriendly = userFriendlyPatterns.some(pattern =>
		pattern.test(errorMessage)
	);

	// If it already looks user-friendly, return it
	if (isUserFriendly && errorMessage.length > 0 && errorMessage.length < 100) {
		return errorMessage;
	}

	// For unknown/technical errors, use generic fallback
	return SEARCH_ERROR_MESSAGES.SEARCH_FAILED;
};
