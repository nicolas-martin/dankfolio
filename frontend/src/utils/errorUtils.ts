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
