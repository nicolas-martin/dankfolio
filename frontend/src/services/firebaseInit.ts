import { getApp } from '@react-native-firebase/app';
import { initializeAppCheck, ReactNativeFirebaseAppCheckProvider } from '@react-native-firebase/app-check';
import { logger } from '@/utils/logger';
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

  return config;
};

let appCheckInstance: any = null;

export async function initializeFirebaseServices(): Promise<void> {
  try {
    // Get the default Firebase app that's automatically initialized from GoogleService-Info.plist
    const firebaseApp = getApp();
    logger.info('🔥 Firebase app loaded from native configuration (GoogleService-Info.plist)');

    // Initialize App Check
    if (!appCheckInstance) {
      // Create and configure the React Native Firebase App Check provider
      const rnfbProvider = new ReactNativeFirebaseAppCheckProvider();
      
      rnfbProvider.configure(getAppCheckConfig());

      appCheckInstance = initializeAppCheck(firebaseApp, {
        provider: rnfbProvider,
        isTokenAutoRefreshEnabled: true,
      });
      
      logger.info('🔒 Firebase App Check initialized successfully (App Check only)');
    }
  } catch (error) {
    logger.error('❌ Failed to initialize Firebase App Check:', error);
    
    // If we're in development and Firebase isn't configured, that's okay
    if (__DEV__) {
      logger.warn('⚠️  Firebase App Check initialization failed in development mode. This is expected if GoogleService-Info.plist is not properly configured.');
      return; // Don't throw in development
    }
    
    throw error;
  }
}

// Function to get the App Check instance
export function getAppCheckInstance(): any {
  return appCheckInstance;
}
