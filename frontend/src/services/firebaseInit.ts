import { getApp } from '@react-native-firebase/app';
import appCheck from '@react-native-firebase/app-check';
import { initializeAppCheck, ReactNativeFirebaseAppCheckProvider } from '@react-native-firebase/app-check';
import { logger } from '@/utils/logger';
import { env } from '@utils/env';

const isDevelopmentOrSimulator = __DEV__ || env.appEnv === 'local' || env.appEnv === 'production-simulator';

// Environment-aware App Check configuration
const getAppCheckConfig = () => {
	logger.info('🔧 Getting App Check config...');
	logger.info(`🔧 Is dev mode or simulator: ${isDevelopmentOrSimulator ? 'true' : 'false'}`);
	logger.info(`🔧 APP_ENV: ${env.appEnv}`);
	if (isDevelopmentOrSimulator) {
		if (!env.firebaseAppCheckDebugTokenAndroid) {
			logger.exception("missing dev firebase token for android");
		}
		if (!env.firebaseAppCheckDebugTokenIos) {
			logger.exception("missing dev firebase token for ios");
		}
	}

	const config: any = {
		android: {
			provider: isDevelopmentOrSimulator ? 'debug' : 'playIntegrity',
			debugToken: isDevelopmentOrSimulator ? env.firebaseAppCheckDebugTokenAndroid : undefined,
		},
		apple: {
			provider: isDevelopmentOrSimulator ? 'debug' : 'appAttestWithDeviceCheckFallback',
			debugToken: isDevelopmentOrSimulator ? env.firebaseAppCheckDebugTokenIos : undefined,
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
