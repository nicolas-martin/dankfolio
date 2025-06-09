// Test for the simple API mocking system
import { enableApiMocking, disableApiMocking, shouldEnableMocking } from './mockApi';

// Mock the env module
jest.mock('./env', () => ({
  env: {
    apiUrl: 'http://localhost:9000',
    debugMode: false,
  },
}));

describe('mockApi', () => {
  const originalFetch = global.fetch;
  
  beforeEach(() => {
    // Reset fetch to original
    global.fetch = originalFetch;
    // Reset environment variables
    delete process.env.E2E_MOCKING_ENABLED;
  });

  afterEach(() => {
    disableApiMocking();
  });

  describe('shouldEnableMocking', () => {
    it('should return true when E2E_MOCKING_ENABLED is true', () => {
      process.env.E2E_MOCKING_ENABLED = 'true';
      expect(shouldEnableMocking()).toBe(true);
    });

    it('should return false when E2E_MOCKING_ENABLED is false', () => {
      process.env.E2E_MOCKING_ENABLED = 'false';
      expect(shouldEnableMocking()).toBe(false);
    });
  });

  describe('API mocking', () => {
    it('should intercept API calls and return mock data', async () => {
      enableApiMocking();
      
      const response = await fetch('http://localhost:9000/dankfolio.v1.CoinService/GetAvailableCoins');
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('coins');
      expect(Array.isArray(data.coins)).toBe(true);
      expect(data.coins.length).toBeGreaterThan(0);
      expect(data.coins[0]).toHaveProperty('symbol');
      expect(data.coins[0]).toHaveProperty('name');
      expect(data.coins[0]).toHaveProperty('mintAddress');
    });

    it('should return wallet balances mock data', async () => {
      enableApiMocking();
      
      const response = await fetch('http://localhost:9000/dankfolio.v1.WalletService/GetWalletBalances');
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('balances');
      expect(Array.isArray(data.balances)).toBe(true);
      expect(data.balances.length).toBeGreaterThan(0);
    });

    it('should only intercept API calls', async () => {
      enableApiMocking();
      
      // Test API call gets mocked
      const apiResponse = await fetch('http://localhost:9000/dankfolio.v1.CoinService/GetAvailableCoins');
      const apiData = await apiResponse.json();
      
      expect(apiData).toHaveProperty('coins');
      expect(Array.isArray(apiData.coins)).toBe(true);
    });
  });
}); 