// Mock for @/utils/env

export const env = {
  apiUrl: 'http://localhost:9000',
  solanaRpcEndpoint: 'https://api.devnet.solana.com',
  debugMode: true,
  appEnv: 'test',
  sentryAuthToken: 'mock-sentry-token',
  firebaseAppCheckDebugTokenAndroid: 'mock-android-token',
  firebaseAppCheckDebugTokenIos: 'mock-ios-token',
  testPrivateKey: 'dGVzdF9wcml2YXRlX2tleV9mb3JfdGVzdGluZ19vbmx5X2RvX25vdF91c2VfaW5fcHJvZHVjdGlvbl90ZXN0X2tleQ==',
  loadDebugWallet: true,
  e2eMockingEnabled: true
};

export const getEnvVariables = () => env; 