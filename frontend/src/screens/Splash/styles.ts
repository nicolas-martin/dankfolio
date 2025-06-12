import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';
import { AppTheme } from '@/utils/theme';

export const createStyles = (theme: AppTheme) =>
	StyleSheet.create({
		container: {
			alignItems: 'center',
			backgroundColor: theme.colors.background,
			flex: 1,
			justifyContent: 'center',
		},
		loadingText: {
			color: theme.colors.primary,
			fontSize: theme.typography.fontSize.lg,
			marginTop: 10, // No exact match
		},
		logo: {
			height: 200, // No exact match
			marginBottom: theme.spacing.xl,
			width: 200, // No exact match
		},
	}); 
