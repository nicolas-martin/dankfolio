import { AuthService } from './authService';
import { authManager, AuthToken } from './grpc/authManager';
import { authClient } from '@/services/grpc/apiClient';
import { logger as log } from '@/utils/logger'; // Renamed to log to match source

// Mock dependencies
jest.mock('./grpc/authManager');
jest.mock('@/services/grpc/apiClient');
jest.mock('@/utils/logger'); // Corrected path for logger
jest.mock('@env', () => ({
  DEBUG_MODE: 'false', // Default to production mode for most tests
  // API_URL is no longer needed as fetch is removed
}));

const mockAuthManager = authManager as jest.Mocked<typeof authManager>;
const mockAuthClient = authClient as jest.Mocked<typeof authClient>;
const mockLogger = log as jest.Mocked<typeof log>; // Use log

describe('AuthService', () => {
  let authService: AuthService;

  const mockTokenRequestPayload = {
    deviceId: 'mock-device-id',
    platform: 'mock-platform',
  };

  beforeEach(() => {
    jest.resetAllMocks(); // Reset mocks for each test

    // Default mock implementations for authManager
    mockAuthManager.initialize.mockResolvedValue(undefined);
    mockAuthManager.hasValidToken.mockResolvedValue(false);
    mockAuthManager.getValidToken.mockResolvedValue(null);
    mockAuthManager.generateTokenRequest.mockReturnValue(mockTokenRequestPayload); // Now returns directly
    mockAuthManager.setToken.mockResolvedValue(undefined);
    mockAuthManager.clearToken.mockResolvedValue(undefined);
    
    // Default mock for authClient.generateToken
    // Tests will override this as needed
    mockAuthClient.generateToken.mockResolvedValue({ token: 'default-grpc-token', expiresIn: 3600 });

    authService = new AuthService();
  });

  // No longer need afterEach to restore fetch

  // Constructor test is no longer relevant as tokenEndpoint is removed

  describe('initialize()', () => {
    // Tests for initialize() remain largely the same, as they spy on refreshToken
    // The internal workings of refreshToken have changed, but its contract with initialize has not.
    it('should call authManager.initialize and refreshToken if no valid token exists', async () => {
      mockAuthManager.hasValidToken.mockResolvedValue(false);
      const refreshTokenSpy = jest.spyOn(authService, 'refreshToken' as any).mockResolvedValue(undefined);

      await authService.initialize();

      expect(mockAuthManager.initialize).toHaveBeenCalledTimes(1);
      expect(mockAuthManager.hasValidToken).toHaveBeenCalledTimes(1);
      expect(refreshTokenSpy).toHaveBeenCalledTimes(1);
      refreshTokenSpy.mockRestore();
    });

    it('should call authManager.initialize and NOT refreshToken if a valid token exists', async () => {
      mockAuthManager.hasValidToken.mockResolvedValue(true);
      const refreshTokenSpy = jest.spyOn(authService, 'refreshToken' as any).mockResolvedValue(undefined);

      await authService.initialize();

      expect(mockAuthManager.initialize).toHaveBeenCalledTimes(1);
      expect(mockAuthManager.hasValidToken).toHaveBeenCalledTimes(1);
      expect(refreshTokenSpy).not.toHaveBeenCalled();
      refreshTokenSpy.mockRestore();
    });
  });

  describe('getAuthToken()', () => {
    // Tests for getAuthToken() also remain largely the same.
    it('should return token from authManager if valid token exists', async () => {
      const validToken = 'valid-token-from-manager';
      mockAuthManager.getValidToken.mockResolvedValue(validToken);
      const refreshTokenSpy = jest.spyOn(authService, 'refreshToken' as any).mockResolvedValue(undefined);

      const token = await authService.getAuthToken();

      expect(token).toBe(validToken);
      expect(mockAuthManager.getValidToken).toHaveBeenCalledTimes(1);
      expect(refreshTokenSpy).not.toHaveBeenCalled();
      refreshTokenSpy.mockRestore();
    });

    it('should call refreshToken and return new token if no valid token exists initially', async () => {
      const newToken = 'newly-refreshed-token';
      mockAuthManager.getValidToken.mockResolvedValueOnce(null); // First call
      
      const refreshTokenSpy = jest.spyOn(authService, 'refreshToken' as any).mockImplementation(async () => {
        mockAuthManager.getValidToken.mockResolvedValue(newToken); // Simulate token update
      });

      const token = await authService.getAuthToken();

      expect(refreshTokenSpy).toHaveBeenCalledTimes(1);
      expect(token).toBe(newToken);
      expect(mockAuthManager.getValidToken).toHaveBeenCalledTimes(2);
      refreshTokenSpy.mockRestore();
    });

    it('should throw error if refreshToken fails and no token is available', async () => {
      mockAuthManager.getValidToken.mockResolvedValue(null);
      const refreshTokenSpy = jest.spyOn(authService, 'refreshToken' as any).mockRejectedValue(new Error('Refresh failed'));

      await expect(authService.getAuthToken()).rejects.toThrow('Refresh failed');

      expect(refreshTokenSpy).toHaveBeenCalledTimes(1);
      expect(mockAuthManager.getValidToken).toHaveBeenCalledTimes(1); // Only called once
      refreshTokenSpy.mockRestore();
    });
  });

  describe('refreshToken()', () => {
    const grpcTokenResponse = { token: 'grpc-token', expiresIn: 3600 };
    const expectedGrpcTokenData: AuthToken = {
      token: 'grpc-token',
      expiresAt: new Date(new Date().getTime() + grpcTokenResponse.expiresIn * 1000),
    };

    beforeEach(() => {
      // This is already set in the main beforeEach, but good to be explicit for this block
      mockAuthManager.generateTokenRequest.mockReturnValue(mockTokenRequestPayload);
    });

    describe('Development Mode (DEBUG_MODE = "true")', () => {
      beforeEach(() => {
        jest.doMock('@env', () => ({ DEBUG_MODE: 'true' }));
        authService = new AuthService(); // Re-initialize with new DEBUG_MODE
      });

      afterEach(() => {
        jest.dontMock('@env');
      });

      it('should use gRPC token if authClient.generateToken succeeds', async () => {
        mockAuthClient.generateToken.mockResolvedValue(grpcTokenResponse);

        await authService.refreshToken();

        expect(mockAuthManager.generateTokenRequest).toHaveBeenCalledTimes(1);
        expect(mockAuthClient.generateToken).toHaveBeenCalledWith(mockTokenRequestPayload);
        expect(mockAuthManager.setToken).toHaveBeenCalledWith(
          expect.objectContaining({ token: grpcTokenResponse.token })
        );
        const actualSetTokenArg = mockAuthManager.setToken.mock.calls[0][0];
        expect(actualSetTokenArg.expiresAt.getTime()).toBeCloseTo(expectedGrpcTokenData.expiresAt.getTime(), -2); // Tolerance for time diff
        expect(mockLogger.info).toHaveBeenCalledWith('🔐 Bearer token received from gRPC');
      });

      it('should use development token if authClient.generateToken fails', async () => {
        const grpcError = new Error('gRPC connection failed');
        mockAuthClient.generateToken.mockRejectedValue(grpcError);
        
        const devToken = { token: 'dev-fallback-token', expiresIn: 86400 }; // 24 hours
        const generateDevTokenSpy = jest.spyOn(authService as any, 'generateDevelopmentToken').mockReturnValue(devToken);

        await authService.refreshToken();

        expect(mockAuthManager.generateTokenRequest).toHaveBeenCalledTimes(1);
        expect(mockAuthClient.generateToken).toHaveBeenCalledWith(mockTokenRequestPayload);
        expect(mockLogger.error).toHaveBeenCalledWith('❌ Failed to fetch token via gRPC:', grpcError);
        expect(mockLogger.warn).toHaveBeenCalledWith('🔐 gRPC unavailable in development, falling back to development token');
        expect(generateDevTokenSpy).toHaveBeenCalledTimes(1);
        
        expect(mockAuthManager.setToken).toHaveBeenCalledWith(
          expect.objectContaining({ token: devToken.token })
        );
        const actualSetTokenArg = mockAuthManager.setToken.mock.calls[0][0];
        const expectedDevExpiresAt = new Date(new Date().getTime() + devToken.expiresIn * 1000);
        expect(actualSetTokenArg.expiresAt.getTime()).toBeCloseTo(expectedDevExpiresAt.getTime(), -2);
        
        generateDevTokenSpy.mockRestore();
      });
    });

    describe('Production Mode (DEBUG_MODE = "false")', () => {
      beforeEach(() => {
        jest.doMock('@env', () => ({ DEBUG_MODE: 'false' }));
        authService = new AuthService(); // Re-initialize
      });

      afterEach(() => {
        jest.dontMock('@env');
      });

      it('should use gRPC token if authClient.generateToken succeeds', async () => {
        mockAuthClient.generateToken.mockResolvedValue(grpcTokenResponse);

        await authService.refreshToken();

        expect(mockAuthManager.generateTokenRequest).toHaveBeenCalledTimes(1);
        expect(mockAuthClient.generateToken).toHaveBeenCalledWith(mockTokenRequestPayload);
        expect(mockAuthManager.setToken).toHaveBeenCalledWith(
          expect.objectContaining({ token: grpcTokenResponse.token })
        );
        const actualSetTokenArg = mockAuthManager.setToken.mock.calls[0][0];
        expect(actualSetTokenArg.expiresAt.getTime()).toBeCloseTo(expectedGrpcTokenData.expiresAt.getTime(), -2);
        expect(mockLogger.info).toHaveBeenCalledWith('🔐 Bearer token received from gRPC');
      });

      it('should throw error if authClient.generateToken fails', async () => {
        const grpcError = new Error('gRPC production error');
        mockAuthClient.generateToken.mockRejectedValue(grpcError);

        await expect(authService.refreshToken()).rejects.toThrow(grpcError);

        expect(mockAuthManager.generateTokenRequest).toHaveBeenCalledTimes(1);
        expect(mockAuthClient.generateToken).toHaveBeenCalledWith(mockTokenRequestPayload);
        expect(mockLogger.error).toHaveBeenCalledWith('❌ Failed to fetch token via gRPC:', grpcError);
        expect(mockAuthManager.setToken).not.toHaveBeenCalled();
      });
    });
  });

  describe('generateDevelopmentToken()', () => {
    it('should return a token with correct structure and claims based on authManager.generateTokenRequest', () => {
      // Ensure authManager.generateTokenRequest is called by generateDevelopmentToken
      // (it is, as per the implementation of AuthService)
      const devTokenData = (authService as any).generateDevelopmentToken();
      
      expect(devTokenData).toHaveProperty('token');
      expect(devTokenData).toHaveProperty('expiresIn', 24 * 60 * 60);
      expect(typeof devTokenData.token).toBe('string');

      const parts = devTokenData.token.split('.');
      expect(parts).toHaveLength(3);

      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));

      expect(payload).toHaveProperty('dev', true);
      expect(payload).toHaveProperty('sub', mockTokenRequestPayload.deviceId); // Check against mocked request
      expect(payload).toHaveProperty('platform', mockTokenRequestPayload.platform); // Check against mocked request
      expect(payload).toHaveProperty('iat');
      expect(payload).toHaveProperty('exp');

      const nowInSeconds = Math.floor(Date.now() / 1000);
      expect(payload.iat).toBeCloseTo(nowInSeconds, -1);
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
