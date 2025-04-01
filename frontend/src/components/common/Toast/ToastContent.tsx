import React from 'react';
import { View } from 'react-native';
import { Text, useTheme, IconButton } from 'react-native-paper';
import { ToastType } from './toast_types';
import { getToastColor, getToastOpacity } from './toast_constants';
import { getToastIcon } from './toast_icons';

interface ToastContentProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  styles: any; // Will be properly typed from createStyles
}

export const ToastContent: React.FC<ToastContentProps> = ({
  message,
  type,
  onClose,
  styles,
}) => {
  const theme = useTheme();
  const toastColor = getToastColor(type, theme);
  
  return (
    <View style={styles.content}>
      <View style={styles.messageContainer}>
        <IconButton
          icon={getToastIcon(type)}
          size={20}
          style={[styles.statusIcon, { backgroundColor: getToastOpacity(toastColor) }]}
          iconColor={toastColor}
          disabled
        />
        <Text style={styles.message}>{message}</Text>
      </View>
      <IconButton
        icon="close"
        size={20}
        onPress={onClose}
        style={styles.closeButton}
        iconColor={theme.colors.onSurfaceVariant}
      />
    </View>
  );
};