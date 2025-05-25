import { initializeApp, FirebaseApp } from 'firebase/app';
import { initializeAppCheck, AppCheck, CustomProvider } from 'firebase/app-check';
import { logger } from '@/utils/logger';
import * as Integrity from 'expo-app-integrity';
import { Platform } from 'react-native';
import {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID
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

let firebaseApp: FirebaseApp | null = null;
let appCheckInstance: AppCheck | null = null;

// Custom App Check provider that uses expo-app-integrity for App Attest
class ExpoAppAttestProvider extends CustomProvider {
  constructor(app: FirebaseApp) {
    super({
      getToken: async () => {
        try {
          // Check if App Attest is supported on this device
          if (Platform.OS === 'ios' && Integrity.isSupported()) {
            // Generate a challenge (in production, this should come from your server)
            const challenge = Math.random().toString(36).substring(2, 15);
            
            // Get attestation token from App Attest
            const attestationToken = await Integrity.attestKey(challenge);
            
            logger.info('🔒 App Attest token generated successfully');
            
            // Return the token with a reasonable expiration time (1 hour)
            return {
              token: attestationToken,
              expireTimeMillis: Date.now() + (60 * 60 * 1000) // 1 hour
            };
          } else {
            throw new Error('App Attest not supported on this device');
          }
        } catch (error) {
          logger.error('❌ Failed to generate App Attest token:', error);
          throw error;
        }
      }
    });
  }
}

export async function initializeFirebaseServices(): Promise<void> {
  try {
    if (!firebaseApp) {
      firebaseApp = initializeApp(getFirebaseConfig());
      logger.info('🔥 Firebase app initialized successfully.');
    }

    // Initialize App Check with App Attest provider
    if (firebaseApp && !appCheckInstance) {
      if (Platform.OS === 'ios' && Integrity.isSupported()) {
        // Use App Attest provider for iOS devices that support it
        const appAttestProvider = new ExpoAppAttestProvider(firebaseApp);
        
        appCheckInstance = initializeAppCheck(firebaseApp, {
          provider: appAttestProvider,
          isTokenAutoRefreshEnabled: true,
        });
        
        logger.info('🔒 Firebase App Check initialized with App Attest provider');
      } else {
        // For development or unsupported devices, we'll skip App Check initialization
        // In production, you might want to use a debug provider or handle this differently
        logger.warn('⚠️ App Check not initialized - App Attest not supported on this device/platform');
      }
    }
  } catch (error) {
    logger.error('❌ Failed to initialize Firebase services:', error);
    // Depending on how critical Firebase is at startup, you might re-throw or handle differently
    throw error;
  }
}

// Optional: Function to get the App Check instance if needed elsewhere
export function getAppCheckInstance(): AppCheck | null {
  return appCheckInstance;
}

// Optional: Function to get the Firebase App instance
export function getFirebaseApp(): FirebaseApp | null {
  return firebaseApp;
}
