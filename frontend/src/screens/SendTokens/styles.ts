import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: theme.colors.background,
		},
		contentPadding: {
			padding: 20,
		},
		title: {
			fontSize: 24,
			fontWeight: 'bold',
			color: theme.colors.onSurface,
			marginBottom: 20,
		},
		inputContainer: {
			marginBottom: 20,
		},
		label: {
			fontSize: 16,
			color: theme.colors.onSurface,
			marginBottom: 8,
		},
		input: {
			backgroundColor: theme.colors.surfaceVariant,
			padding: 12,
			borderRadius: 8,
			color: theme.colors.onSurface,
			borderWidth: 1,
			borderColor: theme.colors.outline,
		},
		errorText: {
			color: theme.colors.error,
			fontSize: 14,
			marginTop: 4,
		},
		button: {
			backgroundColor: theme.colors.primary,
			padding: 16,
			borderRadius: 8,
			alignItems: 'center',
			opacity: 1,
		},
		buttonDisabled: {
			opacity: 0.5,
		},
		buttonText: {
			color: theme.colors.onPrimary,
			fontSize: 16,
			fontWeight: 'bold',
		},
	}); 