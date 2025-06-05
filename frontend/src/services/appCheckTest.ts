import appCheck from '@react-native-firebase/app-check';
import { logger } from '@/utils/logger';

/**
 * Test utility to verify Firebase App Check is working correctly
 */
export class AppCheckTester {
  /**
   * Test if App Check can generate a valid token
   */
  static async testAppCheckToken(): Promise<boolean> {
    try {
      logger.info('🧪 Testing Firebase App Check token generation...');
      
      // Try to get an App Check token - using modern API
      // Pass false to prevent forcing a token refresh
      const tokenResult = await appCheck().getToken(false);
      
      if (tokenResult && tokenResult.token && tokenResult.token.length > 0) {
        logger.info('✅ App Check token generated successfully', {
          tokenLength: tokenResult.token.length,
          tokenPrefix: tokenResult.token.substring(0, 10) + '...'
        });
        return true;
      } else {
        logger.error('❌ App Check token is empty or invalid');
        return false;
      }
    } catch (error) {
      logger.error('❌ App Check token generation failed', { error });
      return false;
    }
  }

  /**
   * Test the complete authentication flow
   */
  static async testAuthenticationFlow(): Promise<boolean> {
    try {
      logger.info('🧪 Testing Firebase App Check authentication flow...');
      
      // Get App Check token
      const appCheckSuccess = await this.testAppCheckToken();
      if (!appCheckSuccess) {
        logger.error('❌ App Check token test failed');
        return false;
      }
      
      logger.info('✅ App Check token test passed');
      
      // Make an authenticated API call to test the token is working with the backend
      try {
        // This will use the App Check token via the interceptor
        const response = await fetch('/api/test-auth', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (!response.ok) {
          throw new Error(`API response not OK: ${response.status}`);
        }
        
        logger.info('✅ Successfully made authenticated API call with App Check token');
        return true;
      } catch (apiError) {
        logger.error('❌ API call with App Check token failed', { error: apiError });
        return false;
      }
    } catch (error) {
      logger.error('❌ Authentication flow test failed', { error });
      return false;
    }
  }

  /**
   * Get App Check token info for debugging
   */
  static async getTokenInfo(): Promise<any> {
    try {
      // Using modern API - don't force refresh
      const tokenResult = await appCheck().getToken(false);
      
      return {
        hasToken: !!tokenResult?.token,
        tokenLength: tokenResult?.token?.length || 0,
        tokenPrefix: tokenResult?.token?.substring(0, 20) + '...' || 'N/A',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return { error: error.message };
    }
  }
}