import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme'; // Assuming AppTheme is your extended theme type
import { useTheme } from 'react-native-paper';
import { useMemo } from 'react';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;

	return useMemo(() => {
		return StyleSheet.create({
			blurView: {
				// This view will wrap the button content.
				// It should allow the button's padding to define its size.
				// No specific width/height needed here as it expands with content.
			},
			button: {
				borderRadius: theme.borderRadius.lg,
				paddingVertical: theme.spacing.sm,
			},
			buttonContent: {
				paddingVertical: theme.spacing.xs,
				// minHeight: 50, // Example of setting a minimum height
			},
			buttonLabel: {
				fontSize: theme.typography.fontSize.lg,
				fontWeight: 'bold',
				textAlign: 'center',
			},
			container: {
				borderRadius: theme.borderRadius.lg,
				marginHorizontal: theme.spacing.md,
				marginVertical: theme.spacing.sm,
				overflow: 'hidden',
			},
		});
	}, [theme]);
};
