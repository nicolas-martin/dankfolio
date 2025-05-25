import { initializeApp, FirebaseApp } from 'firebase/app';
import { initializeAppCheck, AppCheck } from 'firebase/app-check';
import { logger } from '@/utils/logger'; // Assuming logger path

// Firebase configuration loaded from environment variables
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID // Optional
};

// Validate required environment variables
const requiredEnvVars = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID',
];

requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    logger.error(`❌ Missing required environment variable: ${envVar}`);
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});
let firebaseApp: FirebaseApp | null = null;
let appCheckInstance: AppCheck | null = null;

export async function initializeFirebaseServices(): Promise<void> {
  try {
    if (!firebaseApp) {
      firebaseApp = initializeApp(firebaseConfig);
      logger.info('🔥 Firebase app initialized successfully.');
    }

    // Initialize App Check
    if (firebaseApp && !appCheckInstance) {
      // IMPORTANT: The provider configuration here is a generic placeholder.
      // For iOS App Attest with Expo, you need to install and use a specific
      // provider, e.g., from 'expo-firebase-app-check-provider' or 'expo-app-integrity',
      // or set up a custom provider that bridges to native App Attest.
      // Refer to Firebase and Expo documentation for the correct setup.
      // Example (conceptual - actual provider will differ):
      // import { ExpoFirebaseAppCheckProvider } from 'expo-firebase-app-check-provider'; // Fictional package
      // const appCheckProvider = new ExpoFirebaseAppCheckProvider(firebaseApp);

      // Using a placeholder provider for now. This will likely not work for App Attest
      // without the correct native integration and provider setup.
      // const provider = new ReCaptchaV3Provider("YOUR_RECAPTCHA_V3_SITE_KEY_PLACEHOLDER"); // This is for web, not native App Attest

      // For native platforms, especially with App Attest, direct initialization might look like this,
      // assuming native setup is complete and a custom provider isn't explicitly passed to initializeAppCheck
      // if the native Firebase SDK is configured for App Check.
      // If using a library like `expo-firebase-app-check-provider`, it would handle this.

      // Placeholder for where actual AppCheck initialization would occur with a proper provider
      // For now, this will initialize AppCheck but likely won't fully work with App Attest
      // without the correct provider from an Expo package or custom native code.
      appCheckInstance = initializeAppCheck(firebaseApp, {
        // provider: new YourActualAppAttestProvider(), // This needs to be replaced
        isTokenAutoRefreshEnabled: true,
      });
      logger.info('🔒 Firebase App Check initialized (provider setup required for App Attest).');
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
