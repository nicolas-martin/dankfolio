import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger as log } from '@/utils/logger';

const TOKEN_STORAGE_KEY = 'dankfolio_bearer_token';
const TOKEN_EXPIRY_KEY = 'dankfolio_token_expiry';

export interface AuthToken {
  token: string;
  expiresAt: Date;
}

class AuthManager {
  private currentToken: string | null = null;
  private tokenExpiry: Date | null = null;

  /**
   * Initialize the auth manager by loading any existing token from storage
   */
  async initialize(): Promise<void> {
    try {
      const [storedToken, storedExpiry] = await Promise.all([
        AsyncStorage.getItem(TOKEN_STORAGE_KEY),
        AsyncStorage.getItem(TOKEN_EXPIRY_KEY)
      ]);

      if (storedToken && storedExpiry) {
        const expiryDate = new Date(storedExpiry);
        if (expiryDate > new Date()) {
          this.currentToken = storedToken;
          this.tokenExpiry = expiryDate;
          log.info('🔐 Auth token loaded from storage');
        } else {
          log.info('🔐 Stored token expired, clearing storage');
          await this.clearToken();
        }
      }
    } catch (error) {
      log.error('❌ Failed to initialize auth manager:', error);
    }
  }

  /**
   * Get the current valid bearer token
   */
  async getValidToken(): Promise<string | null> {
    if (!this.currentToken || !this.tokenExpiry) {
      return null;
    }

    // Check if token is expired (with 5 minute buffer)
    const now = new Date();
    const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
    if (this.tokenExpiry.getTime() - now.getTime() < bufferTime) {
      log.info('🔐 Token expired or close to expiry, clearing');
      await this.clearToken();
      return null;
    }

    return this.currentToken;
  }

  /**
   * Store a new bearer token
   */
  async setToken(authToken: AuthToken): Promise<void> {
    try {
      this.currentToken = authToken.token;
      this.tokenExpiry = authToken.expiresAt;

      await Promise.all([
        AsyncStorage.setItem(TOKEN_STORAGE_KEY, authToken.token),
        AsyncStorage.setItem(TOKEN_EXPIRY_KEY, authToken.expiresAt.toISOString())
      ]);

      log.info('🔐 Bearer token stored successfully');
    } catch (error) {
      log.error('❌ Failed to store bearer token:', error);
      throw error;
    }
  }

  /**
   * Clear the current token from memory and storage
   */
  async clearToken(): Promise<void> {
    try {
      this.currentToken = null;
      this.tokenExpiry = null;

      await Promise.all([
        AsyncStorage.removeItem(TOKEN_STORAGE_KEY),
        AsyncStorage.removeItem(TOKEN_EXPIRY_KEY)
      ]);

      log.info('🔐 Bearer token cleared');
    } catch (error) {
      log.error('❌ Failed to clear bearer token:', error);
    }
  }

  /**
   * Check if we have a valid token
   */
  async hasValidToken(): Promise<boolean> {
    const token = await this.getValidToken();
    return token !== null;
  }

  /**
   * Generate a device-based token request
   * This creates a unique identifier for this app instance
   */
  generateTokenRequest(): { deviceId: string; platform: string } {
    // URGENT: USE REAL DEVICE ID
    const deviceId = Math.random().toString(36).substring(2, 15) + 
                    Math.random().toString(36).substring(2, 15);
    
    return {
      deviceId,
      platform: 'mobile'
    };
  }
}

// Export a singleton instance
export const authManager = new AuthManager(); 