import { PriceData } from 'types';
import usePriceHistoryCacheStore from './priceHistoryCache';

describe('usePriceHistoryCacheStore', () => {
  beforeEach(() => {
    // Reset the store cache before each test
    usePriceHistoryCacheStore.setState({ cache: {} });
    jest.useRealTimers(); // Default to real timers
  });

  afterEach(() => {
    jest.useRealTimers(); // Ensure real timers are restored
  });

  it('should set and get cache entries', () => {
    const { setCache, getCache } = usePriceHistoryCacheStore.getState();
    const key = 'testKey';
    const data: PriceData[] = [{ timestamp: 'testData', value: 100, unixTime: 100 }];
    const expiry = Date.now() + 1000 * 60 * 5; // 5 minutes from now

    setCache(key, data, expiry);
    const cachedItem = getCache(key);

    expect(cachedItem).toBeDefined();
    expect(cachedItem?.data).toEqual(data);
    expect(cachedItem?.expiry).toEqual(expiry);
  });

  it('should return undefined for non-existent keys', () => {
    const { getCache } = usePriceHistoryCacheStore.getState();
    const cachedItem = getCache('nonExistentKey');
    expect(cachedItem).toBeUndefined();
  });

  it('should return undefined for expired cache entries', () => {
    jest.useFakeTimers();
    const { setCache, getCache } = usePriceHistoryCacheStore.getState();
    const key = 'expiredKey';
    const data: PriceData[] = [{ timestamp: 'expiredData', value: 100, unixTime: 100 }];
    const expiry = Date.now() + 1000; // Expires in 1 second

    setCache(key, data, expiry);

    // Advance time by 2 seconds, so the item expires
    jest.advanceTimersByTime(2000);

    const cachedItem = getCache(key);
    expect(cachedItem).toBeUndefined();
    jest.useRealTimers();
  });

  it('should return data for non-expired cache entries', () => {
    jest.useFakeTimers();
    const { setCache, getCache } = usePriceHistoryCacheStore.getState();
    const key = 'validKey';
    const data: PriceData[] = [{ timestamp: 'validData', value: 100, unixTime: 100 }];
    const expiry = Date.now() + 2000; // Expires in 2 seconds

    setCache(key, data, expiry);

    // Advance time by 1 second, item should still be valid
    jest.advanceTimersByTime(1000);

    const cachedItem = getCache(key);
    expect(cachedItem).toBeDefined();
    expect(cachedItem?.data).toEqual(data);
    jest.useRealTimers();
  });

  it('should clear only expired cache entries with clearExpiredCache', () => {
    jest.useFakeTimers();
    const { setCache, getCache, clearExpiredCache } = usePriceHistoryCacheStore.getState();

    const expiredKey = 'expiredItem';
    const expiredData: PriceData[] = [{ timestamp: 'iWillExpire', value: 100, unixTime: 100 }];
    const expiredExpiry = Date.now() + 1000; // Expires in 1 second
    setCache(expiredKey, expiredData, expiredExpiry);

    const validKey = 'validItem';
    const validData: PriceData[] = [{ timestamp: 'iWillPersist', value: 100, unixTime: 100 }];
    const validExpiry = Date.now() + 5000; // Expires in 5 seconds
    setCache(validKey, validData, validExpiry);

    // Advance time by 2 seconds
    jest.advanceTimersByTime(2000);

    clearExpiredCache();

    expect(getCache(expiredKey)).toBeUndefined();
    const validCachedItem = getCache(validKey);
    expect(validCachedItem).toBeDefined();
    expect(validCachedItem?.data).toEqual(validData);
    expect(Object.keys(usePriceHistoryCacheStore.getState().cache).length).toBe(1);

    jest.useRealTimers();
  });
});
