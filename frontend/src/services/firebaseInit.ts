import { initializeApp, FirebaseApp } from 'firebase/app';
import { initializeAppCheck, AppCheck, CustomProvider } from 'firebase/app-check';
import { logger } from '@/utils/logger';
import * as Integrity from 'expo-app-integrity';
import { Platform } from 'react-native';

// Firebase configuration using values from GoogleService-Info.plist
const firebaseConfig = {
  apiKey: "AIzaSyDwxE91vu2tunrWO3dbLKeWQisyx5R90Js",
  authDomain: "dankfolio.firebaseapp.com",
  projectId: "dankfolio",
  storageBucket: "dankfolio.firebasestorage.app",
  messagingSenderId: "751348159218",
  appId: "1:751348159218:ios:e666f33d69531ad426366b",
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
      firebaseApp = initializeApp(firebaseConfig);
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
