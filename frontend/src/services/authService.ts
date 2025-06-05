import useAuthStore from '@/store/auth';
import { authClient } from '@/services/grpc/authClient';
import { logger as log } from '@/utils/logger';
import appCheck from '@react-native-firebase/app-check';

export interface TokenResponse {
	token: string;
	expiresIn: number; // seconds
}

// Interface matching the one previously in authManager and used in _performTokenRefresh
interface AuthToken {
	token: string;
	expiresAt: Date;
}

class AuthService {
	// private readonly isDevelopment = __DEV__
	private readonly isDevelopment = false
	private isRefreshing = false; // Flag to prevent concurrent refresh attempts
	private refreshPromise: Promise<void> | null = null; // Store the current refresh promise

	// Development App Check subject for fallback scenarios
	private static readonly DEV_APP_CHECK_SUBJECT = 'dev-device-id-' + Math.random().toString(36).substring(2, 15);

	/**
	 * Initialize the authentication service
	 */
	async initialize(): Promise<void> {
		// Initialize the new auth store
		await useAuthStore.getState().initialize();

		// If we don't have a valid token (i.e., not authenticated according to the store), request one
		if (!useAuthStore.getState().isAuthenticated) {
			log.info('🔐 No valid token found (store says not authenticated), requesting new token');
			await this.refreshToken();
		}
	}

	/**
	 * Get a valid bearer token, refreshing if necessary
	 */
	async getAuthToken(): Promise<string | null> {
		const state = useAuthStore.getState();

		// Use the store's isAuthenticated (which already checks token validity and expiration)
		if (!state.isAuthenticated) {
			log.info('🔐 Token not available (store says not authenticated), requesting new token');

			// If already refreshing, wait for the existing refresh to complete
			if (this.isRefreshing && this.refreshPromise) {
				log.info('🔐 Token refresh already in progress, waiting...');
				await this.refreshPromise;
			} else {
				// Start a new refresh
				await this.refreshToken();
			}
			
			// Return the new token after refresh
			return useAuthStore.getState().token;
		}

		return state.token;
	}

	/**
	 * Check if the current token needs refresh (for debugging/testing)
	 */
	public needsRefresh(): boolean {
		// Use the store's isAuthenticated (which already checks token validity and expiration)
		return !useAuthStore.getState().isAuthenticated;
	}

	/**
	 * Generate a development token (for when backend auth is not ready or App Check fails in dev)
	 * @param deviceId - In development, this might be a mock subject that App Check would have provided.
	 */
	private generateDevelopmentToken(deviceId: string): TokenResponse {
		const platform = 'mobile'; // Platform is consistently 'mobile'
		log.warn(`🔐 Generating development token for deviceId (mock AppCheck subject): ${deviceId}, platform: ${platform}`);

		// Use base64 encoding and manually convert to base64url format (React Native compatible)
		// IMPORTANT: Change algorithm from 'DEV' to 'HS256' to match backend expectation
		const headerJson = JSON.stringify({ alg: 'HS256', typ: 'JWT' });
		const payloadJson = JSON.stringify({
			sub: deviceId,
			device_id: deviceId, // Mirroring the 'device_id' claim the backend now creates from subject
			platform: platform,
			iat: Math.floor(Date.now() / 1000),
			exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
			iss: "dankfolio-app" // Match the issuer used by backend
		});

		// Convert base64 to base64url format (replace + with -, / with _, remove padding =)
		const header = Buffer.from(headerJson).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
		const payload = Buffer.from(payloadJson).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
		
		// Use a dev signature that simulates HS256
		const signature = 'dev-hs256-signature';

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
			// Use the new auth store's setToken method
			await useAuthStore.getState().setToken(devTokenResponse.token, new Date(Date.now() + devTokenResponse.expiresIn * 1000));
			log.info('🔐 Local dev token generated and set.');
			return;
		}

		try {
			log.info('🔐 Requesting new application token using App Check...');

			let appCheckTokenValue: string;
			try {
				// Use the modern Firebase API format to avoid deprecation warnings
				// Force refresh to ensure we get a fresh token
				const appCheckTokenResult = await appCheck().getToken(true);
				
				if (!appCheckTokenResult || !appCheckTokenResult.token) {
					throw new Error('App Check token is empty or undefined');
				}
				
				appCheckTokenValue = appCheckTokenResult.token;
				log.info('🔥 Firebase App Check token retrieved successfully.');
				
				// Log detailed token info for debugging
				try {
					const tokenParts = appCheckTokenValue.split('.');
					if (tokenParts.length === 3) {
						// Only log the header to see the signing method
						const headerBase64 = tokenParts[0];
						const headerJson = Buffer.from(headerBase64, 'base64').toString('utf8');
						log.info('🔥 AppCheck token header:', headerJson);
					} else {
						log.warn('🔥 AppCheck token is not in expected JWT format');
					}
				} catch (parseError) {
					log.warn('🔥 Could not parse AppCheck token for logging:', parseError);
				}

			} catch (error) {
				log.error('❌ Failed to retrieve Firebase App Check token:', error);
				if (this.isDevelopment) {
					log.warn('🔐 App Check token retrieval failed in development, falling back to development app token');
					const devTokenResponse = this.generateDevelopmentToken(AuthService.DEV_APP_CHECK_SUBJECT); // Pass a mock subject/deviceId
					// Use the new auth store's setToken method
					await useAuthStore.getState().setToken(devTokenResponse.token, new Date(Date.now() + devTokenResponse.expiresIn * 1000));
					return; // Exit early after setting dev token
				}
				throw error; // Re-throw in production or if not handling with dev token
			}

			const platform = 'mobile'; // Platform is consistently 'mobile'

			let tokenResponse: TokenResponse;
			try {
				log.info('🔐 Calling backend GenerateToken with App Check token.', { platform });
				
				// Make the gRPC call to get the application token
				const grpcResponse = await authClient.generateToken({
					appCheckToken: appCheckTokenValue,
					platform: platform,
				});
				
				if (!grpcResponse || !grpcResponse.token) {
					throw new Error('Backend returned empty token response');
				}
				
				tokenResponse = {
					token: grpcResponse.token,
					expiresIn: grpcResponse.expiresIn,
				};
				
				log.info('🔐 Application token received from gRPC backend.');
				
				// Log detailed token info for debugging
				try {
					const tokenParts = tokenResponse.token.split('.');
					if (tokenParts.length === 3) {
						// Only log the header to see the signing method
						const headerBase64 = tokenParts[0];
						const headerJson = Buffer.from(headerBase64, 'base64').toString('utf8');
						log.info('🔐 Application token header:', headerJson);
					} else {
						log.warn('🔐 Application token is not in expected JWT format');
					}
				} catch (parseError) {
					log.warn('🔐 Could not parse application token for logging:', parseError);
				}
				
			} catch (grpcError) {
				log.error('❌ Failed to fetch application token via gRPC (after App Check):', grpcError);
				throw grpcError;
			}

			const expiresAt = new Date();
			expiresAt.setSeconds(expiresAt.getSeconds() + tokenResponse.expiresIn);

			const authToken: AuthToken = {
				token: tokenResponse.token,
				expiresAt,
			};

			// Use the new auth store's setToken method
			await useAuthStore.getState().setToken(authToken.token, authToken.expiresAt);
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
		await useAuthStore.getState().clearToken();
		log.info('🔐 Authentication cleared');
	}

	/**
	 * Check if the user is authenticated
	 */
	async isAuthenticated(): Promise<boolean> {
		// Directly return the isAuthenticated state from the store
		return useAuthStore.getState().isAuthenticated;
	}
}

// Export a singleton instance
export const authService = new AuthService(); 
