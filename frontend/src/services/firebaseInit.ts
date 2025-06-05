import { getApp } from '@react-native-firebase/app';
import appCheck from '@react-native-firebase/app-check';
import { initializeAppCheck, ReactNativeFirebaseAppCheckProvider } from '@react-native-firebase/app-check';
import { logger } from '@/utils/logger';
import {
	APP_ENV, // <<< Import APP_ENV
	FIREBASE_APP_CHECK_DEBUG_TOKEN_ANDROID,
	FIREBASE_APP_CHECK_DEBUG_TOKEN_IOS,
} from '@env';

const isDevelopmentOrSimulator = __DEV__ || APP_ENV === 'local' || APP_ENV === 'production-simulator'; // <<< Modified condition

// Environment-aware App Check configuration
const getAppCheckConfig = () => {
	logger.info('🔧 Getting App Check config...');
	logger.info(`🔧 Is dev mode or simulator: ${isDevelopmentOrSimulator ? 'true' : 'false'}`); // <<< Modified log
	logger.info(`🔧 APP_ENV: ${APP_ENV}`); // <<< Added log for APP_ENV
	if (isDevelopmentOrSimulator) { // <<< Modified condition
		if (FIREBASE_APP_CHECK_DEBUG_TOKEN_ANDROID === "") {
			logger.exception("missing dev firebase token for android")
		}
		if (FIREBASE_APP_CHECK_DEBUG_TOKEN_IOS === "") {
			logger.exception("missing dev firebase token for ios")
		}
	}

	const config: any = {
		android: {
			provider: isDevelopmentOrSimulator ? 'debug' : 'playIntegrity', // <<< Modified condition
			debugToken: isDevelopmentOrSimulator && FIREBASE_APP_CHECK_DEBUG_TOKEN_ANDROID ? FIREBASE_APP_CHECK_DEBUG_TOKEN_ANDROID : undefined, // <<< Modified condition
		},
		apple: {
			provider: isDevelopmentOrSimulator ? 'debug' : 'appAttestWithDeviceCheckFallback', // <<< Modified condition
			debugToken: isDevelopmentOrSimulator && FIREBASE_APP_CHECK_DEBUG_TOKEN_IOS ? FIREBASE_APP_CHECK_DEBUG_TOKEN_IOS : undefined, // <<< Modified condition
		},
	};

	logger.info(`🔧 Using provider for iOS: ${config.apple.provider}`);
	logger.info(`🔧 Using provider for Android: ${config.android.provider}`);

	return config;
};

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

	} catch (error) {
		logger.error('❌ Failed to initialize Firebase App Check in production:', error);
		logger.error('🚨 This will cause authentication failures in production!');
		logger.error(`🚨 Error details: ${error.message || 'No message'}`);
		logger.error(`🚨 Error stack: ${error.stack || 'No stack'}`);

		// In production, we should fail hard if App Check can't be initialized
		throw new Error(`Production Firebase App Check initialization failed: ${error.message}`);
	}
}
