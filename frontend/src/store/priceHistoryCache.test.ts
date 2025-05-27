import usePriceHistoryCacheStore from './priceHistoryCache';

// Helper to get the initial state for resetting the store between tests
const getInitialState = () => usePriceHistoryCacheStore.getState();

describe('usePriceHistoryCacheStore', () => {
  beforeEach(() => {
    // Reset the store to its initial state before each test
    usePriceHistoryCacheStore.setState(getInitialState(), true);
    jest.useRealTimers(); // Default to real timers
  });

  afterEach(() => {
    jest.useRealTimers(); // Ensure real timers are restored
  });

  it('should set and get cache entries', () => {
    const { setCache, getCache } = usePriceHistoryCacheStore.getState();
    const key = 'testKey';
    const data = { value: 'testData' };
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
    const data = { value: 'expiredData' };
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
    const data = { value: 'validData' };
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
    const expiredData = { value: 'iWillExpire' };
    const expiredExpiry = Date.now() + 1000; // Expires in 1 second
    setCache(expiredKey, expiredData, expiredExpiry);

    const validKey = 'validItem';
    const validData = { value: 'iWillPersist' };
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
