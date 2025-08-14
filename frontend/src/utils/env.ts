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
	devAppCheckToken?: string; // For development/simulator only
	// firebaseAppCheckDebugTokenAndroid: string;// For development only
	// firebaseAppCheckDebugTokenIos: string;// For development only
	testPrivateKey?: string; // For development only - consider using secure storage in production
	loadDebugWallet?: boolean; // For development only, to load a debug wallet
	e2eMockingEnabled?: boolean; // For E2E testing, to enable mocking
	hasNetwork?: boolean; // For testing network error handling
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
		devAppCheckToken: extra.DEV_APP_CHECK_TOKEN as string | undefined,
		// firebaseAppCheckDebugTokenAndroid: extra.FIREBASE_APP_CHECK_DEBUG_TOKEN_ANDROID || '',
		// firebaseAppCheckDebugTokenIos: extra.FIREBASE_APP_CHECK_DEBUG_TOKEN_IOS || '',
		testPrivateKey: extra.TEST_PRIVATE_KEY as string,
		sentryAuthToken: extra.SENTRY_AUTH_TOKEN as string,
		loadDebugWallet: extra.LOAD_DEBUG_WALLET === 'true' || extra.E2E_MOCKING_ENABLED === 'true',
		e2eMockingEnabled: extra.E2E_MOCKING_ENABLED === 'true',
		hasNetwork: extra.HAS_NETWORK === 'true' ? true : extra.HAS_NETWORK === 'false' ? false : undefined,
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



	return env;
};

// Export a singleton instance
export const env = getEnvVariables(); 
