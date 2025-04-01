import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Button, Text, Icon, useTheme } from 'react-native-paper';
import { TradeButtonProps } from './tradebutton_types';
import {
  ICON_CHECK,
  ICON_WARNING,
} from '../../../utils/icons';

const BUTTON_STATES: Record<string, {
  icon?: any;
  color: string;
  bg: string;
}> = {
  default: {
    bg: '$primary',
    color: '$textLight',
  },
  processing: {
    bg: '$primary',
    color: '$textLight',
  },
  disabled: {
    bg: '$backgroundDark',
    color: '$textSecondary',
  },
  error: {
    icon: ICON_WARNING,
    bg: '$error',
    color: '$textLight',
  },
  success: {
    icon: ICON_CHECK,
    bg: '$success',
    color: '$textLight',
  },
};

const TradeButton: React.FC<TradeButtonProps> = ({
  onPress,
  isSubmitting,
  disabled,
  label,
}) => {
  const theme = useTheme();
  const styles = createStyles(theme);
  const state = isSubmitting ? 'processing' : disabled ? 'disabled' : 'default';
  const { icon: StateIcon, color, bg } = BUTTON_STATES[state]; // TODO: Refactor BUTTON_STATES to use theme
  const textColor = color === '$textLight' ? theme.colors.onPrimary : theme.colors.onSurface;
  const buttonColor = bg.startsWith('$') ? theme.colors.primary : bg;

  return (
    <Button
      mode="contained"
      onPress={onPress}
      disabled={disabled || isSubmitting}
      style={[
        styles.button,
        { backgroundColor: buttonColor, marginTop: 16 }, // mt="$4"
      ]}
      contentStyle={styles.buttonContent}
    >
      <View style={styles.buttonInner}>
        {isSubmitting ? (
          <ActivityIndicator size="small" color={textColor} />
        ) : StateIcon ? (
          <Icon source={StateIcon} size={20} color={textColor} />
        ) : null}
        <Text style={[styles.buttonText, { color: textColor }]}>
          {label}
        </Text>
    </View>
  </Button>
  );
};

export default TradeButton;

const createStyles = (theme: any) => StyleSheet.create({
  button: {
    borderRadius: 16, // rounded="$lg"
    paddingVertical: 12, // py="$3"
  },
  buttonContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8, // space="sm"
  },
  buttonText: {
    fontWeight: 'bold', // fontWeight="$bold"
    fontSize: 18, // fontSize="$lg"
  },
});
