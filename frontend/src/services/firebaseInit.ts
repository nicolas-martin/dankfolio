import { getApp } from '@react-native-firebase/app';
import appCheck, { initializeAppCheck, ReactNativeFirebaseAppCheckProvider } from '@react-native-firebase/app-check';
import { logger } from '@/utils/logger';
import {
	FIREBASE_APP_CHECK_DEBUG_TOKEN_ANDROID,
	FIREBASE_APP_CHECK_DEBUG_TOKEN_IOS,
} from '@env';

const isDevelopment = __DEV__
// const isDevelopment = false

// Environment-aware App Check configuration
const getAppCheckConfig = () => {
	logger.info('🔧 Getting App Check config...');
	logger.info(`🔧 Is dev mode: ${isDevelopment ? 'true' : 'false'}`);
	if (isDevelopment) {
		if (FIREBASE_APP_CHECK_DEBUG_TOKEN_ANDROID === "") {
			logger.exception("missing dev firebase token for android")
		}
		if (FIREBASE_APP_CHECK_DEBUG_TOKEN_IOS === "") {
			logger.exception("missing dev firebase token for ios")
		}
	}


	const config: any = {
		android: {
			provider: isDevelopment ? 'debug' : 'playIntegrity',
			debugToken: isDevelopment && FIREBASE_APP_CHECK_DEBUG_TOKEN_ANDROID ? FIREBASE_APP_CHECK_DEBUG_TOKEN_ANDROID : undefined,
		},
		apple: {
			provider: isDevelopment ? 'debug' : 'appAttestWithDeviceCheckFallback',
			debugToken: isDevelopment && FIREBASE_APP_CHECK_DEBUG_TOKEN_IOS ? FIREBASE_APP_CHECK_DEBUG_TOKEN_IOS : undefined,
		},
	};

	logger.info(`🔧 Using provider for iOS: ${config.apple.provider}`);
	logger.info(`🔧 Using provider for Android: ${config.android.provider}`);

	return config;
};

let initialized = false;

export async function initializeFirebaseServices(): Promise<void> {
	logger.info('🔥 initializeFirebaseServices called');

	try {
		// Get the default Firebase app that's automatically initialized from GoogleService-Info.plist
		const firebaseApp = getApp();
		logger.info('✅ Firebase app loaded from native configuration (GoogleService-Info.plist)');

		// Create and configure the React Native Firebase App Check provider
		const rnfbProvider = new ReactNativeFirebaseAppCheckProvider();
		const cfg = getAppCheckConfig();
		logger.info('🔧 Configuring App Check with:', cfg);
		rnfbProvider.configure(cfg);

		// Initialize App Check using the modern API with siteKey explicitly set to undefined for native providers
		logger.info('🔧 Calling initializeAppCheck...');
		initializeAppCheck(firebaseApp, {
			provider: rnfbProvider,
			isTokenAutoRefreshEnabled: true,
		});

		// Don't verify by getting a token at initialization - let it happen on demand
		logger.info('✅ Firebase App Check initialized successfully for production');
		initialized = true;
	} catch (error) {
		logger.error('❌ Failed to initialize Firebase App Check in production:', error);
		logger.error('🚨 This will cause authentication failures in production!');
		logger.error(`🚨 Error details: ${error.message || 'No message'}`);
		logger.error(`🚨 Error stack: ${error.stack || 'No stack'}`);

		// In production, we should fail hard if App Check can't be initialized
		throw new Error(`Production Firebase App Check initialization failed: ${error.message}`);
	}
}

// Note: This function is now mainly used for compatibility with existing code
// In new code, prefer using appCheck() directly
export function getAppCheckInstance() {
	logger.info(`🔧 getAppCheckInstance called, __DEV__=${__DEV__}, initialized=${initialized}`);

	if (isDevelopment) {
		logger.info('⚠️ App Check not available in development mode');
		return null;
	}

	if (!initialized) {
		logger.error('🚨 Firebase App Check not initialized! Call initializeFirebaseServices() first');
		return null;
	}

	try {
		const instance = appCheck();
		logger.info('✅ Retrieved App Check instance successfully');
		return instance;
	} catch (error) {
		logger.error('❌ Error getting App Check instance:', error);
		return null;
	}
}

// Function to check if we're ready for production
export function isProductionReady(): boolean {
	logger.info(`🔧 isProductionReady called, __DEV__=${__DEV__}, initialized=${initialized}`);

	if (isDevelopment) {
		return true; // Development doesn't need App Check
	}

	return initialized;
}
