import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SwapButtonProps {
  onPress: () => void;
  disabled?: boolean;
}

const SwapButton: React.FC<SwapButtonProps> = ({ onPress, disabled }) => {
  return (
    <TouchableOpacity
      style={[styles.swapButton, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Ionicons name="swap-vertical" size={24} color="#fff" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  swapButton: {
    backgroundColor: '#6A5ACD',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginVertical: -10,
    zIndex: 1,
  },
  disabled: {
    opacity: 0.5,
  },
});

export default SwapButton; 