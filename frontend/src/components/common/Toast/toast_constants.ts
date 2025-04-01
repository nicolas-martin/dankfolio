import { MD3Theme } from 'react-native-paper';
import { ToastType } from './toast_types';

// Renamed: Gets the main color for icon/border
export const getToastForegroundColor = (type: ToastType, theme: MD3Theme) => {
  switch (type) {
    case 'success':
      // Use a success color (assuming it exists in theme)
      // TODO: Define theme.colors.success if it doesn't exist
      return (theme.colors as any).success || theme.colors.primary; 
    case 'error':
      return theme.colors.error;
    case 'warning':
      // Use warning color (assuming it exists in theme)
      // TODO: Define theme.colors.warning if it doesn't exist
      return (theme.colors as any).warning || theme.colors.error; 
    case 'info':
      return theme.colors.primary;
    default:
      return theme.colors.primary;
  }
};

// New: Gets background color based on type (SOLID)
export const getToastBackgroundColor = (type: ToastType, theme: MD3Theme) => {
  // Option 2: Use solid lighter theme colors
  switch (type) {
    case 'success':
      // TODO: Define theme.colors.successContainer if needed
      return (theme.colors as any).successContainer || theme.colors.primaryContainer; 
    case 'error':
      // TODO: Define theme.colors.errorContainer if needed
      return (theme.colors as any).errorContainer || theme.colors.errorContainer; // Fallback? Maybe surface?
    case 'warning':
       // TODO: Define theme.colors.warningContainer if needed
       return (theme.colors as any).warningContainer || theme.colors.secondaryContainer; // Example fallback
    case 'info':
    default:
      return theme.colors.secondaryContainer || theme.colors.primaryContainer; 
  }
};