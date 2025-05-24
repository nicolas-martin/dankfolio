import { AuthService, TOKEN_ENDPOINT_PATH } from './authService';
import { authManager } from './grpc/authManager';
import { logger } from '../utils/logger';
import { DEBUG_MODE } from '@env';

// Mock dependencies
jest.mock('./grpc/authManager');
jest.mock('../utils/logger');
jest.mock('@env', () => ({
  DEBUG_MODE: 'false', // Default to production mode for most tests
  API_URL: 'http://localhost:8080',
}));

const mockAuthManager = authManager as jest.Mocked<typeof authManager>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('AuthService', () => {
  let authService: AuthService;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    jest.resetAllMocks(); // Reset mocks for each test
    originalFetch = global.fetch; // Store original fetch
    global.fetch = jest.fn(); // Mock global fetch

    // Default mock implementations
    mockAuthManager.initialize.mockResolvedValue(undefined);
    mockAuthManager.hasValidToken.mockResolvedValue(false);
    mockAuthManager.getValidToken.mockResolvedValue(null);
    mockAuthManager.generateTokenRequest.mockResolvedValue({
      deviceId: 'test-device-id',
      platform: 'test-platform',
    });
    mockAuthManager.setToken.mockResolvedValue(undefined);
    mockAuthManager.clearToken.mockResolvedValue(undefined);

    authService = new AuthService();
  });

  afterEach(() => {
    global.fetch = originalFetch; // Restore original fetch
  });

  describe('constructor', () => {
    it('should correctly construct the tokenEndpoint', () => {
      // API_URL is mocked to 'http://localhost:8080'
      expect((authService as any).tokenEndpoint).toBe(`http://localhost:8080${TOKEN_ENDPOINT_PATH}`);
    });
  });

  describe('initialize()', () => {
    it('should call authManager.initialize and refreshToken if no valid token exists', async () => {
      mockAuthManager.hasValidToken.mockResolvedValue(false);
      const refreshTokenSpy = jest.spyOn(authService as any, 'refreshToken').mockResolvedValue(undefined); // Spy and mock implementation

      await authService.initialize();

      expect(mockAuthManager.initialize).toHaveBeenCalledTimes(1);
      expect(mockAuthManager.hasValidToken).toHaveBeenCalledTimes(1);
      expect(refreshTokenSpy).toHaveBeenCalledTimes(1);

      refreshTokenSpy.mockRestore();
    });

    it('should call authManager.initialize and NOT refreshToken if a valid token exists', async () => {
      mockAuthManager.hasValidToken.mockResolvedValue(true);
      const refreshTokenSpy = jest.spyOn(authService as any, 'refreshToken').mockResolvedValue(undefined);

      await authService.initialize();

      expect(mockAuthManager.initialize).toHaveBeenCalledTimes(1);
      expect(mockAuthManager.hasValidToken).toHaveBeenCalledTimes(1);
      expect(refreshTokenSpy).not.toHaveBeenCalled();

      refreshTokenSpy.mockRestore();
    });
  });

  describe('getAuthToken()', () => {
    it('should return token from authManager if valid token exists', async () => {
      const validToken = 'valid-token-from-manager';
      mockAuthManager.getValidToken.mockResolvedValue(validToken);
      const refreshTokenSpy = jest.spyOn(authService as any, 'refreshToken').mockResolvedValue(undefined);

      const token = await authService.getAuthToken();

      expect(token).toBe(validToken);
      expect(mockAuthManager.getValidToken).toHaveBeenCalledTimes(1);
      expect(refreshTokenSpy).not.toHaveBeenCalled();

      refreshTokenSpy.mockRestore();
    });

    it('should call refreshToken and return new token if no valid token exists initially', async () => {
      const newToken = 'newly-refreshed-token';
      mockAuthManager.getValidToken.mockResolvedValueOnce(null); // First call returns null
      
      // Spy on refreshToken and make it behave as if it successfully fetched a token
      // and then make getValidToken return the new token on subsequent calls.
      const refreshTokenSpy = jest.spyOn(authService as any, 'refreshToken').mockImplementation(async () => {
        // Simulate that refreshToken has successfully updated the token in authManager
        mockAuthManager.getValidToken.mockResolvedValue(newToken); 
      });

      const token = await authService.getAuthToken();

      expect(refreshTokenSpy).toHaveBeenCalledTimes(1);
      expect(token).toBe(newToken);
      expect(mockAuthManager.getValidToken).toHaveBeenCalledTimes(2); // Once initially, once after refresh

      refreshTokenSpy.mockRestore();
    });

    it('should throw error if refreshToken fails and no token is available', async () => {
      mockAuthManager.getValidToken.mockResolvedValue(null);
      const refreshTokenSpy = jest.spyOn(authService as any, 'refreshToken').mockRejectedValue(new Error('Refresh failed'));

      await expect(authService.getAuthToken()).rejects.toThrow('Refresh failed');

      expect(refreshTokenSpy).toHaveBeenCalledTimes(1);
      expect(mockAuthManager.getValidToken).toHaveBeenCalledTimes(1);

      refreshTokenSpy.mockRestore();
    });
  });

  describe('refreshToken()', () => {
    const mockTokenRequest = { deviceId: 'test-device', platform: 'test-platform' };
    const backendTokenResponse = { token: 'backend-token', expiresIn: 3600 };
    const expectedBackendTokenData = {
      token: 'backend-token',
      expiresAt: new Date(new Date().getTime() + backendTokenResponse.expiresIn * 1000),
    };

    beforeEach(() => {
      mockAuthManager.generateTokenRequest.mockResolvedValue(mockTokenRequest);
      mockAuthManager.setToken.mockResolvedValue(undefined);
    });

    describe('Development Mode (DEBUG_MODE = "true")', () => {
      beforeEach(() => {
        // Dynamically mock @env for this describe block
        jest.doMock('@env', () => ({
          DEBUG_MODE: 'true',
          API_URL: 'http://localhost:8080', // Keep API_URL consistent
        }));
        // Re-initialize authService to pick up the mocked DEBUG_MODE
        authService = new AuthService();
      });

      afterEach(() => {
        jest.dontMock('@env'); // Reset @env mock
      });

      it('should use backend token if fetch succeeds', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce(
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve(backendTokenResponse),
          }),
        );

        await authService.refreshToken();

        expect(global.fetch).toHaveBeenCalledWith(
          (authService as any).tokenEndpoint,
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mockTokenRequest),
          }),
        );
        expect(mockAuthManager.setToken).toHaveBeenCalledWith(
          expect.objectContaining({
            token: expectedBackendTokenData.token,
          }),
        );
        // Check expiresAt with a tolerance
        const actualSetTokenArg = mockAuthManager.setToken.mock.calls[0][0];
        expect(actualSetTokenArg.expiresAt.getTime()).toBeCloseTo(expectedBackendTokenData.expiresAt.getTime(), -2);
      });

      it('should use development token if fetch fails', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce(
          Promise.resolve({ ok: false, status: 500 }),
        );
        const generateDevTokenSpy = jest.spyOn(authService as any, 'generateDevelopmentToken').mockReturnValue({ token: 'dev-token', expiresIn: 86400});


        await authService.refreshToken();

        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch token from backend, using development token. Status: 500'));
        expect(generateDevTokenSpy).toHaveBeenCalledTimes(1);
        expect(mockAuthManager.setToken).toHaveBeenCalledWith(
          expect.objectContaining({
            token: 'dev-token',
          }),
        );
        // Check expiresAt for dev token (24 hours)
        const actualSetTokenArg = mockAuthManager.setToken.mock.calls[0][0];
        const expectedDevExpiresAt = new Date(new Date().getTime() + 86400 * 1000);
        expect(actualSetTokenArg.expiresAt.getTime()).toBeCloseTo(expectedDevExpiresAt.getTime(), -2);
        generateDevTokenSpy.mockRestore();
      });
    });

    describe('Production Mode (DEBUG_MODE = "false")', () => {
      beforeEach(() => {
        // Ensure DEBUG_MODE is false (default mock setup)
        jest.doMock('@env', () => ({
            DEBUG_MODE: 'false',
            API_URL: 'http://localhost:8080',
        }));
        authService = new AuthService();
      });
      
      afterEach(() => {
        jest.dontMock('@env');
      });

      it('should use backend token if fetch succeeds', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce(
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve(backendTokenResponse),
          }),
        );

        await authService.refreshToken();

        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(mockAuthManager.setToken).toHaveBeenCalledWith(
          expect.objectContaining({
            token: expectedBackendTokenData.token,
          }),
        );
        const actualSetTokenArg = mockAuthManager.setToken.mock.calls[0][0];
        expect(actualSetTokenArg.expiresAt.getTime()).toBeCloseTo(expectedBackendTokenData.expiresAt.getTime(), -2);
      });

      it('should throw error if fetch fails', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce(
          Promise.resolve({ ok: false, status: 500 }),
        );

        await expect(authService.refreshToken()).rejects.toThrow('Failed to refresh token. Status: 500');
        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(mockAuthManager.setToken).not.toHaveBeenCalled();
      });

       it('should throw error if fetch rejects (network error)', async () => {
        const networkError = new Error('Network failure');
        (global.fetch as jest.Mock).mockRejectedValueOnce(networkError);

        await expect(authService.refreshToken()).rejects.toThrow(`Failed to refresh token: ${networkError.message}`);
        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(mockAuthManager.setToken).not.toHaveBeenCalled();
      });
    });
  });

  describe('generateDevelopmentToken()', () => {
    // This method is private, but its behavior is critical in development.
    // We've partially tested it via refreshToken in dev mode.
    // These tests directly invoke it for more detailed checks.
    it('should return a token with correct structure and claims', () => {
      const devTokenData = (authService as any).generateDevelopmentToken();
      
      expect(devTokenData).toHaveProperty('token');
      expect(devTokenData).toHaveProperty('expiresIn', 24 * 60 * 60);
      expect(typeof devTokenData.token).toBe('string');

      const parts = devTokenData.token.split('.');
      expect(parts).toHaveLength(3); // Header, Payload, Signature

      // Decode payload (Base64 URL)
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));

      expect(payload).toHaveProperty('dev', true);
      expect(payload).toHaveProperty('sub', 'dev-device-id'); // As per implementation
      expect(payload).toHaveProperty('platform', 'dev-platform'); // As per implementation
      expect(payload).toHaveProperty('iat');
      expect(payload).toHaveProperty('exp');

      const nowInSeconds = Math.floor(Date.now() / 1000);
      expect(payload.iat).toBeCloseTo(nowInSeconds, -1); // Allow for slight timing differences
      expect(payload.exp).toBeCloseTo(nowInSeconds + (24 * 60 * 60), -1);
    });
  });

  describe('clearAuth()', () => {
    it('should call authManager.clearToken', async () => {
      await authService.clearAuth();
      expect(mockAuthManager.clearToken).toHaveBeenCalledTimes(1);
    });
  });

  describe('isAuthenticated()', () => {
    it('should return true if authManager.hasValidToken returns true', async () => {
      mockAuthManager.hasValidToken.mockResolvedValue(true);
      const result = await authService.isAuthenticated();
      expect(result).toBe(true);
      expect(mockAuthManager.hasValidToken).toHaveBeenCalledTimes(1);
    });

    it('should return false if authManager.hasValidToken returns false', async () => {
      mockAuthManager.hasValidToken.mockResolvedValue(false);
      const result = await authService.isAuthenticated();
      expect(result).toBe(false);
      expect(mockAuthManager.hasValidToken).toHaveBeenCalledTimes(1);
    });
  });
});
