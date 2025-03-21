import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SwapButtonProps } from './types';
import { styles } from './styles';

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

export default SwapButton; 