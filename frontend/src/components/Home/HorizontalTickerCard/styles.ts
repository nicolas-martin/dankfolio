import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';
import { useMemo } from 'react';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;
	return useMemo(() => {
		const colors = theme.colors; // Ensure colors is defined inside useMemo
		const styles = StyleSheet.create({
			change: {
				fontFamily: theme.typography.fontFamily.medium,
				fontSize: theme.typography.fontSize.sm,
			textAlign: 'center',
		},
		changeNegative: {
			color: theme.colors.error,
		},
		changeNeutral: {
			color: theme.colors.onSurfaceVariant,
		},
		changePositive: {
			color: theme.success,
		},
		container: {
			alignItems: 'center',
			backgroundColor: theme.colors.surface,
			borderRadius: theme.borderRadius.md,
			justifyContent: 'center',
			marginHorizontal: theme.spacing.sm,
			minHeight: 120,
			minWidth: 130,
			padding: theme.spacing.md,
			...theme.shadows.sm,
		},
		logoContainer: {
			alignItems: 'center',
			justifyContent: 'center',
			marginBottom: 10,
		},
		symbol: {
			color: theme.colors.onSurface,
			fontFamily: theme.typography.fontFamily.semiBold,
			fontSize: theme.typography.fontSize.sm,
			marginBottom: theme.spacing.xs,
			textAlign: 'center',
		},
		timeAgo: {
			color: theme.colors.onSurfaceVariant,
			fontFamily: theme.typography.fontFamily.medium,
			fontSize: theme.typography.fontSize.sm,
			marginBottom: theme.spacing.xs,
			textAlign: 'center',
		},
	});
	return {
		...styles,
		colors: theme.colors, // Return original theme.colors for consistency
		theme
	};
	}, [theme]);
};
