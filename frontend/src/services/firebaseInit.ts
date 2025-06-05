import { getApp } from '@react-native-firebase/app';
import appCheck, { initializeAppCheck, ReactNativeFirebaseAppCheckProvider } from '@react-native-firebase/app-check';
import { logger } from '@/utils/logger';
import { APP_ENV } from '@env';
import {
	FIREBASE_APP_CHECK_DEBUG_TOKEN_ANDROID,
	FIREBASE_APP_CHECK_DEBUG_TOKEN_IOS,
} from '@env';

// Environment-aware App Check configuration
const getAppCheckConfig = () => {
	const config: any = {
		android: {
			provider: __DEV__ ? 'debug' : 'playIntegrity',
			debugToken: __DEV__ && FIREBASE_APP_CHECK_DEBUG_TOKEN_ANDROID ? FIREBASE_APP_CHECK_DEBUG_TOKEN_ANDROID : undefined,
		},
		apple: {
			provider: __DEV__ ? 'debug' : 'appAttestWithDeviceCheckFallback',
			debugToken: __DEV__ && FIREBASE_APP_CHECK_DEBUG_TOKEN_IOS ? FIREBASE_APP_CHECK_DEBUG_TOKEN_IOS : undefined,
		},
	};

	// Log the actual config that will be used
	logger.info('🔧 AppCheck config - android provider:', config.android.provider);
	logger.info('🔧 AppCheck config - android debugToken present:', !!config.android.debugToken);
	logger.info('🔧 AppCheck config - apple provider:', config.apple.provider);
	logger.info('🔧 AppCheck config - apple debugToken present:', !!config.apple.debugToken);

	return config;
};

let initialized = false;

export async function initializeFirebaseServices(): Promise<void> {
	// Dump all environment variables related to Firebase App Check
	logger.info('🔍 === FIREBASE APP CHECK DEBUG ===');
	try {
		const {
			FIREBASE_APP_CHECK_DEBUG_TOKEN_ANDROID,
			FIREBASE_APP_CHECK_DEBUG_TOKEN_IOS,
			APP_ENV,
			// Add any other environment variables you want to log
		} = require('@env');
		
		logger.info('🔍 APP_ENV:', APP_ENV);
		logger.info('🔍 FIREBASE_APP_CHECK_DEBUG_TOKEN_ANDROID:', FIREBASE_APP_CHECK_DEBUG_TOKEN_ANDROID);
		logger.info('🔍 FIREBASE_APP_CHECK_DEBUG_TOKEN_IOS:', FIREBASE_APP_CHECK_DEBUG_TOKEN_IOS);
		logger.info('🔍 __DEV__:', __DEV__);
	} catch (error) {
		logger.error('🔍 Error importing env variables:', error);
	}
	logger.info('🔍 === END FIREBASE APP CHECK DEBUG ===');

	// Skip Firebase App Check initialization in development mode
	if (APP_ENV === 'development') {
		logger.info('🔥 Skipping Firebase App Check initialization in development mode (backend bypasses App Check)');
		logger.info('📝 Production will require proper Firebase App Check setup');
		initialized = true;
		return;
	}

	try {
		logger.info('🔥 Initializing Firebase App Check for production...');

		// Get the default Firebase app that's automatically initialized from GoogleService-Info.plist
		const firebaseApp = getApp();
		logger.info('✅ Firebase app loaded from native configuration (GoogleService-Info.plist)');

		// Create and configure the React Native Firebase App Check provider
		const rnfbProvider = new ReactNativeFirebaseAppCheckProvider();
		const cfg = getAppCheckConfig();
		logger.info('🔧 Configuring App Check with:', cfg);
		rnfbProvider.configure(cfg);

		// Initialize App Check using the modern API with siteKey explicitly set to undefined for native providers
		initializeAppCheck(firebaseApp, {
			provider: rnfbProvider,
			isTokenAutoRefreshEnabled: false, // Change to false to prevent automatic token refresh
		});

		// Don't verify by getting a token at initialization - let it happen on demand
		logger.info('✅ Firebase App Check initialized successfully for production');
		initialized = true;
	} catch (error) {
		logger.error('❌ Failed to initialize Firebase App Check in production:', error);
		logger.error('🚨 This will cause authentication failures in production!');

		// In production, we should fail hard if App Check can't be initialized
		throw new Error(`Production Firebase App Check initialization failed: ${error.message}`);
	}
}

// Note: This function is now mainly used for compatibility with existing code
// In new code, prefer using appCheck() directly
export function getAppCheckInstance() {
	if (APP_ENV === 'development') {
		logger.info('⚠️ App Check not available in development mode');
		return null;
	}

	if (!initialized) {
		logger.error('🚨 Firebase App Check not initialized! Call initializeFirebaseServices() first');
		return null;
	}

	return appCheck();
}

// Function to check if we're ready for production
export function isProductionReady(): boolean {
	if (APP_ENV === 'development') {
		return true; // Development doesn't need App Check
	}

	return initialized;
}
