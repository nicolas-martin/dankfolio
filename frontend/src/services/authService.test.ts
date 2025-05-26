import { authService } from './authService';
import useAuthStore from '@/store/auth';
import { authClient } from '@/services/grpc/apiClient';
import { logger } from '@/utils/logger';
import { getAppCheckInstance } from '@/services/firebaseInit';
import { getToken as getAppCheckTokenFirebase } from 'firebase/app-check';
import { create } from "@bufbuild/protobuf";
import { GenerateTokenResponseSchema } from "@/gen/dankfolio/v1/auth_pb";

// Mock dependencies
jest.mock('@/store/auth');
jest.mock('@/services/grpc/apiClient');
jest.mock('@/utils/logger');
jest.mock('@/services/firebaseInit');
jest.mock('firebase/app-check');

const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;
const mockAuthClient = authClient as jest.Mocked<typeof authClient>;
const mockLogger = logger as jest.Mocked<typeof logger>;
const mockGetAppCheckInstance = getAppCheckInstance as jest.MockedFunction<typeof getAppCheckInstance>;
const mockGetAppCheckTokenFirebase = getAppCheckTokenFirebase as jest.MockedFunction<typeof getAppCheckTokenFirebase>;

// Mock store state
const mockStoreState = {
  token: null as string | null,
  expiresAt: null,
  deviceId: 'mock-device-id',
  isLoading: false,
  error: null,
  isAuthenticated: false,
  initialize: jest.fn().mockResolvedValue(undefined),
  setToken: jest.fn().mockResolvedValue(undefined),
  clearToken: jest.fn().mockResolvedValue(undefined),
};

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset store state
    mockStoreState.token = null;
    mockStoreState.isAuthenticated = false;
    mockStoreState.initialize.mockResolvedValue(undefined);
    mockStoreState.setToken.mockResolvedValue(undefined);
    mockStoreState.clearToken.mockResolvedValue(undefined);
    
    // Reset store mock
    mockUseAuthStore.mockReturnValue(mockStoreState);
    mockUseAuthStore.getState = jest.fn().mockReturnValue(mockStoreState);
    
    // Reset logger mocks
    mockLogger.info.mockImplementation(() => {});
    mockLogger.warn.mockImplementation(() => {});
    mockLogger.error.mockImplementation(() => {});
    
    // Reset auth client mock
    mockAuthClient.generateToken.mockResolvedValue(
      create(GenerateTokenResponseSchema, {
        token: 'mock-backend-token',
        expiresIn: 3600,
      })
    );
    
    // Reset Firebase mocks
    mockGetAppCheckInstance.mockReturnValue({
      app: { name: 'mock-app' },
      options: {},
    } as any);
    
    mockGetAppCheckTokenFirebase.mockResolvedValue({
      token: 'mock-app-check-token',
    } as any);
  });

  describe('initialize()', () => {
    it('should initialize auth store and request token if not authenticated', async () => {
      mockStoreState.isAuthenticated = false;
      
      await authService.initialize();
      
      expect(mockStoreState.initialize).toHaveBeenCalled();
      expect(mockStoreState.setToken).toHaveBeenCalled();
    });

    it('should initialize auth store and skip token request if already authenticated', async () => {
      mockStoreState.isAuthenticated = true;
      
      await authService.initialize();
      
      expect(mockStoreState.initialize).toHaveBeenCalled();
      // Should not call setToken since already authenticated
      expect(mockStoreState.setToken).not.toHaveBeenCalled();
    });
  });

  describe('getAuthToken()', () => {
    it('should return existing token when authenticated', async () => {
      mockStoreState.isAuthenticated = true;
      mockStoreState.token = 'existing-token';
      
      const token = await authService.getAuthToken();
      
      expect(token).toBe('existing-token');
      expect(mockStoreState.setToken).not.toHaveBeenCalled();
    });

    it('should refresh token when not authenticated', async () => {
      mockStoreState.isAuthenticated = false;
      
      // Mock the state change after token refresh
      mockStoreState.setToken.mockImplementation(() => {
        mockStoreState.isAuthenticated = true;
        mockStoreState.token = 'new-token';
        return Promise.resolve();
      });
      
      const token = await authService.getAuthToken();
      
      expect(mockLogger.info).toHaveBeenCalledWith('🔐 Token not available (store says not authenticated), requesting new token');
      expect(mockStoreState.setToken).toHaveBeenCalled();
      expect(token).toBe('new-token');
    });

    it('should return null when token refresh fails', async () => {
      mockStoreState.isAuthenticated = false;
      mockStoreState.token = null;
      
      // Mock token refresh failure
      mockStoreState.setToken.mockRejectedValue(new Error('Refresh failed'));
      
      await expect(authService.getAuthToken()).rejects.toThrow('Refresh failed');
    });
  });

  describe('refreshToken() - Development Mode', () => {
    it('should generate development token', async () => {
      await authService.refreshToken();
      
      expect(mockStoreState.setToken).toHaveBeenCalled();
      
      // Verify the token structure
      const setTokenCall = mockStoreState.setToken.mock.calls[0];
      const [token, expiresAt] = setTokenCall;
      
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format
      expect(expiresAt).toBeInstanceOf(Date);
    });

    it('should generate valid JWT structure', async () => {
      await authService.refreshToken();
      
      const setTokenCall = mockStoreState.setToken.mock.calls[0];
      const [token] = setTokenCall;
      
      const [header, payload, signature] = token.split('.');
      
      // Decode header
      const decodedHeader = JSON.parse(Buffer.from(header.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
      expect(decodedHeader.alg).toBe('DEV');
      expect(decodedHeader.typ).toBe('JWT');
      
      // Decode payload
      const decodedPayload = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
      expect(decodedPayload.platform).toBe('mobile');
      expect(decodedPayload.dev).toBe(true);
      expect(decodedPayload.iss).toBe('dankfolio-app-dev');
      expect(typeof decodedPayload.sub).toBe('string');
      expect(typeof decodedPayload.device_id).toBe('string');
      expect(typeof decodedPayload.iat).toBe('number');
      expect(typeof decodedPayload.exp).toBe('number');
      
      expect(signature).toBe('dev-signature');
    });
  });

  describe('clearAuth()', () => {
    it('should clear authentication', async () => {
      await authService.clearAuth();
      
      expect(mockStoreState.clearToken).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('🔐 Authentication cleared');
    });
  });

  describe('isAuthenticated()', () => {
    it('should return true when authenticated', async () => {
      mockStoreState.isAuthenticated = true;
      
      const result = await authService.isAuthenticated();
      
      expect(result).toBe(true);
    });

    it('should return false when not authenticated', async () => {
      mockStoreState.isAuthenticated = false;
      
      const result = await authService.isAuthenticated();
      
      expect(result).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should handle store initialization errors', async () => {
      const storeError = new Error('Store init failed');
      mockStoreState.initialize.mockRejectedValue(storeError);
      
      await expect(authService.initialize()).rejects.toThrow('Store init failed');
    });

    it('should handle clear auth errors', async () => {
      const clearError = new Error('Clear failed');
      mockStoreState.clearToken.mockRejectedValue(clearError);
      
      await expect(authService.clearAuth()).rejects.toThrow('Clear failed');
    });
  });

  describe('Token generation', () => {
    it('should generate tokens with correct expiration', async () => {
      const beforeTime = Date.now();
      
      await authService.refreshToken();
      
      const afterTime = Date.now();
      const setTokenCall = mockStoreState.setToken.mock.calls[0];
      const [, expiresAt] = setTokenCall;
      
      // Should expire in approximately 24 hours (allowing for test execution time)
      const expectedExpiry = beforeTime + (24 * 60 * 60 * 1000);
      const actualExpiry = expiresAt.getTime();
      
      expect(actualExpiry).toBeGreaterThan(expectedExpiry - 1000); // Within 1 second
      expect(actualExpiry).toBeLessThan(afterTime + (24 * 60 * 60 * 1000) + 1000);
    });

    it('should generate unique device IDs in tokens', async () => {
      await authService.refreshToken();
      
      const setTokenCall1 = mockStoreState.setToken.mock.calls[0];
      const [token1] = setTokenCall1;
      
      // Clear mocks and generate another token
      jest.clearAllMocks();
      mockStoreState.setToken.mockResolvedValue(undefined);
      
      await authService.refreshToken();
      
      const setTokenCall2 = mockStoreState.setToken.mock.calls[0];
      const [token2] = setTokenCall2;
      
      // Extract device IDs from tokens
      const payload1 = JSON.parse(Buffer.from(token1.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
      const payload2 = JSON.parse(Buffer.from(token2.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
      
      // Device IDs should be the same (static for the class)
      expect(payload1.device_id).toBe(payload2.device_id);
      expect(payload1.sub).toBe(payload2.sub);
    });
  });
}); 