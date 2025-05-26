import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import { logger } from '@/utils/logger';

const BEARER_TOKEN_KEY = 'dankfolio_bearer_token';
const TOKEN_EXPIRY_KEY = 'dankfolio_token_expiry';

interface AuthState {
  token: string | null;
  expiresAt: Date | null;
  deviceId: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  initialize: () => Promise<void>;
  setToken: (token: string, expiresAt: Date) => Promise<void>;
  clearToken: () => Promise<void>;
}

const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  expiresAt: null,
  deviceId: null,
  isLoading: true,
  error: null,
  isAuthenticated: false,

  initialize: async () => {
    set({ isLoading: true, error: null });
    try {
      logger.info('Initializing auth store...');
      const storedToken = await AsyncStorage.getItem(BEARER_TOKEN_KEY);
      const storedExpiry = await AsyncStorage.getItem(TOKEN_EXPIRY_KEY);
      const uniqueId = await DeviceInfo.getUniqueId();
      set({ deviceId: uniqueId });

      if (storedToken && storedExpiry) {
        const expiryDate = new Date(storedExpiry);
        if (expiryDate > new Date()) {
          logger.info('Token found in storage and is valid.');
          set({
            token: storedToken,
            expiresAt: expiryDate,
            isAuthenticated: true,
            isLoading: false, // Also set isLoading to false here
            error: null
          });
        } else {
          logger.info('Token found in storage but has expired. Clearing token.');
          await get().clearToken(); // This already sets isAuthenticated: false and isLoading: false (implicitly via its own set calls)
          set({ isLoading: false }); // Ensure isLoading is false if clearToken doesn't explicitly set it in all paths
        }
      } else {
        logger.info('No token found in storage.');
        // Ensure all relevant states are set when no token is found
        set({ token: null, expiresAt: null, isAuthenticated: false, isLoading: false, error: null });
      }
      // No need for a final set({ isLoading: false }) here if all paths above handle it.
      // However, to be safe, or if clearToken is complex, ensure it's handled.
      // Most paths above now set isLoading: false. The clearToken path should ensure it too.
    } catch (e: any) {
      logger.error('Failed to initialize auth store:', e);
      set({ error: e.message || 'Failed to initialize', isLoading: false, isAuthenticated: false, token: null, expiresAt: null });
    }
  },

  setToken: async (token: string, expiresAt: Date) => {
    try {
      logger.info('Setting token...');
      await AsyncStorage.setItem(BEARER_TOKEN_KEY, token);
      await AsyncStorage.setItem(TOKEN_EXPIRY_KEY, expiresAt.toISOString());
      // Ensure isAuthenticated is true and other relevant states are updated
      set({ token, expiresAt, isAuthenticated: true, isLoading: false, error: null });
      logger.info('Token set successfully.');
    } catch (e: any) {
      logger.error('Failed to set token:', e);
      set({ error: e.message || 'Failed to set token' });
    }
  },

  clearToken: async () => {
    try {
      logger.info('Clearing token...');
      await AsyncStorage.removeItem(BEARER_TOKEN_KEY);
      await AsyncStorage.removeItem(TOKEN_EXPIRY_KEY);
      // Ensure isAuthenticated is false and other relevant states are updated
      set({ token: null, expiresAt: null, isAuthenticated: false, isLoading: false, error: null });
      logger.info('Token cleared successfully.');
    } catch (e: any) {
      logger.error('Failed to clear token:', e);
      // Ensure relevant states are updated in case of error
      set({ error: e.message || 'Failed to clear token', isLoading: false, isAuthenticated: false });
    }
  },
}));

// Removed the useAuthStore.subscribe block as per refactoring instructions.
// isAuthenticated is now managed directly within initialize, setToken, and clearToken actions.

export default useAuthStore;
