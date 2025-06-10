import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native'; // Added StyleSheet
import { useTheme } from 'react-native-paper'; // Added useTheme
import { initializeFirebaseServices } from '@/services/firebaseInit';
import { logger } from '@/utils/logger';

// Define some color constants if not directly replaceable by theme
const SUCCESS_GREEN = 'green'; // Or a specific hex for green
const ERROR_RED = 'red';     // Or a specific hex for red

export const FirebaseTest: React.FC = () => {
  const theme = useTheme(); // Get theme
  const styles = createFirebaseTestStyles(theme); // Create styles
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testFirebase = async () => {
      try {
        logger.info('🧪 Testing Firebase initialization...');
        await initializeFirebaseServices();
        setStatus('success');
        logger.info('✅ Firebase test passed!');
      } catch (err: unknown) {
        logger.error('❌ Firebase test failed:', err);
        setError(err.message || 'Unknown error');
        setStatus('error');
      }
    };

    testFirebase();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.titleText}>
        🔥 Firebase Test
      </Text>
      
      {status === 'loading' && (
        <Text style={styles.loadingText}>Testing Firebase initialization...</Text>
      )}
      
      {status === 'success' && (
        <Text style={styles.successText}>✅ Firebase initialized successfully!</Text>
      )}
      
      {status === 'error' && (
        <View>
          <Text style={styles.errorText}>❌ Firebase test failed:</Text>
          <Text style={styles.errorDetailText}>{error}</Text>
        </View>
      )}
    </View>
  );
};

// StyleSheet definition
const createFirebaseTestStyles = (theme: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surfaceVariant, // Using theme color
    borderRadius: 8,
    margin: 10,
    padding: 20,
  },
  titleText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  loadingText: {
    color: theme.colors.onSurfaceVariant, // Using theme color
  },
  successText: {
    color: SUCCESS_GREEN, // Using defined constant
  },
  errorText: {
    color: ERROR_RED, // Using defined constant
    marginBottom: 5,
  },
  errorDetailText: {
    color: ERROR_RED, // Using defined constant
    fontSize: 12,
  },
});