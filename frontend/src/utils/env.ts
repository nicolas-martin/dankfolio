import Constants from 'expo-constants';
import { logger } from './logger';

/**
 * Environment variables interface
 */
interface EnvVariables {
  apiUrl: string;
  solanaRpcEndpoint: string;
  debugMode: boolean;
  appEnv: string;
  sentryAuthToken: string;
  firebaseAppCheckDebugTokenAndroid: string;// For development only
  firebaseAppCheckDebugTokenIos: string;// For development only
  testPrivateKey?: string; // For development only
}

/**
 * Get environment variables from Expo Constants
 */
export const getEnvVariables = (): EnvVariables => {
  // Access the environment variables from Constants
  const extra = Constants.expoConfig?.extra || {};
  
  const env: EnvVariables = {
    apiUrl: extra.apiUrl as string,
    solanaRpcEndpoint: extra.solanaRpcEndpoint as string,
    debugMode: extra.debugMode === 'true',
    appEnv: extra.appEnv as string,
    firebaseAppCheckDebugTokenAndroid: extra.firebaseAppCheckDebugTokenAndroid as string,
    firebaseAppCheckDebugTokenIos: extra.firebaseAppCheckDebugTokenIos as string,
    testPrivateKey: extra.testPrivateKey as string,
    sentryAuthToken: extra.sentryAuthToken as string,
  };

  // Log environment in dev mode
  // TODO: Remove this  once production is ready
//   if (__DEV__) {
    logger.info('Environment variables loaded:', {
      appEnv: env.appEnv,
      debugMode: env.debugMode,
      apiUrl: env.apiUrl,
      solanaRpcEndpoint: env.solanaRpcEndpoint,
      sentryAuthToken: env.sentryAuthToken,
      firebaseTokensConfigured: !!(env.firebaseAppCheckDebugTokenAndroid && env.firebaseAppCheckDebugTokenIos),
    });
//   }

  return env;
};

// Export a singleton instance
export const env = getEnvVariables(); 