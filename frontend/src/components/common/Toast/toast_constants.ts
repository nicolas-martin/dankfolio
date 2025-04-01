import { MD3Theme } from 'react-native-paper';
import { ToastType } from './toast_types';

export const getToastColor = (type: ToastType, theme: MD3Theme) => {
  switch (type) {
    case 'success':
      return theme.colors.primary;
    case 'error':
      return theme.colors.error;
    case 'warning':
      return theme.colors.error; // Use error color for warnings
    case 'info':
      return theme.colors.secondary;
    default:
      return theme.colors.primary;
  }
};

export const getToastOpacity = (color: string) => `${color}20`; // 20 is hex for 12% opacity