import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Card, Text, Chip } from 'react-native-paper';
import { authService } from '@/services/authService';
import { logger as log } from '@/utils/logger';
import { grpcApi } from '@/services/grpcApi';

export const AuthTest: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const checkAuthStatus = async () => {
    try {
      const authenticated = await authService.isAuthenticated();
      const currentToken = await authService.getAuthToken();
      setIsAuthenticated(authenticated);
      setToken(currentToken);
      log.info('🔐 Auth status checked', { authenticated, hasToken: !!currentToken });
    } catch (error) {
      log.error('❌ Failed to check auth status:', error);
      setIsAuthenticated(false);
      setToken(null);
    }
  };

  const refreshToken = async () => {
    setLoading(true);
    try {
      await authService.refreshToken();
      await checkAuthStatus();
      log.info('🔐 Token refreshed successfully');
    } catch (error) {
      log.error('❌ Failed to refresh token:', error);
    } finally {
      setLoading(false);
    }
  };

  const testApiCall = async () => {
    setLoading(true);
    setTestResult(null);
    try {
      // Make a simple API call to test authentication
      const coins = await grpcApi.getAvailableCoins(true);
      setTestResult(`✅ API call successful! Retrieved ${coins.length} coins.`);
      log.info('🔐 Test API call successful', { coinCount: coins.length });
    } catch (error) {
      setTestResult(`❌ API call failed: ${error.message}`);
      log.error('❌ Test API call failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearAuth = async () => {
    setLoading(true);
    try {
      await authService.clearAuth();
      await checkAuthStatus();
      setTestResult(null);
      log.info('🔐 Authentication cleared');
    } catch (error) {
      log.error('❌ Failed to clear auth:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    checkAuthStatus();
  }, []);

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="titleMedium" style={styles.title}>
          🔐 Authentication Test
        </Text>
        
        <View style={styles.statusContainer}>
          <Text variant="bodyMedium">Status:</Text>
          <Chip 
            icon={isAuthenticated ? "check" : "close"} 
            style={[styles.chip, { backgroundColor: isAuthenticated ? '#4CAF50' : '#f44336' }]}
          >
            {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
          </Chip>
        </View>

        {token && (
          <View style={styles.tokenContainer}>
            <Text variant="bodySmall" style={styles.tokenLabel}>Token (first 50 chars):</Text>
            <Text variant="bodySmall" style={styles.tokenText}>
              {token.substring(0, 50)}...
            </Text>
          </View>
        )}

        {testResult && (
          <View style={styles.resultContainer}>
            <Text variant="bodyMedium" style={styles.resultText}>
              {testResult}
            </Text>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <Button 
            mode="outlined" 
            onPress={checkAuthStatus}
            style={styles.button}
            disabled={loading}
          >
            Check Status
          </Button>
          
          <Button 
            mode="contained" 
            onPress={refreshToken}
            style={styles.button}
            loading={loading}
            disabled={loading}
          >
            Refresh Token
          </Button>
        </View>

        <View style={styles.buttonContainer}>
          <Button 
            mode="contained" 
            onPress={testApiCall}
            style={styles.button}
            loading={loading}
            disabled={loading || !isAuthenticated}
          >
            Test API Call
          </Button>
          
          <Button 
            mode="outlined" 
            onPress={clearAuth}
            style={styles.button}
            disabled={loading}
          >
            Clear Auth
          </Button>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    margin: 16,
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  chip: {
    marginLeft: 8,
  },
  tokenContainer: {
    marginBottom: 12,
  },
  tokenLabel: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  tokenText: {
    fontFamily: 'monospace',
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 4,
  },
  resultContainer: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  resultText: {
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  button: {
    flex: 1,
    marginHorizontal: 4,
  },
}); 