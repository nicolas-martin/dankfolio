import { getApp } from '@react-native-firebase/app';
import { initializeAppCheck, ReactNativeFirebaseAppCheckProvider } from '@react-native-firebase/app-check';
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

  return config;
};

let appCheckInstance: any = null;
let initializationAttempted = false;

export async function initializeFirebaseServices(): Promise<void> {
  // Skip Firebase App Check initialization in development mode
  if (APP_ENV === 'development') {
    logger.info('🔥 Skipping Firebase App Check initialization in development mode (backend bypasses App Check)');
    logger.info('📝 Production will require proper Firebase App Check setup');
    return;
  }

  // Mark that we've attempted initialization
  initializationAttempted = true;

  try {
    logger.info('🔥 Initializing Firebase App Check for production...');
    
    // Get the default Firebase app that's automatically initialized from GoogleService-Info.plist
    const firebaseApp = getApp();
    logger.info('✅ Firebase app loaded from native configuration (GoogleService-Info.plist)');

    // Initialize App Check
    if (!appCheckInstance) {
      // Create and configure the React Native Firebase App Check provider
      const rnfbProvider = new ReactNativeFirebaseAppCheckProvider();
      
      rnfbProvider.configure(getAppCheckConfig());

      appCheckInstance = initializeAppCheck(firebaseApp, {
        provider: rnfbProvider,
        isTokenAutoRefreshEnabled: true,
      });
      
      logger.info('✅ Firebase App Check initialized successfully for production');
    }
  } catch (error) {
    logger.error('❌ Failed to initialize Firebase App Check in production:', error);
    logger.error('🚨 This will cause authentication failures in production!');
    
    // In production, we should fail hard if App Check can't be initialized
    throw new Error(`Production Firebase App Check initialization failed: ${error.message}`);
  }
}

// Function to get the App Check instance
export function getAppCheckInstance(): any {
  if (APP_ENV === 'development') {
    logger.info('⚠️  App Check not available in development mode');
    return null;
  }
  
  if (!initializationAttempted) {
    logger.error('🚨 Firebase App Check not initialized! Call initializeFirebaseServices() first');
    return null;
  }
  
  if (!appCheckInstance) {
    logger.error('🚨 Firebase App Check instance not available - initialization may have failed');
  }
  
  return appCheckInstance;
}

// Function to check if we're ready for production
export function isProductionReady(): boolean {
  if (APP_ENV === 'development') {
    return true; // Development doesn't need App Check
  }
  
  return initializationAttempted && appCheckInstance !== null;
}
