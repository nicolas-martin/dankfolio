// Jest setup file for polyfills and globals
import { Buffer } from 'buffer';

// Add Buffer polyfill for Node.js compatibility
global.Buffer = Buffer;

// Add base64url support if needed
if (!Buffer.prototype.toString.toString().includes('base64url')) {
  const originalToString = Buffer.prototype.toString;
  Buffer.prototype.toString = function(encoding, start, end) {
    if (encoding === 'base64url') {
      return originalToString.call(this, 'base64', start, end)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    }
    return originalToString.call(this, encoding, start, end);
  };
}

// Mock React Native Firebase modules
jest.mock('@react-native-firebase/app', () => ({
  __esModule: true,
  default: {
    name: 'mockedFirebaseApp',
    options: {},
    // Add other app instance methods if needed by your tests
    // initializeApp: jest.fn(),
  },
  SDK_VERSION: 'mocked-sdk-version',
}));

jest.mock('@react-native-firebase/app-check', () => ({
  __esModule: true,
  default: {
    getToken: jest.fn(() => Promise.resolve({ token: 'mock-app-check-token' })),
    // Add other app-check specific functions if your tests use them
  },
}));

// You might need to mock other Firebase modules if they are imported
// directly in your code and cause issues in the Jest environment.
// For example:
// jest.mock('@react-native-firebase/auth', () => ({ ... }));
// jest.mock('@react-native-firebase/firestore', () => ({ ... }));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      hostUri: 'localhost:8081',
      developer: {
        tool: 'expo-cli',
      },
      packagerOpts: {
        dev: true,
      },
    },
    installationId: 'mock-installation-id',
    sessionId: 'mock-session-id',
    manifest: {
      slug: 'mock-app',
      version: '1.0.0',
      // ... other manifest properties if needed
    },
    manifest2: {}, // For expo-updates
    executionEnvironment: 'storeClient', // Or 'bare', 'standalone'
    statusBarHeight: 20,
    systemFonts: [],
    getWebViewUserAgentAsync: jest.fn(() => Promise.resolve('mock-user-agent')),
    // Add any other constants your app uses
    isDevice: true,
    platform: {
      ios: {
        model: 'iPhone',
        platform: 'ios',
        buildNumber: '1',
        systemVersion: '15.0',
        osVersion: '15.0', // for expo-device
      },
      android: {
        versionCode: 1,
        platform: 'android',
      }
    },
    nativeAppVersion: '1.0.0',
    nativeBuildVersion: '1',
  },
  // If you use named exports from expo-constants:
  // ExecutionEnvironment: { STORE_CLIENT: 'storeClient', ... }
}));

jest.mock('@/utils/env', () => ({
  __esModule: true, // Important for ES modules
  env: {
    apiUrl: 'http://mock-api.test-from-setup-js', // Clearly indicate source for debugging
    solanaRpcEndpoint: 'http://mock-solana-rpc.test-from-setup-js',
    sentryAuthToken: 'mock-sentry-auth-token-from-setup-js',
    debugMode: true,
    appEnv: 'test',
    firebaseAppCheckDebugTokenAndroid: 'mock-android-debug-token',
    firebaseAppCheckDebugTokenIos: 'mock-ios-debug-token',
    testPrivateKey: 'mock-test-private-key',
    loadDebugWallet: false,
    e2eMockingEnabled: false,
  },
}));