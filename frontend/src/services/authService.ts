import { authManager, AuthToken } from './grpc/authManager';
import { authClient } from '@/services/grpc/apiClient';
import { logger as log } from '@/utils/logger';
import { DEBUG_MODE } from '@env';

export interface TokenRequest {
  deviceId: string;
  platform: string;
}

export interface TokenResponse {
  token: string;
  expiresIn: number; // seconds
}

class AuthService {
  private readonly isDevelopment = DEBUG_MODE === 'true';
  private isRefreshing = false; // Flag to prevent concurrent refresh attempts
  private refreshPromise: Promise<void> | null = null; // Store the current refresh promise

  /**
   * Initialize the authentication service
   */
  async initialize(): Promise<void> {
    await authManager.initialize();
    
    // If we don't have a valid token, request one
    if (!(await authManager.hasValidToken())) {
      log.info('🔐 No valid token found, requesting new token');
      await this.refreshToken();
    }
  }

  /**
   * Get a valid bearer token, refreshing if necessary
   */
  async getAuthToken(): Promise<string | null> {
    let token = await authManager.getValidToken();
    
    if (!token) {
      log.info('🔐 Token not available, requesting new token');
      
      // If already refreshing, wait for the existing refresh to complete
      if (this.isRefreshing && this.refreshPromise) {
        log.info('🔐 Token refresh already in progress, waiting...');
        await this.refreshPromise;
        token = await authManager.getValidToken();
      } else {
        // Start a new refresh
        await this.refreshToken();
        token = await authManager.getValidToken();
      }
    }
    
    return token;
  }

  /**
   * Generate a development token (for when backend auth is not ready)
   */
  private generateDevelopmentToken(): TokenResponse {
    const tokenRequest = authManager.generateTokenRequest();
    // Simple JWT-like format for development
    const header = Buffer.from(JSON.stringify({ alg: 'DEV', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      sub: tokenRequest.deviceId,
      platform: tokenRequest.platform,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
      dev: true
    })).toString('base64url');
    const signature = 'dev-signature';
    
    return {
      token: `${header}.${payload}.${signature}`,
      expiresIn: 24 * 60 * 60 // 24 hours in seconds
    };
  }

  /**
   * Request a new token from the backend
   */
  async refreshToken(): Promise<void> {
    // If already refreshing, return the existing promise
    if (this.isRefreshing && this.refreshPromise) {
      log.info('🔐 Token refresh already in progress, returning existing promise');
      return this.refreshPromise;
    }

    // Set the refreshing flag and create the promise
    this.isRefreshing = true;
    this.refreshPromise = this._performTokenRefresh();

    try {
      await this.refreshPromise;
    } finally {
      // Reset the flags
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  /**
   * Internal method to perform the actual token refresh
   */
  private async _performTokenRefresh(): Promise<void> {
    try {
      const tokenRequest = authManager.generateTokenRequest();
      log.info('🔐 Requesting new bearer token', { deviceId: tokenRequest.deviceId });

      let tokenResponse: TokenResponse;

      try {
        // Attempt to get token via gRPC
        const grpcResponse = await authClient.generateToken({
          deviceId: tokenRequest.deviceId,
          platform: tokenRequest.platform,
        });
        tokenResponse = {
          token: grpcResponse.token,
          expiresIn: grpcResponse.expiresIn,
        };
        log.info('🔐 Bearer token received from gRPC');
      } catch (grpcError) {
        log.error('❌ Failed to fetch token via gRPC:', grpcError);
        if (this.isDevelopment) {
          log.warn('🔐 gRPC unavailable in development, falling back to development token');
          tokenResponse = this.generateDevelopmentToken();
        } else {
          // In production, re-throw the error if gRPC fails
          throw grpcError;
        }
      }
      
      // Calculate expiry date
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + tokenResponse.expiresIn);

      const authToken: AuthToken = {
        token: tokenResponse.token,
        expiresAt,
      };

      await authManager.setToken(authToken);
      log.info('🔐 Bearer token refreshed successfully');
    } catch (error) {
      log.error('❌ Failed to refresh bearer token:', error);
      throw error;
    }
  }

  /**
   * Clear the current authentication token
   */
  async clearAuth(): Promise<void> {
    await authManager.clearToken();
    log.info('🔐 Authentication cleared');
  }

  /**
   * Check if the user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    return await authManager.hasValidToken();
  }
}

// Export a singleton instance
export const authService = new AuthService(); 