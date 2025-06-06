import { MD3Theme } from 'react-native-paper';
import { ToastType } from './toast_types';

// Renamed: Gets the main color for icon/border
export const getToastForegroundColor = (type: ToastType, theme: MD3Theme) => {
	switch (type) {
		case 'success':
			// Use a success color (assuming it exists in theme)
			// TODO: Define theme.colors.success if it doesn't exist
			return (theme.colors as unknown).success || theme.colors.primary;
		case 'error':
			return theme.colors.error;
		case 'warning':
			// Use warning color (assuming it exists in theme)
			// TODO: Define theme.colors.warning if it doesn't exist
			return (theme.colors as unknown).warning || theme.colors.error;
		case 'info':
			return theme.colors.primary;
		default:
			return theme.colors.primary;
	}
};

// New: Gets background color (COMMON)
export const getToastBackgroundColor = (type: ToastType, theme: MD3Theme) => {
	// Always return surfaceVariant for a consistent background
	return theme.colors.surfaceVariant;
};

// Remove getToastOpacity function if it's still there and unused
