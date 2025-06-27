import { getUserFriendlyTradeError, isRetryableTradeError, TRADE_ERROR_MESSAGES } from '../errorUtils';

describe('errorUtils', () => {
  describe('getUserFriendlyTradeError', () => {
    it('should handle Jupiter "COULD_NOT_FIND_ANY_ROUTE" error', () => {
      const jupiterError = new Error('{"code":"internal","message":"failed to get trade quote: failed to get Jupiter quote: failed to fetch quote: GET request to https://lite-api.jup.ag/swap/v1/quote?...failed with status code: 400, body: {\\"error\\":\\"Could not find any route\\",\\"errorCode\\":\\"COULD_NOT_FIND_ANY_ROUTE\\"}"}');
      
      const result = getUserFriendlyTradeError(jupiterError);
      expect(result).toBe(TRADE_ERROR_MESSAGES.COULD_NOT_FIND_ANY_ROUTE);
    });

    it('should handle case insensitive route errors', () => {
      const error1 = new Error('Could not find any route');
      const error2 = new Error('COULD_NOT_FIND_ANY_ROUTE');
      const error3 = new Error('Failed: could not find any route for this pair');
      
      expect(getUserFriendlyTradeError(error1)).toBe(TRADE_ERROR_MESSAGES.COULD_NOT_FIND_ANY_ROUTE);
      expect(getUserFriendlyTradeError(error2)).toBe(TRADE_ERROR_MESSAGES.COULD_NOT_FIND_ANY_ROUTE);
      expect(getUserFriendlyTradeError(error3)).toBe(TRADE_ERROR_MESSAGES.COULD_NOT_FIND_ANY_ROUTE);
    });

    it('should handle insufficient liquidity errors', () => {
      const error = new Error('Insufficient liquidity for this trade size');
      const result = getUserFriendlyTradeError(error);
      expect(result).toBe(TRADE_ERROR_MESSAGES.INSUFFICIENT_LIQUIDITY);
    });

    it('should handle slippage errors', () => {
      const error1 = new Error('Slippage tolerance exceeded');
      const error2 = new Error('Price impact too high');
      
      expect(getUserFriendlyTradeError(error1)).toBe(TRADE_ERROR_MESSAGES.SLIPPAGE_TOO_HIGH);
      expect(getUserFriendlyTradeError(error2)).toBe(TRADE_ERROR_MESSAGES.SLIPPAGE_TOO_HIGH);
    });

    it('should handle string errors', () => {
      const stringError = 'Could not find any route';
      const result = getUserFriendlyTradeError(stringError);
      expect(result).toBe(TRADE_ERROR_MESSAGES.COULD_NOT_FIND_ANY_ROUTE);
    });

    it('should return generic message for unknown errors', () => {
      const unknownError = new Error('xyzabc123 cryptic error');
      const result = getUserFriendlyTradeError(unknownError);
      expect(result).toBe(TRADE_ERROR_MESSAGES.QUOTE_FAILED);
    });

    it('should preserve user-friendly error messages', () => {
      const userFriendlyError = new Error('Please verify your account');
      const result = getUserFriendlyTradeError(userFriendlyError);
      expect(result).toBe('Please verify your account');
    });

    it('should handle very long technical error messages', () => {
      const longTechnicalError = new Error('internal: grpc call failed with status code 500 and protobuf serialization error occurred during transmission to remote server endpoint');
      const result = getUserFriendlyTradeError(longTechnicalError);
      expect(result).toBe(TRADE_ERROR_MESSAGES.QUOTE_FAILED);
    });

    it('should clean prefixes from error messages', () => {
      const error = new Error('internal: User friendly error message');
      const result = getUserFriendlyTradeError(error);
      expect(result).toBe('User friendly error message');
    });
  });

  describe('isRetryableTradeError', () => {
    it('should identify retryable errors', () => {
      const networkError = new Error('Network connection failed');
      const timeoutError = new Error('Request timeout');
      const serverError = new Error('Internal server error');
      
      expect(isRetryableTradeError(networkError)).toBe(true);
      expect(isRetryableTradeError(timeoutError)).toBe(true);
      expect(isRetryableTradeError(serverError)).toBe(true);
    });

    it('should identify non-retryable errors', () => {
      const routeError = new Error('Could not find any route');
      const slippageError = new Error('Slippage too high');
      
      expect(isRetryableTradeError(routeError)).toBe(false);
      expect(isRetryableTradeError(slippageError)).toBe(false);
    });

    it('should handle string errors', () => {
      expect(isRetryableTradeError('network error')).toBe(true);
      expect(isRetryableTradeError('route not found')).toBe(false);
    });
  });
});