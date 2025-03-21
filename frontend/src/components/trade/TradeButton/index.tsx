import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { TradeButtonProps } from './types';
import { styles } from './styles';

const TradeButton: React.FC<TradeButtonProps> = ({
  onPress,
  isSubmitting,
  disabled,
  label,
}) => {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled || isSubmitting}
    >
      {isSubmitting ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <Text style={styles.text}>{label}</Text>
      )}
    </TouchableOpacity>
  );
};

export default TradeButton; 