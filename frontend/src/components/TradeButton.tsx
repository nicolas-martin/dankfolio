import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';

interface TradeButtonProps {
  onPress: () => void;
  isSubmitting: boolean;
  disabled: boolean;
  label: string;
}

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

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#6A5ACD',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default TradeButton; 