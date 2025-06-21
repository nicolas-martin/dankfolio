import { useState, useEffect, useCallback } from 'react';
import { PriceData as PriceHistoryPoint } from '@/types';
import { logger } from '@/utils/logger';

export interface PriceHistoryCollection {
  [timeframe: string]: PriceHistoryPoint[];
}

export interface ErrorCollection {
  [timeframe: string]: Error | null;
}

export interface UsePriceHistoryReturn {
  priceHistoryCollection: PriceHistoryCollection;
  isLoading: boolean;
  errors: ErrorCollection;
  fetchHistoryForTimeframes: (coinId: string, timeframes: string[]) => Promise<void>;
  fetchSingleTimeframeHistory: (coinId: string, timeframe: string) => Promise<void>; // Added for individual fetching
}

export const usePriceHistory = (
  initialCoinId?: string,
  // initialTimeframe is removed as we might fetch multiple timeframes
  initialTimeframes?: string[], // Optional: to fetch specific timeframes on init
  fetchPriceHistoryApiCall?: (coinId: string, timeframe: string) => Promise<PriceHistoryPoint[]>
): UsePriceHistoryReturn => {
  const [priceHistoryCollection, setPriceHistoryCollection] = useState<PriceHistoryCollection>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<ErrorCollection>({});

  const fetchSingleTimeframeHistory = useCallback(async (coinId: string, timeframe: string) => {
    if (!fetchPriceHistoryApiCall) {
      logger.warn('[usePriceHistory] fetchPriceHistoryApiCall not provided. Cannot fetch history for timeframe:', timeframe);
      setErrors(prev => ({ ...prev, [timeframe]: new Error("API call function not provided.") }));
      setPriceHistoryCollection(prev => ({ ...prev, [timeframe]: [] }));
      return;
    }
    if (!coinId || !timeframe) {
      logger.warn('[usePriceHistory] coinId or timeframe is invalid for timeframe:', timeframe);
      setErrors(prev => ({ ...prev, [timeframe]: new Error("Invalid coinId or timeframe.") }));
      setPriceHistoryCollection(prev => ({ ...prev, [timeframe]: [] }));
      return;
    }

    logger.info(`[usePriceHistory] Fetching history for ${coinId} (Timeframe: ${timeframe})`);
    // Potentially set individual loading state if needed: setIsLoadingPerTimeframe(prev => ({...prev, [timeframe]: true}));
    // For now, global isLoading is managed by fetchHistoryForTimeframes

    try {
      const history = await fetchPriceHistoryApiCall(coinId, timeframe);
      setPriceHistoryCollection(prev => ({ ...prev, [timeframe]: history }));
      setErrors(prev => ({ ...prev, [timeframe]: null }));
    } catch (e) {
      const errorToSet = e instanceof Error ? e : new Error(String(e?.message || `Unknown error fetching ${timeframe}`));
      logger.error('[usePriceHistory] Failed to fetch price history for timeframe:', { error: errorToSet.message, coinId, timeframe });
      setErrors(prev => ({ ...prev, [timeframe]: errorToSet }));
      setPriceHistoryCollection(prev => ({ ...prev, [timeframe]: [] })); // Clear history for this timeframe on error
    } finally {
      // Potentially set individual loading state: setIsLoadingPerTimeframe(prev => ({...prev, [timeframe]: false}));
    }
  }, [fetchPriceHistoryApiCall]);

  const fetchHistoryForTimeframes = useCallback(async (coinId: string, timeframes: string[]) => {
    if (!fetchPriceHistoryApiCall) {
      logger.warn('[usePriceHistory] fetchPriceHistoryApiCall not provided. Cannot fetch history.');
      const newErrors: ErrorCollection = {};
      timeframes.forEach(tf => newErrors[tf] = new Error("API call function not provided."));
      setErrors(newErrors);
      setPriceHistoryCollection({});
      return;
    }
    if (!coinId || !timeframes || timeframes.length === 0) {
      logger.warn('[usePriceHistory] coinId or timeframes array is invalid.');
      setErrors({}); // Or set specific errors
      setPriceHistoryCollection({});
      return;
    }

    logger.info(`[usePriceHistory] Fetching history for ${coinId} (Timeframes: ${timeframes.join(', ')})`);
    setIsLoading(true);
    // Reset errors for the timeframes being fetched
    const initialErrors: ErrorCollection = { ...errors };
    timeframes.forEach(tf => initialErrors[tf] = null);
    setErrors(initialErrors);

    const results = await Promise.allSettled(
      timeframes.map(timeframe => fetchPriceHistoryApiCall(coinId, timeframe))
    );

    const newHistoryCollection: PriceHistoryCollection = { ...priceHistoryCollection };
    const newErrorsCollection: ErrorCollection = { ...errors };

    results.forEach((result, index) => {
      const timeframe = timeframes[index];
      if (result.status === 'fulfilled') {
        newHistoryCollection[timeframe] = result.value;
        newErrorsCollection[timeframe] = null;
      } else {
        const errorToSet = result.reason instanceof Error ? result.reason : new Error(String(result.reason?.message || `Unknown error fetching ${timeframe}`));
        logger.error('[usePriceHistory] Failed to fetch price history for timeframe in parallel:', { error: errorToSet.message, coinId, timeframe });
        newErrorsCollection[timeframe] = errorToSet;
        newHistoryCollection[timeframe] = []; // Clear or keep stale data for this timeframe on error
      }
    });

    setPriceHistoryCollection(newHistoryCollection);
    setErrors(newErrorsCollection);
    setIsLoading(false);
  }, [fetchPriceHistoryApiCall, errors, priceHistoryCollection]); // Added dependencies

  useEffect(() => {
    if (initialCoinId && initialTimeframes && initialTimeframes.length > 0 && fetchPriceHistoryApiCall) {
      fetchHistoryForTimeframes(initialCoinId, initialTimeframes);
    }
    // This effect is for initial load. Subsequent fetches are manual.
  }, [initialCoinId, fetchPriceHistoryApiCall]); // Removed initialTimeframes from deps to prevent re-fetch if it changes post-init. fetchHistoryForTimeframes handles its own logic.

  return { priceHistoryCollection, isLoading, errors, fetchHistoryForTimeframes, fetchSingleTimeframeHistory };
};
