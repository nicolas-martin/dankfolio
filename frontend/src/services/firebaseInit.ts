import { getApp, initializeApp as initializeRNFBApp } from '@react-native-firebase/app';
import { initializeAppCheck, ReactNativeFirebaseAppCheckProvider } from '@react-native-firebase/app-check';
import { logger } from '@/utils/logger';
import { Platform } from 'react-native';
import {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID,
  FIREBASE_APP_CHECK_DEBUG_TOKEN_ANDROID,
  FIREBASE_APP_CHECK_DEBUG_TOKEN_IOS,
} from '@env';

// Environment-aware Firebase configuration
const getFirebaseConfig = () => {
  // Validate that all required Firebase environment variables are present
  if (!FIREBASE_API_KEY || !FIREBASE_AUTH_DOMAIN || !FIREBASE_PROJECT_ID || 
      !FIREBASE_STORAGE_BUCKET || !FIREBASE_MESSAGING_SENDER_ID || !FIREBASE_APP_ID) {
    throw new Error('Missing required Firebase environment variables. Please check your .env file.');
  }

  return {
    apiKey: FIREBASE_API_KEY,
    authDomain: FIREBASE_AUTH_DOMAIN,
    projectId: FIREBASE_PROJECT_ID,
    storageBucket: FIREBASE_STORAGE_BUCKET,
    messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
    appId: FIREBASE_APP_ID,
  };
};

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

let firebaseApp: any = null;
let appCheckInstance: any = null;

export async function initializeFirebaseServices(): Promise<void> {
  try {
    // For React Native Firebase, the app is automatically initialized via native configuration
    // We just need to get the default app instance
    if (!firebaseApp) {
      firebaseApp = getApp(); // Get the default app that was configured natively
      logger.info('🔥 Firebase app initialized successfully.');
    }

    // Initialize App Check with React Native Firebase provider
    if (firebaseApp && !appCheckInstance) {
      // Create and configure the React Native Firebase App Check provider
      const rnfbProvider = new ReactNativeFirebaseAppCheckProvider();
      
      rnfbProvider.configure(getAppCheckConfig());

      appCheckInstance = initializeAppCheck(firebaseApp, {
        provider: rnfbProvider,
        isTokenAutoRefreshEnabled: true,
      });
      
      logger.info('🔒 Firebase App Check initialized with React Native Firebase provider');
    }
  } catch (error) {
    logger.error('❌ Failed to initialize Firebase services:', error);
    // Depending on how critical Firebase is at startup, you might re-throw or handle differently
    throw error;
  }
}

// Optional: Function to get the App Check instance if needed elsewhere
export function getAppCheckInstance(): any {
  return appCheckInstance;
}

// Optional: Function to get the Firebase App instance
export function getFirebaseApp(): any {
  return firebaseApp;
}
