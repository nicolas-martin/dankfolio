import { fetchPriceHistory, TIMEFRAMES } from './coindetail_scripts';
import { grpcApi } from '@/services/grpcApi';
import { logger } from '@/utils/logger';
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
    breadcrumb: jest.fn(), // Added breadcrumb as it's used in coindetail_scripts
    warn: jest.fn(), // Added warn as it's used in coindetail_scripts
  },
}));

const mockSetLoading = jest.fn();
const mockSetPriceHistory = jest.fn();

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
// Assuming the version with roundingMinutes is the correct one.
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
    // Use a timestamp that is not perfectly aligned to test rounding
    // Sunday, January 1, 2023 00:03:45 GMT / 1672531425000
    const mockNow = 1672531425000; 

    beforeEach(() => {
      jest.clearAllMocks();
      jest.spyOn(Date, 'now').mockReturnValue(mockNow);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    TIMEFRAMES.forEach(timeframeOption => {
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

      test(`should call grpcApi.getPriceHistory with rounded time params for ${timeframeValue}`, async () => {
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
        expect(mockSetPriceHistory).toHaveBeenCalledWith([
          { timestamp: new Date((expectedRoundedTimeTo.getTime() / 1000 - 60) * 1000).toISOString(), value: 100, unixTime: expectedRoundedTimeTo.getTime() / 1000 - 60 },
        ]);
        expect(mockSetLoading).toHaveBeenCalledWith(false);
      });
    });

    test('should handle null coin gracefully', async () => {
      await fetchPriceHistory("1D", mockSetLoading, mockSetPriceHistory, null, true);

      expect(mockSetLoading).toHaveBeenCalledWith(true);
      expect(logger.error).toHaveBeenCalledWith('No coin provided for price history', { functionName: 'fetchPriceHistory' });
      expect(grpcApi.getPriceHistory).not.toHaveBeenCalled();
      expect(mockSetPriceHistory).toHaveBeenCalledWith([]);
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });

    test('should handle grpcApi.getPriceHistory error gracefully', async () => {
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
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });
    
    test('should correctly map response items to PriceData, filtering nulls', async () => {
      const responseItems = [
        { unixTime: mockNow / 1000 - 120, value: 99 },
        { unixTime: null, value: 100 }, // Should be filtered
        { unixTime: mockNow / 1000 - 60, value: 101 },
        { unixTime: mockNow / 1000, value: null }, // Should be filtered
      ];
      const expectedMappedItems: PriceData[] = [
        { timestamp: new Date(mockNow - 120 * 1000).toISOString(), value: 99, unixTime: mockNow / 1000 - 120 },
        { timestamp: new Date(mockNow - 60 * 1000).toISOString(), value: 101, unixTime: mockNow / 1000 - 60 },
      ];
      (grpcApi.getPriceHistory as jest.Mock).mockResolvedValueOnce({
        data: { items: responseItems },
        success: true,
      });
    
      await fetchPriceHistory("1D", mockSetLoading, mockSetPriceHistory, sampleCoin);
    
      expect(mockSetPriceHistory).toHaveBeenCalledWith(expectedMappedItems);
    });

    test('should handle empty items list from API', async () => {
      (grpcApi.getPriceHistory as jest.Mock).mockResolvedValueOnce({
        data: { items: [] },
        success: true,
      });
    
      await fetchPriceHistory("1D", mockSetLoading, mockSetPriceHistory, sampleCoin);
    
      expect(mockSetPriceHistory).toHaveBeenCalledWith([]);
    });
    
    test('should handle null data from API', async () => {
      (grpcApi.getPriceHistory as jest.Mock).mockResolvedValueOnce({
        data: null,
        success: true,
      });
    
      await fetchPriceHistory("1D", mockSetLoading, mockSetPriceHistory, sampleCoin);
    
      expect(mockSetPriceHistory).toHaveBeenCalledWith([]);
    });

    test('should handle undefined data from API', async () => {
        (grpcApi.getPriceHistory as jest.Mock).mockResolvedValueOnce({
          // data is undefined
          success: true,
        });
      
        await fetchPriceHistory("1D", mockSetLoading, mockSetPriceHistory, sampleCoin);
      
        expect(mockSetPriceHistory).toHaveBeenCalledWith([]);
      });

    test('should use default timeframe config if selected timeframe is not in TIMEFRAME_CONFIG', async () => {
        const unknownTimeframe = "UNKNOWN_TIMEFRAME";
        // TIMEFRAME_CONFIG["DEFAULT"] uses FIFTEEN_MINUTE and 24 hours duration
        const expectedDefaultGranularityString = getPriceHistoryTypeString(PriceHistoryType.FIFTEEN_MINUTE);
        const defaultDurationMs = 24 * 60 * 60 * 1000;

        (grpcApi.getPriceHistory as jest.Mock).mockResolvedValueOnce({
            data: { items: [] },
            success: true,
        });

        await fetchPriceHistory(unknownTimeframe, mockSetLoading, mockSetPriceHistory, sampleCoin, true);

        expect(grpcApi.getPriceHistory).toHaveBeenCalledWith(
            sampleCoin.mintAddress,
            expectedDefaultGranularityString,
            new Date(mockNow - defaultDurationMs).toISOString(),
            new Date(mockNow).toISOString(),
            "token"
        );
    });

  });

  // TODO: Test handleTradeNavigation if needed, though not explicitly requested for this subtask's focus.
  // For now, focusing on fetchPriceHistory as per the prompt.
});
