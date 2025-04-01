import React from 'react';
import { View } from 'react-native';
import { ActivityIndicator, Button, Text, Icon, useTheme } from 'react-native-paper';
import { TradeButtonProps } from './tradebutton_types';
import { BUTTON_STATES, ButtonState } from './tradebutton_constants';
import { createStyles } from './tradebutton_styles';

const TradeButton: React.FC<TradeButtonProps> = ({
  onPress,
  isSubmitting,
  disabled,
  label,
}) => {
  const theme = useTheme();
  const styles = createStyles(theme);
  
  const state: ButtonState = isSubmitting ? 'processing' : disabled ? 'disabled' : 'default';
  const { icon: StateIcon, color, bg } = BUTTON_STATES[state];
  
  // Ensure colors are strings
  const textColor = String(theme.colors[color]);
  const buttonColor = String(theme.colors[bg]);

  return (
    <Button
      mode="contained"
      onPress={onPress}
      disabled={disabled || isSubmitting}
      style={styles.button}
      buttonColor={buttonColor}
      contentStyle={styles.buttonContent}
    >
      <View style={styles.buttonInner}>
        {isSubmitting ? (
          <ActivityIndicator size="small" color={textColor} />
        ) : StateIcon ? (
          <Icon source={StateIcon} size={20} color={textColor} />
        ) : null}
        <Text variant="labelLarge" style={{ color: textColor }}>
          {label}
        </Text>
      </View>
    </Button>
  );
};

export default TradeButton;
