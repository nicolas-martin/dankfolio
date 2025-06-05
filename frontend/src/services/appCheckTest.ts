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
      logger.info('🧪 Testing complete authentication flow...');
      
      // Step 1: Get App Check token
      const appCheckSuccess = await this.testAppCheckToken();
      if (!appCheckSuccess) {
        logger.error('❌ App Check token test failed');
        return false;
      }

      // Step 2: Test backend authentication (if available)
      // This would call your authService.refreshToken() method
      logger.info('✅ App Check token test passed');
      
      // You can extend this to test the full flow:
      // const authService = new AuthService();
      // await authService.refreshToken();
      
      return true;
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