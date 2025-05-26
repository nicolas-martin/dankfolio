import { authService } from './authService';
// AuthToken is no longer imported from authManager
import { authClient } from '@/services/grpc/apiClient';
import { logger as log } from '@/utils/logger'; // Renamed to log to match source
import { getAppCheckInstance } from '@/services/firebaseInit';
import { useAuthStore } from '@/store/auth'; // Import the actual store
import { getToken as getAppCheckTokenFirebase } from 'firebase/app-check';
import { create } from "@bufbuild/protobuf";
import { GenerateTokenResponseSchema } from "@/gen/dankfolio/v1/auth_pb";

// Use the actual authService instance for testing

// Mock dependencies
// jest.mock('./grpc/authManager'); // REMOVED
jest.mock('@/store/auth'); // ADDED
jest.mock('@/services/grpc/apiClient');
jest.mock('@/utils/logger'); // Corrected path for logger
jest.mock('@/services/firebaseInit');
jest.mock('firebase/app-check');

// Flexible @env mock
let currentAppEnv = 'development'; // Default to development
jest.mock('@env', () => ({
  get APP_ENV() { return currentAppEnv; },
}));


// const mockAuthManager = authManager as jest.Mocked<typeof authManager>; // REMOVED
const mockAuthClient = authClient as jest.Mocked<typeof authClient>;
const mockLogger = log as jest.Mocked<typeof log>; // Use log
const mockGetAppCheckInstance = getAppCheckInstance as jest.MockedFunction<typeof getAppCheckInstance>;
const mockGetAppCheckTokenFirebase = getAppCheckTokenFirebase as jest.MockedFunction<typeof getAppCheckTokenFirebase>;
const mockUseAuthStore = useAuthStore as jest.Mocked<typeof useAuthStore>; // ADDED

// Declare mock functions for store actions
let mockInitialize: jest.Mock;
let mockSetToken: jest.Mock;
let mockClearToken: jest.Mock;
let mockAuthState: any; // Define more specific type if possible


describe('AuthService', () => {

  // const mockTokenRequestPayload = { // REMOVED - platform is hardcoded, deviceId from store or generated
  //   deviceId: 'mock-device-id',
  //   platform: 'mock-platform',
  // };

  const mockAppCheckInstance = {
    app: {},
    // Add other properties if needed
  };

  // Helper function to create proper protobuf messages
  const createMockGenerateTokenResponse = (token: string, expiresIn: number) => {
    return create(GenerateTokenResponseSchema, {
      token,
      expiresIn,
    });
  };

  beforeEach(() => {
    jest.resetAllMocks(); // Reset mocks for each test

    // Initialize mock functions for store actions for each test
    mockInitialize = jest.fn().mockResolvedValue(undefined);
    mockSetToken = jest.fn(); 
    mockClearToken = jest.fn().mockResolvedValue(undefined);

    // Default state for the store mock for each test
    mockAuthState = {
      isAuthenticated: false,
      token: null,
      expiresAt: null,
      deviceId: 'mock-device-id-from-store',
      // Actions:
      initialize: mockInitialize,
      setToken: mockSetToken,
      clearToken: mockClearToken,
    };

    // Configure the mock for useAuthStore.getState()
    (useAuthStore as any).getState = jest.fn().mockImplementation(() => mockAuthState);
    
    // Default mock for authClient.generateToken
    mockAuthClient.generateToken.mockResolvedValue(createMockGenerateTokenResponse('default-grpc-token', 3600));

    // Default mocks for Firebase App Check
    mockGetAppCheckInstance.mockReturnValue(mockAppCheckInstance as any);
    mockGetAppCheckTokenFirebase.mockResolvedValue({ token: 'mock-app-check-token' } as any);

  });


  describe('initialize()', () => {
    it('should call useAuthStore.getState().initialize and call refreshToken if not authenticated', async () => {
      mockAuthState.isAuthenticated = false; // Set initial state for the test

      await authService.initialize();

      expect(mockInitialize).toHaveBeenCalledTimes(1);
      // refreshToken is called if not authenticated, so App Check and gRPC calls should be made
      expect(mockGetAppCheckInstance).toHaveBeenCalled(); 
      expect(mockAuthClient.generateToken).toHaveBeenCalled(); // Assuming default production path for refreshToken
    });

    it('should call useAuthStore.getState().initialize and NOT refreshToken if authenticated', async () => {
      mockAuthState.isAuthenticated = true; // Set initial state for the test

      await authService.initialize();

      expect(mockInitialize).toHaveBeenCalledTimes(1);
      // Since authenticated, refreshToken is NOT called
      expect(mockGetAppCheckInstance).not.toHaveBeenCalled();
      expect(mockAuthClient.generateToken).not.toHaveBeenCalled();
    });
  });

  describe('getAuthToken()', () => {
    it('should return token from useAuthStore if authenticated and token exists', async () => {
      const validToken = 'valid-token-from-store';
      mockAuthState.isAuthenticated = true;
      mockAuthState.token = validToken;
      mockAuthState.expiresAt = new Date(Date.now() + 3600 * 1000);

      const token = await authService.getAuthToken();

      expect(token).toBe(validToken);
      // No refresh expected
      expect(mockGetAppCheckInstance).not.toHaveBeenCalled();
    });

    it('should call refreshToken and return new token if not authenticated', async () => {
      const newToken = 'default-grpc-token'; // Default from mockAuthClient
      mockAuthState.isAuthenticated = false; // Initial state
      
      // Simulate refreshToken succeeding and setting the token in the store
      mockAuthClient.generateToken.mockImplementationOnce(async () => {
        // This is a bit of a simplification; ideally, refreshToken sets the store state
        // For this test, we assume refreshToken calls setToken which updates the store
        mockAuthState.isAuthenticated = true;
        mockAuthState.token = newToken;
        mockAuthState.expiresAt = new Date(Date.now() + 3600 * 1000);
        return createMockGenerateTokenResponse(newToken, 3600);
      });


      const token = await authService.getAuthToken();

      expect(token).toBe(newToken);
      expect(mockGetAppCheckInstance).toHaveBeenCalled(); // refreshToken was called
      expect(mockAuthClient.generateToken).toHaveBeenCalled();
    });
    
    it('should return null if not authenticated and refreshToken fails to produce a token', async () => {
      mockAuthState.isAuthenticated = false; // Initial state
      mockAuthClient.generateToken.mockRejectedValue(new Error('gRPC failed')); // Refresh fails

      // Ensure store state doesn't change to authenticated
      mockSetToken.mockImplementation(() => {
          mockAuthState.isAuthenticated = false;
          mockAuthState.token = null;
      });
      
      await expect(authService.getAuthToken()).rejects.toThrow('gRPC failed');
      
      const token = useAuthStore.getState().token; //get token after attempting refresh
      expect(token).toBeNull();
      expect(mockGetAppCheckInstance).toHaveBeenCalled();
      expect(mockAuthClient.generateToken).toHaveBeenCalled();
    });
  });

  describe('refreshToken() with App Check', () => {
    const grpcTokenResponse = { token: 'grpc-token', expiresIn: 3600 };

    describe('Production Mode (APP_ENV is not "development")', () => {
      beforeEach(() => {
        currentAppEnv = 'production'; // Set APP_ENV for these tests
      });

      afterEach(() => {
        currentAppEnv = 'development'; // Reset APP_ENV after these tests
      });

      it('should use App Check token and gRPC token if both succeed, then call store.setToken', async () => {
        mockGetAppCheckTokenFirebase.mockResolvedValue({ token: 'valid-app-check-token' } as any);
        mockAuthClient.generateToken.mockResolvedValue(createMockGenerateTokenResponse(grpcTokenResponse.token, grpcTokenResponse.expiresIn));

        await authService.refreshToken();

        expect(mockGetAppCheckInstance).toHaveBeenCalledTimes(1);
        expect(mockGetAppCheckTokenFirebase).toHaveBeenCalledWith(mockAppCheckInstance, false);
        expect(mockAuthClient.generateToken).toHaveBeenCalledWith({
          appCheckToken: 'valid-app-check-token',
          platform: 'mobile', // Platform is hardcoded
        });
        expect(mockSetToken).toHaveBeenCalledWith(
          grpcTokenResponse.token, 
          expect.any(Date) // Check that expiresAt is a Date
        );
        // Check date more precisely if needed:
        const expectedExpiry = new Date(Date.now() + grpcTokenResponse.expiresIn * 1000);
        const actualExpiry = mockSetToken.mock.calls[0][1] as Date;
        expect(actualExpiry.getTime()).toBeCloseTo(expectedExpiry.getTime(), -2); // Check within ~100ms

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

      it('should throw, not use dev token, if App Check token retrieval fails in production', async () => {
        const appCheckError = new Error('App Check token failed in prod');
        mockGetAppCheckTokenFirebase.mockRejectedValue(appCheckError);
        // currentAppEnv is already 'production' due to beforeEach

        await expect(authService.refreshToken()).rejects.toThrow(appCheckError);

        expect(mockGetAppCheckInstance).toHaveBeenCalledTimes(1);
        expect(mockGetAppCheckTokenFirebase).toHaveBeenCalledWith(mockAppCheckInstance, false);
        expect(mockAuthClient.generateToken).not.toHaveBeenCalled(); // gRPC should not be called
        expect(mockLogger.error).toHaveBeenCalledWith('❌ Failed to retrieve Firebase App Check token:', appCheckError);
        expect(mockSetToken).not.toHaveBeenCalled(); // No token should be set
      });


      it('should throw error if gRPC call fails after App Check succeeds', async () => {
        const grpcError = new Error('gRPC production error');
        mockGetAppCheckTokenFirebase.mockResolvedValue({ token: 'valid-app-check-token' } as any);
        mockAuthClient.generateToken.mockRejectedValue(grpcError);

        await expect(authService.refreshToken()).rejects.toThrow(grpcError);

        expect(mockGetAppCheckTokenFirebase).toHaveBeenCalledWith(mockAppCheckInstance, false);
        expect(mockAuthClient.generateToken).toHaveBeenCalledWith({
          appCheckToken: 'valid-app-check-token',
          platform: 'mobile',
        });
        expect(mockLogger.error).toHaveBeenCalledWith('❌ Failed to fetch application token via gRPC (after App Check):', grpcError);
        expect(mockSetToken).not.toHaveBeenCalled();
      });
    });

    describe('Development Mode (APP_ENV is "development")', () => {
      beforeEach(() => {
        currentAppEnv = 'development'; // Set APP_ENV for these tests
      });

      // No afterEach needed to reset currentAppEnv as the outer beforeEach will reset it or next describe's beforeEach will set it.

      it('SHOULD BYPASS AppCheck and use dev token because APP_ENV is development', async () => {
        // This test now correctly reflects the primary behavior in dev mode: bypass App Check.
        await authService.refreshToken();

        expect(mockLogger.warn).toHaveBeenCalledWith('🔐 APP_ENV is "development": Bypassing Firebase App Check and generating a local dev token.');
        expect(mockGetAppCheckInstance).not.toHaveBeenCalled();
        expect(mockGetAppCheckTokenFirebase).not.toHaveBeenCalled();
        expect(mockAuthClient.generateToken).not.toHaveBeenCalled();
        expect(mockSetToken).toHaveBeenCalledWith(
          expect.stringMatching(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/), // JWT format
          expect.any(Date)
        );
        const devToken = mockSetToken.mock.calls[0][0];
        const devTokenPayload = JSON.parse(Buffer.from(devToken.split('.')[1], 'base64').toString());
        expect(devTokenPayload.dev).toBe(true);
        expect(devTokenPayload.sub).toContain('dev-device-id-');
        expect(mockLogger.info).toHaveBeenCalledWith('🔐 Local dev token generated and set.');
      });
      
      // This test becomes about the fallback within dev mode, if the primary bypass was somehow skipped or conditional.
      // However, the current authService.ts logic for `isDevelopment` makes the bypass unconditional if APP_ENV is 'development'.
      // So, the scenario of App Check failing in dev (and needing a fallback) only happens if `this.isDevelopment` was false.
      // For the sake of covering the code path where App Check is attempted and fails (even if it requires forcing `isDevelopment` to false):
      it('should use development token if App Check is somehow attempted and fails in development', async () => {
        // To hit this path, we need to simulate that the initial `if (this.isDevelopment)` was false.
        // We can force this by temporarily setting currentAppEnv to 'production' for the service's check,
        // then have AppCheck fail, then check if the *fallback* to dev token happens because the outer APP_ENV is still dev for the test context.
        // This is an edge case test for robustness of the fallback.
        
        const originalIsDevelopment = (authService as any).isDevelopment; // Store original
        (authService as any).isDevelopment = false; // Force bypass to be false

        const appCheckError = new Error('App Check token failed');
        mockGetAppCheckTokenFirebase.mockRejectedValue(appCheckError);

        await authService.refreshToken();

        expect(mockGetAppCheckInstance).toHaveBeenCalledTimes(1); // App Check was attempted
        expect(mockGetAppCheckTokenFirebase).toHaveBeenCalledWith(mockAppCheckInstance, false);
        expect(mockAuthClient.generateToken).not.toHaveBeenCalled(); // gRPC should NOT be called due to App Check failure
        expect(mockLogger.error).toHaveBeenCalledWith('❌ Failed to retrieve Firebase App Check token:', appCheckError);
        expect(mockLogger.warn).toHaveBeenCalledWith('🔐 App Check token retrieval failed in development, falling back to development app token');
        
        expect(mockSetToken).toHaveBeenCalledWith(
          expect.stringMatching(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/), 
          expect.any(Date)
        );
        const devToken = mockSetToken.mock.calls[0][0];
        const devTokenPayload = JSON.parse(Buffer.from(devToken.split('.')[1], 'base64').toString());
        expect(devTokenPayload.dev).toBe(true);
        expect(devTokenPayload.sub).toContain('dev-device-id-');

        (authService as any).isDevelopment = originalIsDevelopment; // Restore
      });


      // This test is now largely covered by the "SHOULD BYPASS" test.
      // If APP_ENV is 'development', it should always bypass App Check.
      // The only way App Check is called is if `this.isDevelopment` is false.
      it('should use App Check and gRPC if `this.isDevelopment` is false (even if test context APP_ENV=dev)', async () => {
        const originalIsDevelopment = (authService as any).isDevelopment;
        (authService as any).isDevelopment = false; // Force the service to think it's not dev for one branch

        mockGetAppCheckTokenFirebase.mockResolvedValue({ token: 'valid-app-check-token' } as any);
        mockAuthClient.generateToken.mockResolvedValue(createMockGenerateTokenResponse(grpcTokenResponse.token, grpcTokenResponse.expiresIn));

        await authService.refreshToken();

        expect(mockGetAppCheckInstance).toHaveBeenCalledTimes(1);
        expect(mockGetAppCheckTokenFirebase).toHaveBeenCalledWith(mockAppCheckInstance, false);
        expect(mockAuthClient.generateToken).toHaveBeenCalledWith({
          appCheckToken: 'valid-app-check-token',
          platform: 'mobile', // Platform is hardcoded
        });
        expect(mockSetToken).toHaveBeenCalledWith(
            grpcTokenResponse.token,
            expect.any(Date)
        );

        (authService as any).isDevelopment = originalIsDevelopment; // Restore
      });


      it('should throw error if App Check is attempted and instance is not available', async () => {
        // This requires this.isDevelopment to be false to attempt App Check
        const originalIsDevelopment = (authService as any).isDevelopment;
        (authService as any).isDevelopment = false; // Force attempt App Check

        mockGetAppCheckInstance.mockReturnValue(null);

        await expect(authService.refreshToken()).rejects.toThrow('App Check not initialized');

        expect(mockGetAppCheckInstance).toHaveBeenCalledTimes(1);
        expect(mockGetAppCheckTokenFirebase).not.toHaveBeenCalled();
        expect(mockAuthClient.generateToken).not.toHaveBeenCalled();
        
        (authService as any).isDevelopment = originalIsDevelopment; // Restore
      });
    });
  });


  describe('clearAuth()', () => {
    it('should call useAuthStore.getState().clearToken', async () => {
      await authService.clearAuth();
      expect(mockClearToken).toHaveBeenCalledTimes(1);
    });
  });

  describe('isAuthenticated()', () => {
    it('should return true from useAuthStore.getState().isAuthenticated when it is true', async () => {
      mockAuthState.isAuthenticated = true; // Set the store's state
      const result = await authService.isAuthenticated(); // authService.isAuthenticated directly returns this
      expect(result).toBe(true);
    });

    it('should return false from useAuthStore.getState().isAuthenticated when it is false', async () => {
      mockAuthState.isAuthenticated = false; // Set the store's state
      const result = await authService.isAuthenticated(); // authService.isAuthenticated directly returns this
      expect(result).toBe(false);
    });
  });
});
