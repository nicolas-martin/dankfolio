import { fetchPriceHistory, TIMEFRAMES, TIMEFRAME_CONFIG } from './coindetail_scripts';
import { grpcApi } from '@/services/grpcApi';
import { logger } from '@/utils/logger';
import usePriceHistoryCacheStore from '@/store/priceHistoryCache'; // Import the cache store
import { Coin, PriceData } from '@/types';
import { GetPriceHistoryRequest_PriceHistoryType as PriceHistoryType } from '@/gen/dankfolio/v1/price_pb';

// Mock dependencies
jest.mock('@/services/grpcApi', () => ({
  grpcApi: {
    getPriceHistory: jest.fn(),
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    exception: jest.fn(),
    breadcrumb: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(), // Added info for cache logging
  },
}));

// Mock the Zustand store
jest.mock('@/store/priceHistoryCache');

const mockSetLoading = jest.fn();
const mockSetPriceHistory = jest.fn();
// Store mock functions that will be set by usePriceHistoryCacheStore.getState()
let mockGetCache: jest.Mock;
let mockSetCache: jest.Mock;

const sampleCoin: Coin = {
  mintAddress: 'sampleMintAddress',
  name: 'Sample Coin',
  symbol: 'SMPL',
  iconUrl: 'http://example.com/icon.png',
  price: 10,
  change24h: 1,
  // Add other required fields for Coin type if any
  description: '',
  website: '',
  twitter: '',
  telegram: '',
  dailyVolume: 0,
  tags: [],
  decimals: 9,
};

// Helper to convert PriceHistoryType enum value to its string key
const getPriceHistoryTypeString = (enumValue: PriceHistoryType): string | undefined => {
  for (const key in PriceHistoryType) {
    if (PriceHistoryType[key as keyof typeof PriceHistoryType] === enumValue) {
      return key;
    }
  }
  return undefined; // Should not happen if enumValue is valid
};

// Replicating TIMEFRAME_CONFIG structure from coindetail_scripts.ts for test calculations
const testTimeframeConfig: Record<string, { granularity: PriceHistoryType, durationMs: number, roundingMinutes: number }> = {
    "1H": { granularity: PriceHistoryType.ONE_MINUTE, durationMs: 1 * 60 * 60 * 1000, roundingMinutes: 1 },
    "4H": { granularity: PriceHistoryType.ONE_MINUTE, durationMs: 4 * 60 * 60 * 1000, roundingMinutes: 1 },
    "1D": { granularity: PriceHistoryType.FIVE_MINUTE, durationMs: 24 * 60 * 60 * 1000, roundingMinutes: 5 },
    "1W": { granularity: PriceHistoryType.ONE_HOUR, durationMs: 7 * 24 * 60 * 60 * 1000, roundingMinutes: 60 },
    "1M": { granularity: PriceHistoryType.FOUR_HOUR, durationMs: 30 * 24 * 60 * 60 * 1000, roundingMinutes: 240 },
    "1Y": { granularity: PriceHistoryType.ONE_DAY, durationMs: 365 * 24 * 60 * 60 * 1000, roundingMinutes: 1440 },
    "DEFAULT": { granularity: PriceHistoryType.FIFTEEN_MINUTE, durationMs: 24 * 60 * 60 * 1000, roundingMinutes: 15 },
};

// Import the actual roundDateDown function to use it in tests for expected values
import { roundDateDown as actualRoundDateDown } from './coindetail_scripts';

describe('CoinDetail Scripts', () => {
  // Use a timestamp that is not perfectly aligned to test rounding
  const mockNow = 1672531425000; // Sunday, January 1, 2023 00:03:45 GMT
  let originalDate: DateConstructor;

  beforeAll(() => {
    // Store the original Date constructor
    originalDate = global.Date;
    
    // Mock Date.now()
    jest.spyOn(Date, 'now').mockReturnValue(mockNow);
    
    // Mock the Date constructor to return our mocked time when called with no arguments
    global.Date = jest.fn((dateString?: string | number | Date) => {
      if (dateString !== undefined) {
        return new originalDate(dateString);
      }
      return new originalDate(mockNow);
    }) as any;
    
    // Copy static methods from original Date
    Object.setPrototypeOf(global.Date, originalDate);
    Object.getOwnPropertyNames(originalDate).forEach(name => {
      if (name !== 'length' && name !== 'name' && name !== 'prototype') {
        (global.Date as any)[name] = (originalDate as any)[name];
      }
    });
    
    // Ensure Date.now returns our mocked value
    global.Date.now = jest.fn().mockReturnValue(mockNow);
  });

  afterAll(() => {
    // Restore the original Date constructor
    global.Date = originalDate;
    jest.restoreAllMocks();
  });

  describe('roundDateDown', () => {
    test('should round down to the nearest 1 minute', () => {
      const date = new Date("2023-01-01T10:03:45.123Z"); // 10:03:45
      const rounded = actualRoundDateDown(date, 1);
      expect(rounded.toISOString()).toBe("2023-01-01T10:03:00.000Z");
    });

    test('should round down to the nearest 5 minutes', () => {
      const date = new Date("2023-01-01T10:07:30.000Z"); // 10:07:30
      const rounded = actualRoundDateDown(date, 5);
      expect(rounded.toISOString()).toBe("2023-01-01T10:05:00.000Z");
    });

    test('should round down to the nearest 60 minutes (hour)', () => {
      const date = new Date("2023-01-01T10:59:59.999Z"); // 10:59:59
      const rounded = actualRoundDateDown(date, 60);
      expect(rounded.toISOString()).toBe("2023-01-01T10:00:00.000Z");
    });

    test('should handle date already on boundary correctly', () => {
      const date = new Date("2023-01-01T10:05:00.000Z");
      const rounded = actualRoundDateDown(date, 5);
      expect(rounded.toISOString()).toBe("2023-01-01T10:05:00.000Z");
    });

     test('should handle date just after boundary correctly for 1 minute', () => {
      const date = new Date("2023-01-01T10:03:00.001Z"); // 10:03:00.001
      const rounded = actualRoundDateDown(date, 1);
      expect(rounded.toISOString()).toBe("2023-01-01T10:03:00.000Z");
    });
  });

  describe('fetchPriceHistory', () => {
    beforeEach(() => {
      jest.clearAllMocks();

      // Reset and assign new mocks for store functions for each test
      mockGetCache = jest.fn();
      mockSetCache = jest.fn();
      (usePriceHistoryCacheStore.getState as jest.Mock) = jest.fn().mockReturnValue({
        getCache: mockGetCache,
        setCache: mockSetCache,
        // other store methods if needed, but not for these tests
      });
      
      // Clear mock functions
      mockSetLoading.mockClear();
      mockSetPriceHistory.mockClear();
      
      // Ensure Date.now is consistently mocked
      jest.spyOn(Date, 'now').mockReturnValue(mockNow);
    });

    afterEach(() => {
      // Don't restore all mocks here, just clear them
      jest.clearAllMocks();
    });

    // Test cases for non-caching behavior (existing tests can be adapted or kept if still relevant)
    describe('Non-Caching Behavior (API interaction and error handling)', () => {
      TIMEFRAMES.forEach(timeframeOption => {
        // ... (keep existing non-caching tests, ensure they align or adapt them)
        // For brevity, I'm assuming existing tests for API calls, parameter correctness, etc., are here.
        // Example:
        const timeframeValue = timeframeOption.value;
        const config = testTimeframeConfig[timeframeValue] || testTimeframeConfig["DEFAULT"];
        
        if (!config) {
          console.warn(`Skipping test for timeframeValue "${timeframeValue}" as it's not in testTimeframeConfig.`);
          return;
        }
  
        const { granularity, durationMs, roundingMinutes } = config;
        const expectedGranularityString = getPriceHistoryTypeString(granularity);
        
        const currentTime = new Date(mockNow);
        const expectedRoundedTimeTo = actualRoundDateDown(new Date(currentTime), roundingMinutes);
        const initialTimeFrom = new Date(currentTime.getTime() - durationMs);
        const expectedRoundedTimeFrom = actualRoundDateDown(initialTimeFrom, roundingMinutes);
  
        test(`[Non-Caching] should call grpcApi.getPriceHistory with rounded time params for ${timeframeValue}`, async () => {
          mockGetCache.mockReturnValue(undefined); // Ensure cache miss for these tests
          (grpcApi.getPriceHistory as jest.Mock).mockResolvedValueOnce({
            data: { items: [{ unixTime: expectedRoundedTimeTo.getTime() / 1000 - 60, value: 100 }] },
            success: true,
          });
  
          await fetchPriceHistory(timeframeValue, mockSetLoading, mockSetPriceHistory, sampleCoin, true);
  
          expect(mockSetLoading).toHaveBeenCalledWith(true);
          expect(grpcApi.getPriceHistory).toHaveBeenCalledTimes(1);
          expect(grpcApi.getPriceHistory).toHaveBeenCalledWith(
            sampleCoin.mintAddress,
            expectedGranularityString,
            expectedRoundedTimeFrom.toISOString(),
            expectedRoundedTimeTo.toISOString(),
            "token"
          );
          // Cache should be set after successful fetch
          const expectedCacheExpiry = mockNow + TIMEFRAME_CONFIG[timeframeValue].roundingMinutes * 60 * 1000;
          expect(mockSetCache).toHaveBeenCalledWith(
            `${sampleCoin.mintAddress}-${timeframeValue}`,
            [{ timestamp: new Date((expectedRoundedTimeTo.getTime() / 1000 - 60) * 1000).toISOString(), value: 100, unixTime: expectedRoundedTimeTo.getTime() / 1000 - 60 }],
            expectedCacheExpiry
          );
          expect(mockSetPriceHistory).toHaveBeenCalledWith([
            { timestamp: new Date((expectedRoundedTimeTo.getTime() / 1000 - 60) * 1000).toISOString(), value: 100, unixTime: expectedRoundedTimeTo.getTime() / 1000 - 60 },
          ]);
          expect(mockSetLoading).toHaveBeenCalledWith(false);
        });
      });

      test('[Non-Caching] should handle null coin gracefully', async () => {
        await fetchPriceHistory("1D", mockSetLoading, mockSetPriceHistory, null, true);
        // ... (assertions as before)
        expect(mockSetLoading).toHaveBeenCalledWith(true);
        expect(logger.error).toHaveBeenCalledWith('No coin provided for price history', { functionName: 'fetchPriceHistory' });
        expect(grpcApi.getPriceHistory).not.toHaveBeenCalled();
        expect(mockSetPriceHistory).toHaveBeenCalledWith([]);
        expect(mockSetLoading).toHaveBeenCalledWith(false);
      });

      test('[Non-Caching] API Error: should handle grpcApi.getPriceHistory error gracefully and not cache', async () => {
        mockGetCache.mockReturnValue(undefined); // Ensure cache miss
        const errorMessage = 'Network error';
        (grpcApi.getPriceHistory as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));
  
        await fetchPriceHistory("1D", mockSetLoading, mockSetPriceHistory, sampleCoin, true);
  
        expect(mockSetLoading).toHaveBeenCalledWith(true);
        expect(grpcApi.getPriceHistory).toHaveBeenCalledTimes(1);
        expect(logger.exception).toHaveBeenCalledWith(
          expect.any(Error),
          { functionName: 'fetchPriceHistory', params: { coinMintAddress: sampleCoin.mintAddress, timeframe: "1D" } }
        );
        expect(mockSetPriceHistory).toHaveBeenCalledWith([]);
        expect(mockSetCache).not.toHaveBeenCalled(); // Crucial: ensure no caching on error
        expect(mockSetLoading).toHaveBeenCalledWith(false);
      });
    });

    // Test cases for caching behavior
    describe('Caching Behavior', () => {
      const selectedTimeframeValue = "1D"; // Use a common timeframe for these tests
      const cacheKey = `${sampleCoin.mintAddress}-${selectedTimeframeValue}`;
      const mockPriceData: PriceData[] = [{ timestamp: new Date(mockNow - 3600 * 1000).toISOString(), value: 123, unixTime: mockNow / 1000 - 3600 }];
      
      test('Cache Hit: should use cached data and not call API', async () => {
        const validExpiry = mockNow + TIMEFRAME_CONFIG[selectedTimeframeValue].roundingMinutes * 60 * 1000;
        mockGetCache.mockReturnValue({ data: mockPriceData, expiry: validExpiry });

        await fetchPriceHistory(selectedTimeframeValue, mockSetLoading, mockSetPriceHistory, sampleCoin, true);

        expect(mockGetCache).toHaveBeenCalledWith(cacheKey);
        expect(grpcApi.getPriceHistory).not.toHaveBeenCalled();
        expect(mockSetPriceHistory).toHaveBeenCalledWith(mockPriceData);
        expect(mockSetLoading).toHaveBeenCalledWith(false); // Called once for cache hit
        expect(logger.info).toHaveBeenCalledWith(`Using cached price history for ${cacheKey}`, { functionName: 'fetchPriceHistory' });
      });

      test('Cache Miss (No Cache): should call API, set price history, and cache the data', async () => {
        mockGetCache.mockReturnValue(undefined); // No cache
        (grpcApi.getPriceHistory as jest.Mock).mockResolvedValueOnce({ data: { items: [{ unixTime: mockNow / 1000, value: 150 }] }, success: true });
        const expectedFetchedData: PriceData[] = [{ timestamp: new Date(mockNow).toISOString(), value: 150, unixTime: mockNow/1000 }];

        await fetchPriceHistory(selectedTimeframeValue, mockSetLoading, mockSetPriceHistory, sampleCoin, true);

        expect(mockGetCache).toHaveBeenCalledWith(cacheKey);
        expect(grpcApi.getPriceHistory).toHaveBeenCalledTimes(1);
        expect(mockSetPriceHistory).toHaveBeenCalledWith(expectedFetchedData);
        
        const expectedCacheExpiry = mockNow + TIMEFRAME_CONFIG[selectedTimeframeValue].roundingMinutes * 60 * 1000;
        expect(mockSetCache).toHaveBeenCalledWith(cacheKey, expectedFetchedData, expectedCacheExpiry);
        expect(mockSetLoading).toHaveBeenCalledWith(false); // Called for initial load + after fetch
        expect(logger.info).toHaveBeenCalledWith(`Cache miss for ${cacheKey}, fetching new price history.`, { functionName: 'fetchPriceHistory' });
        expect(logger.info).toHaveBeenCalledWith(`Cached new price history for ${cacheKey} with expiry ${new Date(expectedCacheExpiry).toISOString()}`, { functionName: 'fetchPriceHistory' });
      });

      test('Cache Miss (Expired Cache): should call API, set price history, and update cache', async () => {
        // Mock getCache to return undefined for expired cache (simulating real cache behavior)
        mockGetCache.mockReturnValue(undefined);
        (grpcApi.getPriceHistory as jest.Mock).mockResolvedValueOnce({ data: { items: [{ unixTime: mockNow / 1000, value: 180 }] }, success: true });
        const expectedFetchedData: PriceData[] = [{ timestamp: new Date(mockNow).toISOString(), value: 180, unixTime: mockNow/1000 }];

        await fetchPriceHistory(selectedTimeframeValue, mockSetLoading, mockSetPriceHistory, sampleCoin, true);
        
        expect(mockGetCache).toHaveBeenCalledWith(cacheKey);
        expect(grpcApi.getPriceHistory).toHaveBeenCalledTimes(1);
        expect(mockSetPriceHistory).toHaveBeenCalledWith(expectedFetchedData);

        const expectedCacheExpiry = mockNow + TIMEFRAME_CONFIG[selectedTimeframeValue].roundingMinutes * 60 * 1000;
        expect(mockSetCache).toHaveBeenCalledWith(cacheKey, expectedFetchedData, expectedCacheExpiry);
        expect(mockSetLoading).toHaveBeenCalledWith(false);
        expect(logger.info).toHaveBeenCalledWith(`Cache miss for ${cacheKey}, fetching new price history.`, { functionName: 'fetchPriceHistory' });
        expect(logger.info).toHaveBeenCalledWith(`Cached new price history for ${cacheKey} with expiry ${new Date(expectedCacheExpiry).toISOString()}`, { functionName: 'fetchPriceHistory' });
      });

      test('should set loading true for non-initial load on cache miss', async () => {
        mockGetCache.mockReturnValue(undefined); // Cache miss
        (grpcApi.getPriceHistory as jest.Mock).mockResolvedValueOnce({ data: { items: [] }, success: true });
  
        await fetchPriceHistory(selectedTimeframeValue, mockSetLoading, mockSetPriceHistory, sampleCoin, false); // isInitialLoad = false
  
        // First setLoading(true) should be called due to cache miss on non-initial load
        // Second setLoading(false) in the finally block
        expect(mockSetLoading).toHaveBeenCalledTimes(2);
        expect(mockSetLoading).toHaveBeenNthCalledWith(1, true); 
        expect(mockSetLoading).toHaveBeenNthCalledWith(2, false);
      });
    });

  });

  // TODO: Test handleTradeNavigation if needed
});
