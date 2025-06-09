// Load environment variables from .env file when running locally
import 'dotenv/config';

// Get the environment mode
const appEnv = process.env.APP_ENV || 'development';
const isLocal = process.argv.includes('--local');

// Log which environment we're using
console.log(`📱 Building app with environment: ${appEnv}${isLocal ? ' (local)' : ''}`);
if (isLocal) {
  console.log('📱 Loading environment variables from .env file');
}

module.exports = ({ config }) => ({
  ...config,
  name: "dankfolio",
  slug: "dankfolio-mobile",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "dark",
  splash: {
    image: "./assets/splashscreen.png",
    resizeMode: "contain",
    backgroundColor: "#1A1A2E"
  },
  plugins: [
    [
      "expo-dev-client",
      {
        "launchMode": "most-recent"
      }
    ],
    "expo-secure-store",
    [
      "expo-build-properties",
      {
        "ios": {
          "useFrameworks": "static"
        }
      }
    ],
    [
      "@sentry/react-native/expo",
      {
        "organization": "corsair",
        "project": "dankfolio",
        "url": "https://sentry.io/"
      }
    ],
    "@react-native-firebase/app",
    "@react-native-firebase/app-check"
  ],
  newArchEnabled: false,
  assetBundlePatterns: [
    "**/*"
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.nicolasmartin.dankfolio",
    googleServicesFile: "./GoogleService-Info.plist",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false
    }
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff"
    },
    package: "com.nicolasmartin.dankfolio",
    googleServicesFile: "./google-services.json"
  },
  web: {
    favicon: "./assets/favicon.png"
  },
  extra: {
    // Environment variables will be available here
    APP_ENV: process.env.APP_ENV,
    DEBUG_MODE: process.env.DEBUG_MODE,
    REACT_APP_API_URL: process.env.REACT_APP_API_URL,
    REACT_APP_SOLANA_RPC_ENDPOINT: process.env.REACT_APP_SOLANA_RPC_ENDPOINT,
    SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
    FIREBASE_APP_CHECK_DEBUG_TOKEN_ANDROID: process.env.FIREBASE_APP_CHECK_DEBUG_TOKEN_ANDROID,
    FIREBASE_APP_CHECK_DEBUG_TOKEN_IOS: process.env.FIREBASE_APP_CHECK_DEBUG_TOKEN_IOS,
    TEST_PRIVATE_KEY: process.env.TEST_PRIVATE_KEY,
    LOAD_DEBUG_WALLET: process.env.LOAD_DEBUG_WALLET,
    eas: {
      projectId: "efd2922e-0415-49a7-bae1-fd28bc35805d"
    }
  },
  runtimeVersion: {
    policy: "appVersion"
  }
}); 