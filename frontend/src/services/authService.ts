import { authManager, AuthToken } from './grpc/authManager';
import { authClient } from '@/services/grpc/apiClient';
import { logger as log } from '@/utils/logger';
import { APP_ENV } from '@env';
import { getAppCheckInstance } from '@/services/firebaseInit';
import { getToken as getAppCheckTokenFirebase } from 'firebase/app-check'; // Import AppCheckError if needed for specific error handling

export interface TokenResponse {
	token: string;
	expiresIn: number; // seconds
}

class AuthService {
	private readonly isDevelopment = APP_ENV === 'development'
	private isRefreshing = false; // Flag to prevent concurrent refresh attempts
	private refreshPromise: Promise<void> | null = null; // Store the current refresh promise

	// Development App Check subject for fallback scenarios
	private static readonly DEV_APP_CHECK_SUBJECT = 'dev-device-id-' + Math.random().toString(36).substring(2, 15);

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
	 * Generate a development token (for when backend auth is not ready or App Check fails in dev)
	 * @param deviceId - In development, this might be a mock subject that App Check would have provided.
	 */
	private generateDevelopmentToken(deviceId: string): TokenResponse {
		// const tokenRequest = authManager.generateTokenRequest(); // platform is still useful
		const platform = authManager.generateTokenRequest().platform;
		log.warn(`🔐 Generating development token for deviceId (mock AppCheck subject): ${deviceId}, platform: ${platform}`);

		const header = Buffer.from(JSON.stringify({ alg: 'DEV', typ: 'JWT' })).toString('base64url');
		const payload = Buffer.from(JSON.stringify({
			// sub: tokenRequest.deviceId, // Old way
			sub: deviceId, // New: using passed mock deviceId (AppCheck subject)
			device_id: deviceId, // Mirroring the 'device_id' claim the backend now creates from subject
			platform: platform,
			iat: Math.floor(Date.now() / 1000),
			exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
			dev: true,
			iss: "dankfolio-app-dev" // Mock issuer
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
		if (this.isDevelopment) {
			log.warn('🔐 APP_ENV is "development": Bypassing Firebase App Check and generating a local dev token.');
			const devTokenResponse = this.generateDevelopmentToken(AuthService.DEV_APP_CHECK_SUBJECT);
			await authManager.setToken({ token: devTokenResponse.token, expiresAt: new Date(Date.now() + devTokenResponse.expiresIn * 1000) });
			log.info('🔐 Local dev token generated and set.');
			return;
		}

		try {
			log.info('🔐 Requesting new application token using App Check...');

			const appCheck = getAppCheckInstance();
			if (!appCheck) {
				log.error('❌ Firebase App Check instance not available. Cannot refresh token.');
				throw new Error('App Check not initialized');
			}

			let appCheckTokenValue: string;
			try {
				const appCheckTokenResult = await getAppCheckTokenFirebase(appCheck, /* forceRefresh= */ false);
				appCheckTokenValue = appCheckTokenResult.token;
				log.info('🔥 Firebase App Check token retrieved successfully.');
			} catch (error) {
				log.error('❌ Failed to retrieve Firebase App Check token:', error);
				if (this.isDevelopment) {
					log.warn('🔐 App Check token retrieval failed in development, falling back to development app token');
					const devTokenResponse = this.generateDevelopmentToken(AuthService.DEV_APP_CHECK_SUBJECT); // Pass a mock subject/deviceId
					await authManager.setToken({ token: devTokenResponse.token, expiresAt: new Date(Date.now() + devTokenResponse.expiresIn * 1000) });
					return; // Exit early after setting dev token
				}
				throw error; // Re-throw in production or if not handling with dev token
			}

			const platform = authManager.generateTokenRequest().platform; // Still useful for platform info

			let tokenResponse: TokenResponse;
			try {
				log.info('🔐 Calling backend GenerateToken with App Check token.', { platform });
				const grpcResponse = await authClient.generateToken({
					appCheckToken: appCheckTokenValue,
					platform: platform,
				});
				tokenResponse = {
					token: grpcResponse.token,
					expiresIn: grpcResponse.expiresIn,
				};
				log.info('🔐 Application token received from gRPC backend.');
			} catch (grpcError) {
				log.error('❌ Failed to fetch application token via gRPC (after App Check):', grpcError);
				// The dev fallback here is less likely to be useful if App Check token was obtained
				// but backend call failed. This indicates a backend issue.
				// Consider if a different dev fallback is needed here or just rethrow.
				if (this.isDevelopment) {
					log.warn('🔐 gRPC call failed in development (after App Check). This might indicate backend issue or mismatched dev JWT.');
					// Optionally, could use generateDevelopmentToken again, but it might mask backend problems.
					// For now, let's let it throw to indicate backend communication failure.
				}
				throw grpcError; // Re-throw to signal failure
			}

			const expiresAt = new Date();
			expiresAt.setSeconds(expiresAt.getSeconds() + tokenResponse.expiresIn);

			const authToken: AuthToken = {
				token: tokenResponse.token,
				expiresAt,
			};

			await authManager.setToken(authToken);
			log.info('🔐 Application token refreshed and stored successfully.');
		} catch (error) {
			log.error('❌ Failed to refresh application token:', error);
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
