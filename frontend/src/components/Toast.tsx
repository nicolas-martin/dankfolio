import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { openSolscanUrl } from '../utils/solana';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  txHash?: string;
  onClose?: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type = 'info', txHash, onClose }) => {
  const opacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(5000),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => onClose?.());
  }, []);

  const backgroundColor = {
    success: '#4CAF50',
    error: '#F44336',
    info: '#2196F3',
  }[type];

  const handleViewTx = () => {
    if (txHash) {
      openSolscanUrl(txHash);
    }
  };

  return (
    <Animated.View style={[styles.container, { opacity, backgroundColor }]}>
      <View style={styles.content}>
        <Text style={styles.message}>{message}</Text>
        {txHash && (
          <TouchableOpacity onPress={handleViewTx} style={styles.button}>
            <Text style={styles.buttonText}>View on Solscan</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  message: {
    color: '#FFFFFF',
    fontSize: 16,
    flex: 1,
    marginRight: 8,
  },
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
});

export default Toast; 