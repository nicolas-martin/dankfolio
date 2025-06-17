import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';
import { useMemo } from 'react';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;
	
	return useMemo(() => {
		const styles = StyleSheet.create({
			card: {
				alignItems: 'center',
				backgroundColor: theme.colors.surface,
				borderRadius: theme.borderRadius.md,
				height: 120,
				justifyContent: 'center',
				marginRight: theme.spacing.lg,
				padding: theme.spacing.md,
				width: 140,
				...theme.shadows.sm,
			},
			changeContainer: {
				alignItems: 'center',
				flexDirection: 'row',
				gap: 4,
				justifyContent: 'center',
				marginTop: theme.spacing.xs,
			},
			changeText: {
				fontFamily: theme.typography.fontFamily.medium,
				fontSize: theme.typography.fontSize.sm,
				textAlign: 'center',
			},
			iconContainer: {
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
		});
		
		const getTrendColor = (value: number | undefined): string => {
			if (value === undefined) return theme.colors.onSurfaceVariant;
			if (value > 0) return theme.trend.positive;
			if (value < 0) return theme.trend.negative;
			return theme.colors.onSurfaceVariant;
		};
		
		return {
			...styles,
			colors: theme.colors,
			theme,
			getTrendColor,
		};
	}, [theme]);
}; 