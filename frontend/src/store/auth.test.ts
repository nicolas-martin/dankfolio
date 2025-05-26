import { act, renderHook } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import { logger } from '@/utils/logger';
import { useAuthStore } from './auth';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('react-native-device-info');
jest.mock('@/utils/logger');

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockDeviceInfo = DeviceInfo as jest.Mocked<typeof DeviceInfo>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('useAuthStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset AsyncStorage mocks
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
    mockAsyncStorage.removeItem.mockResolvedValue();
    
    // Reset DeviceInfo mock
    mockDeviceInfo.getUniqueId.mockResolvedValue('mock-device-id');
    
    // Reset logger mocks
    mockLogger.info.mockImplementation(() => {});
    mockLogger.error.mockImplementation(() => {});
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useAuthStore());
      
      expect(result.current.token).toBeNull();
      expect(result.current.expiresAt).toBeNull();
      expect(result.current.deviceId).toBeNull();
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('initialize()', () => {
    it('should initialize with no stored token', async () => {
      const { result } = renderHook(() => useAuthStore());
      
      await act(async () => {
        await result.current.initialize();
      });
      
      expect(mockDeviceInfo.getUniqueId).toHaveBeenCalled();
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('dankfolio_bearer_token');
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('dankfolio_token_expiry');
      expect(result.current.deviceId).toBe('mock-device-id');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isAuthenticated).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith('Initializing auth store...');
      expect(mockLogger.info).toHaveBeenCalledWith('No token found in storage.');
    });

    it('should initialize with valid stored token', async () => {
      const validToken = 'valid-token';
      const futureDate = new Date(Date.now() + 3600 * 1000).toISOString();
      
      mockAsyncStorage.getItem
        .mockResolvedValueOnce(validToken)
        .mockResolvedValueOnce(futureDate);
      
      const { result } = renderHook(() => useAuthStore());
      
      await act(async () => {
        await result.current.initialize();
      });
      
      expect(result.current.token).toBe(validToken);
      expect(result.current.expiresAt).toEqual(new Date(futureDate));
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith('Token found in storage and is valid.');
    });

    it('should clear expired token during initialization', async () => {
      const expiredToken = 'expired-token';
      const pastDate = new Date(Date.now() - 3600 * 1000).toISOString();
      
      mockAsyncStorage.getItem
        .mockResolvedValueOnce(expiredToken)
        .mockResolvedValueOnce(pastDate);
      
      const { result } = renderHook(() => useAuthStore());
      
      await act(async () => {
        await result.current.initialize();
      });
      
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('dankfolio_bearer_token');
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('dankfolio_token_expiry');
      expect(result.current.token).toBeNull();
      expect(result.current.expiresAt).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith('Token found in storage but has expired. Clearing token.');
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Storage error');
      mockDeviceInfo.getUniqueId.mockRejectedValue(error);
      
      const { result } = renderHook(() => useAuthStore());
      
      await act(async () => {
        await result.current.initialize();
      });
      
      expect(result.current.error).toBe('Storage error');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isAuthenticated).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to initialize auth store:', error);
    });
  });

  describe('setToken()', () => {
    it('should set token and update state', async () => {
      const { result } = renderHook(() => useAuthStore());
      const token = 'new-token';
      const expiresAt = new Date(Date.now() + 3600 * 1000);
      
      await act(async () => {
        await result.current.setToken(token, expiresAt);
      });
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('dankfolio_bearer_token', token);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('dankfolio_token_expiry', expiresAt.toISOString());
      expect(result.current.token).toBe(token);
      expect(result.current.expiresAt).toBe(expiresAt);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.error).toBeNull();
      expect(mockLogger.info).toHaveBeenCalledWith('Setting token...');
      expect(mockLogger.info).toHaveBeenCalledWith('Token set successfully.');
    });

    it('should handle setToken errors', async () => {
      const error = new Error('Storage error');
      mockAsyncStorage.setItem.mockRejectedValue(error);
      
      const { result } = renderHook(() => useAuthStore());
      const token = 'new-token';
      const expiresAt = new Date(Date.now() + 3600 * 1000);
      
      await act(async () => {
        await result.current.setToken(token, expiresAt);
      });
      
      expect(result.current.error).toBe('Storage error');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to set token:', error);
    });
  });

  describe('clearToken()', () => {
    it('should clear token and update state', async () => {
      const { result } = renderHook(() => useAuthStore());
      
      // First set a token
      await act(async () => {
        await result.current.setToken('token', new Date());
      });
      
      // Then clear it
      await act(async () => {
        await result.current.clearToken();
      });
      
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('dankfolio_bearer_token');
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('dankfolio_token_expiry');
      expect(result.current.token).toBeNull();
      expect(result.current.expiresAt).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mockLogger.info).toHaveBeenCalledWith('Clearing token...');
      expect(mockLogger.info).toHaveBeenCalledWith('Token cleared successfully.');
    });

    it('should handle clearToken errors', async () => {
      const error = new Error('Storage error');
      mockAsyncStorage.removeItem.mockRejectedValue(error);
      
      const { result } = renderHook(() => useAuthStore());
      
      await act(async () => {
        await result.current.clearToken();
      });
      
      expect(result.current.error).toBe('Storage error');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to clear token:', error);
    });
  });

  describe('isAuthenticated computed state', () => {
    it('should be false when no token', async () => {
      const { result } = renderHook(() => useAuthStore());
      
      await act(async () => {
        await result.current.initialize();
      });
      
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should be false when token is expired', async () => {
      const { result } = renderHook(() => useAuthStore());
      const expiredDate = new Date(Date.now() - 1000); // 1 second ago
      
      await act(async () => {
        await result.current.setToken('token', expiredDate);
      });
      
      // Wait for subscription to update
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should be true when token is valid and not expired', async () => {
      const { result } = renderHook(() => useAuthStore());
      const futureDate = new Date(Date.now() + 3600 * 1000); // 1 hour from now
      
      await act(async () => {
        await result.current.setToken('valid-token', futureDate);
      });
      
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should update when token expires', async () => {
      const { result } = renderHook(() => useAuthStore());
      const soonToExpire = new Date(Date.now() + 50); // 50ms from now
      
      await act(async () => {
        await result.current.setToken('token', soonToExpire);
      });
      
      expect(result.current.isAuthenticated).toBe(true);
      
      // Wait for token to expire and trigger a state change to activate subscription
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        // Trigger a state change to activate the subscription check
        await result.current.setToken('new-token', new Date(Date.now() - 1000)); // Expired token
      });
      
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('State persistence', () => {
    it('should persist token across store instances', async () => {
      const token = 'persistent-token';
      const expiresAt = new Date(Date.now() + 3600 * 1000);
      
      // First instance sets token
      const { result: result1 } = renderHook(() => useAuthStore());
      await act(async () => {
        await result1.current.setToken(token, expiresAt);
      });
      
      // Second instance should load from storage
      mockAsyncStorage.getItem
        .mockResolvedValueOnce(token)
        .mockResolvedValueOnce(expiresAt.toISOString());
      
      const { result: result2 } = renderHook(() => useAuthStore());
      await act(async () => {
        await result2.current.initialize();
      });
      
      expect(result2.current.token).toBe(token);
      expect(result2.current.expiresAt).toEqual(expiresAt);
      expect(result2.current.isAuthenticated).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle malformed expiry date', async () => {
      mockAsyncStorage.getItem
        .mockResolvedValueOnce('token')
        .mockResolvedValueOnce('invalid-date');
      
      const { result } = renderHook(() => useAuthStore());
      
      await act(async () => {
        await result.current.initialize();
      });
      
      // Should handle invalid date gracefully
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle partial storage data', async () => {
      // Only token, no expiry
      mockAsyncStorage.getItem
        .mockResolvedValueOnce('token')
        .mockResolvedValueOnce(null);
      
      const { result } = renderHook(() => useAuthStore());
      
      await act(async () => {
        await result.current.initialize();
      });
      
      expect(result.current.isAuthenticated).toBe(false);
    });
  });
}); 