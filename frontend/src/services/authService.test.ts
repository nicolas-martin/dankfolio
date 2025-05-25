import { AuthService } from './authService';
import { authManager, AuthToken } from './grpc/authManager';
import { authClient } from '@/services/grpc/apiClient';
import { logger as log } from '@/utils/logger'; // Renamed to log to match source
import { getAppCheckInstance } from '@/services/firebaseInit';
import { getToken as getAppCheckTokenFirebase } from 'firebase/app-check';

// Mock dependencies
jest.mock('./grpc/authManager');
jest.mock('@/services/grpc/apiClient');
jest.mock('@/utils/logger'); // Corrected path for logger
jest.mock('@/services/firebaseInit');
jest.mock('firebase/app-check');
jest.mock('@env', () => ({
  DEBUG_MODE: 'false', // Default to production mode for most tests
  // API_URL is no longer needed as fetch is removed
}));

const mockAuthManager = authManager as jest.Mocked<typeof authManager>;
const mockAuthClient = authClient as jest.Mocked<typeof authClient>;
const mockLogger = log as jest.Mocked<typeof log>; // Use log
const mockGetAppCheckInstance = getAppCheckInstance as jest.MockedFunction<typeof getAppCheckInstance>;
const mockGetAppCheckTokenFirebase = getAppCheckTokenFirebase as jest.MockedFunction<typeof getAppCheckTokenFirebase>;

describe('AuthService', () => {
  let authService: AuthService;

  const mockTokenRequestPayload = {
    deviceId: 'mock-device-id',
    platform: 'mock-platform',
  };

  const mockAppCheckInstance = {
    app: {},
    // Add other properties if needed
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

    // Default mocks for Firebase App Check
    mockGetAppCheckInstance.mockReturnValue(mockAppCheckInstance as any);
    mockGetAppCheckTokenFirebase.mockResolvedValue({ token: 'mock-app-check-token' } as any);

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

  describe('refreshToken() with App Check', () => {
    const grpcTokenResponse = { token: 'grpc-token', expiresIn: 3600 };
    const expectedGrpcTokenData: AuthToken = {
      token: 'grpc-token',
      expiresAt: new Date(new Date().getTime() + grpcTokenResponse.expiresIn * 1000),
    };

    beforeEach(() => {
      // This is already set in the main beforeEach, but good to be explicit for this block
      mockAuthManager.generateTokenRequest.mockReturnValue(mockTokenRequestPayload);
    });

    describe('Production Mode (DEBUG_MODE = "false")', () => {
      beforeEach(() => {
        jest.doMock('@env', () => ({ DEBUG_MODE: 'false' }));
        authService = new AuthService(); // Re-initialize with new DEBUG_MODE
      });

      afterEach(() => {
        jest.dontMock('@env');
      });

      it('should use App Check token and gRPC token if both succeed', async () => {
        mockGetAppCheckTokenFirebase.mockResolvedValue({ token: 'valid-app-check-token' } as any);
        mockAuthClient.generateToken.mockResolvedValue(grpcTokenResponse);

        await authService.refreshToken();

        expect(mockGetAppCheckInstance).toHaveBeenCalledTimes(1);
        expect(mockGetAppCheckTokenFirebase).toHaveBeenCalledWith(mockAppCheckInstance, false);
        expect(mockAuthClient.generateToken).toHaveBeenCalledWith({
          appCheckToken: 'valid-app-check-token',
          platform: mockTokenRequestPayload.platform,
        });
        expect(mockAuthManager.setToken).toHaveBeenCalledWith(
          expect.objectContaining({ token: grpcTokenResponse.token })
        );
        expect(mockLogger.info).toHaveBeenCalledWith('🔥 Firebase App Check token retrieved successfully.');
        expect(mockLogger.info).toHaveBeenCalledWith('🔐 Application token received from gRPC backend.');
      });

      it('should throw error if App Check instance is not available', async () => {
        mockGetAppCheckInstance.mockReturnValue(null);

        await expect(authService.refreshToken()).rejects.toThrow('App Check not initialized');

        expect(mockGetAppCheckInstance).toHaveBeenCalledTimes(1);
        expect(mockGetAppCheckTokenFirebase).not.toHaveBeenCalled();
        expect(mockAuthClient.generateToken).not.toHaveBeenCalled();
        expect(mockLogger.error).toHaveBeenCalledWith('❌ Firebase App Check instance not available. Cannot refresh token.');
      });

      it('should throw error if App Check token retrieval fails', async () => {
        const appCheckError = new Error('App Check token failed');
        mockGetAppCheckTokenFirebase.mockRejectedValue(appCheckError);

        await expect(authService.refreshToken()).rejects.toThrow(appCheckError);

        expect(mockGetAppCheckInstance).toHaveBeenCalledTimes(1);
        expect(mockGetAppCheckTokenFirebase).toHaveBeenCalledWith(mockAppCheckInstance, false);
        expect(mockAuthClient.generateToken).not.toHaveBeenCalled();
        expect(mockLogger.error).toHaveBeenCalledWith('❌ Failed to retrieve Firebase App Check token:', appCheckError);
      });

      it('should throw error if gRPC call fails after App Check succeeds', async () => {
        const grpcError = new Error('gRPC production error');
        mockGetAppCheckTokenFirebase.mockResolvedValue({ token: 'valid-app-check-token' } as any);
        mockAuthClient.generateToken.mockRejectedValue(grpcError);

        await expect(authService.refreshToken()).rejects.toThrow(grpcError);

        expect(mockGetAppCheckTokenFirebase).toHaveBeenCalledWith(mockAppCheckInstance, false);
        expect(mockAuthClient.generateToken).toHaveBeenCalledWith({
          appCheckToken: 'valid-app-check-token',
          platform: mockTokenRequestPayload.platform,
        });
        expect(mockLogger.error).toHaveBeenCalledWith('❌ Failed to fetch application token via gRPC (after App Check):', grpcError);
        expect(mockAuthManager.setToken).not.toHaveBeenCalled();
      });
    });

    describe('Development Mode (DEBUG_MODE = "true")', () => {
      beforeEach(() => {
        jest.doMock('@env', () => ({ DEBUG_MODE: 'true' }));
        authService = new AuthService(); // Re-initialize with new DEBUG_MODE
      });

      afterEach(() => {
        jest.dontMock('@env');
      });

      it('should use App Check token and gRPC token if both succeed', async () => {
        mockGetAppCheckTokenFirebase.mockResolvedValue({ token: 'valid-app-check-token' } as any);
        mockAuthClient.generateToken.mockResolvedValue(grpcTokenResponse);

        await authService.refreshToken();

        expect(mockGetAppCheckInstance).toHaveBeenCalledTimes(1);
        expect(mockGetAppCheckTokenFirebase).toHaveBeenCalledWith(mockAppCheckInstance, false);
        expect(mockAuthClient.generateToken).toHaveBeenCalledWith({
          appCheckToken: 'valid-app-check-token',
          platform: mockTokenRequestPayload.platform,
        });
        expect(mockAuthManager.setToken).toHaveBeenCalledWith(
          expect.objectContaining({ token: grpcTokenResponse.token })
        );
      });

      it('should use development token if App Check token retrieval fails', async () => {
        const appCheckError = new Error('App Check token failed');
        mockGetAppCheckTokenFirebase.mockRejectedValue(appCheckError);

        await authService.refreshToken();

        expect(mockGetAppCheckInstance).toHaveBeenCalledTimes(1);
        expect(mockGetAppCheckTokenFirebase).toHaveBeenCalledWith(mockAppCheckInstance, false);
        expect(mockAuthClient.generateToken).not.toHaveBeenCalled();
        expect(mockLogger.error).toHaveBeenCalledWith('❌ Failed to retrieve Firebase App Check token:', appCheckError);
        expect(mockLogger.warn).toHaveBeenCalledWith('🔐 App Check token retrieval failed in development, falling back to development app token');
        
        // Should set a development token
        expect(mockAuthManager.setToken).toHaveBeenCalledWith(
          expect.objectContaining({ 
            token: expect.stringMatching(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/) // JWT format
          })
        );
      });

      it('should throw error if App Check instance is not available', async () => {
        mockGetAppCheckInstance.mockReturnValue(null);

        await expect(authService.refreshToken()).rejects.toThrow('App Check not initialized');

        expect(mockGetAppCheckInstance).toHaveBeenCalledTimes(1);
        expect(mockGetAppCheckTokenFirebase).not.toHaveBeenCalled();
        expect(mockAuthClient.generateToken).not.toHaveBeenCalled();
      });
    });
  });

  describe('generateDevelopmentToken()', () => {
    it('should return a token with correct structure and claims based on authManager.generateTokenRequest', () => {
      const testDeviceId = 'test-device-id-123';
      const devTokenData = (authService as any).generateDevelopmentToken(testDeviceId);
      
      expect(devTokenData).toHaveProperty('token');
      expect(devTokenData).toHaveProperty('expiresIn', 24 * 60 * 60);
      expect(typeof devTokenData.token).toBe('string');

      const parts = devTokenData.token.split('.');
      expect(parts).toHaveLength(3);

      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));

      expect(payload).toHaveProperty('dev', true);
      expect(payload).toHaveProperty('sub', testDeviceId);
      expect(payload).toHaveProperty('device_id', testDeviceId);
      expect(payload).toHaveProperty('platform', mockTokenRequestPayload.platform);
      expect(payload).toHaveProperty('iat');
      expect(payload).toHaveProperty('exp');
      expect(payload).toHaveProperty('iss', 'dankfolio-app-dev');

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
