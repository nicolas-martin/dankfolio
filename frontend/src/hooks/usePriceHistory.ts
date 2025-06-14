import { useState, useEffect, useCallback } from 'react';
// Assuming PriceData is the correct type for a single point in price history.
// If PriceHistoryPoint is a different, more specific type from the store, adjust as needed.
import { PriceData as PriceHistoryPoint } from '@/types'; // Adjusted to use existing PriceData as PriceHistoryPoint
import { logger } from '@/utils/logger'; // Assuming logger path

// Placeholder for the actual API call function.
// In a real app, this would be imported from a service, e.g.,
// import { fetchPriceHistoryFromApi } from '@/services/coinDataService';

export interface UsePriceHistoryReturn {
  priceHistory: PriceHistoryPoint[];
  isLoading: boolean;
  error: Error | null;
  fetchHistory: (coinId: string, timeframe: string) => Promise<void>; // Made Promise<void>
}

export const usePriceHistory = (
  initialCoinId?: string,
  initialTimeframe?: string,
  // Allow passing the actual API call function as a dependency for testability and flexibility
  fetchPriceHistoryApiCall?: (coinId: string, timeframe: string) => Promise<PriceHistoryPoint[]>
): UsePriceHistoryReturn => {
  const [priceHistory, setPriceHistory] = useState<PriceHistoryPoint[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchHistory = useCallback(async (coinId: string, timeframe: string) => {
    if (!fetchPriceHistoryApiCall) {
      logger.warn('[usePriceHistory] fetchPriceHistoryApiCall not provided. Cannot fetch history.');
      // Optionally set an error state or return early if critical
      setError(new Error("API call function not provided to usePriceHistory hook."));
      setPriceHistory([]); // Clear any existing history
      return;
    }
    if (!coinId || !timeframe) {
        logger.warn('[usePriceHistory] coinId or timeframe is invalid. Cannot fetch history.');
        setPriceHistory([]); // Clear history if params are invalid
        setIsLoading(false); // Ensure loading stops
        return;
    }

    logger.info(`[usePriceHistory] Fetching history for ${coinId} (${timeframe})`);
    setIsLoading(true);
    setError(null);
    try {
      const history = await fetchPriceHistoryApiCall(coinId, timeframe);
      setPriceHistory(history);
    } catch (e) {
      const errorToSet = e instanceof Error ? e : new Error(String(e?.message || 'An unknown error occurred'));
      logger.error('[usePriceHistory] Failed to fetch price history', { error: errorToSet.message, coinId, timeframe });
      setError(errorToSet);
      setPriceHistory([]); // Clear history on error
    } finally {
      setIsLoading(false);
    }
  }, [fetchPriceHistoryApiCall]); // fetchPriceHistoryApiCall is a dependency

  useEffect(() => {
    if (initialCoinId && initialTimeframe && fetchPriceHistoryApiCall) {
      // Initial fetch if parameters are provided
      fetchHistory(initialCoinId, initialTimeframe);
    }
    // Intentionally not re-fetching if fetchHistory changes due to fetchPriceHistoryApiCall changing,
    // as that should ideally be stable or trigger a conscious re-call of fetchHistory by the consumer.
    // If fetchPriceHistoryApiCall could change and an auto-refetch is desired, it needs more complex handling.
  }, [initialCoinId, initialTimeframe, fetchPriceHistoryApiCall, fetchHistory]); // Only re-run initial fetch if these specific initial params or the function itself change

  return { priceHistory, isLoading, error, fetchHistory };
};
