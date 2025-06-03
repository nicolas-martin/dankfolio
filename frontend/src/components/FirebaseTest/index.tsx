import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { initializeFirebaseServices } from '@/services/firebaseInit';
import { logger } from '@/utils/logger';

export const FirebaseTest: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testFirebase = async () => {
      try {
        logger.info('🧪 Testing Firebase initialization...');
        await initializeFirebaseServices();
        setStatus('success');
        logger.info('✅ Firebase test passed!');
      } catch (err: any) {
        logger.error('❌ Firebase test failed:', err);
        setError(err.message || 'Unknown error');
        setStatus('error');
      }
    };

    testFirebase();
  }, []);

  return (
    <View style={{ padding: 20, backgroundColor: '#f0f0f0', margin: 10, borderRadius: 8 }}>
      <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>
        🔥 Firebase Test
      </Text>
      
      {status === 'loading' && (
        <Text style={{ color: '#666' }}>Testing Firebase initialization...</Text>
      )}
      
      {status === 'success' && (
        <Text style={{ color: 'green' }}>✅ Firebase initialized successfully!</Text>
      )}
      
      {status === 'error' && (
        <View>
          <Text style={{ color: 'red', marginBottom: 5 }}>❌ Firebase test failed:</Text>
          <Text style={{ color: 'red', fontSize: 12 }}>{error}</Text>
        </View>
      )}
    </View>
  );
}; 