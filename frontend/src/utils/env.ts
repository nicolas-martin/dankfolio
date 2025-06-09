import Constants from 'expo-constants';
import { logger } from './logger';

/**
 * Environment variables interface
 */
interface EnvVariables {
	apiUrl: string;
	solanaRpcEndpoint: string;
	debugMode: boolean;
	appEnv: string;
	sentryAuthToken: string;
	firebaseAppCheckDebugTokenAndroid: string;// For development only
	firebaseAppCheckDebugTokenIos: string;// For development only
	testPrivateKey?: string; // For development only
	loadDebugWallet?: boolean; // For development only, to load a debug wallet
	e2eMockingEnabled?: boolean; // For E2E testing, to enable mocking
}

/**
 * Get environment variables from Expo Constants
 */
export const getEnvVariables = (): EnvVariables => {
	// Access the environment variables from Constants
	const extra = Constants.expoConfig?.extra || {};

	const env: EnvVariables = {
		apiUrl: extra.REACT_APP_API_URL as string,
		solanaRpcEndpoint: extra.REACT_APP_SOLANA_RPC_ENDPOINT as string,
		debugMode: extra.DEBUG_MODE === 'true',
		appEnv: extra.APP_ENV as string,
		firebaseAppCheckDebugTokenAndroid: extra.FIREBASE_APP_CHECK_DEBUG_TOKEN_ANDROID || '',
		firebaseAppCheckDebugTokenIos: extra.FIREBASE_APP_CHECK_DEBUG_TOKEN_IOS || '',
		testPrivateKey: extra.TEST_PRIVATE_KEY as string,
		sentryAuthToken: extra.SENTRY_AUTH_TOKEN as string,
		loadDebugWallet: extra.LOAD_DEBUG_WALLET === 'true' ||
			process.env.E2E_MOCKING_ENABLED === 'true',
		e2eMockingEnabled: process.env.E2E_MOCKING_ENABLED === 'true'
	};

	// Override apiUrl for E2E mocking
	// This relies on E2E_MOCKING_ENABLED being set as a Babel transform or similar
	// if it's not directly available as process.env in this context.
	if (process.env.E2E_MOCKING_ENABLED === 'true') {
		logger.info('[MSW] E2E_MOCKING_ENABLED is true, setting apiUrl to http://localhost:9000 for MSW.');
		env.apiUrl = 'http://localhost:9000';
	}

	if (!env.apiUrl || !env.solanaRpcEndpoint || !env.sentryAuthToken) {
		logger.exception('Missing required environment variables');
	}

	// Log environment in dev mode
	// TODO: Remove this 
	//   if (__DEV__) {
	logger.info('Environment variables loaded:', {
		appEnv: env.appEnv,
		debugMode: extra.DEBUG_MODE === 'true',
		apiUrl: env.apiUrl,
		solanaRpcEndpoint: env.solanaRpcEndpoint,
		sentryAuthToken: env.sentryAuthToken,
		firebaseTokensConfigured: !!(env.firebaseAppCheckDebugTokenAndroid && env.firebaseAppCheckDebugTokenIos),
		loadDebugWallet: env.loadDebugWallet,
	});
	//   }

	return env;
};

// Export a singleton instance
export const env = getEnvVariables(); 
