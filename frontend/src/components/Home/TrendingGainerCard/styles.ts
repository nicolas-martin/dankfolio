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
				backgroundColor: theme.colors.surfaceVariant,
				borderRadius: theme.borderRadius.lg,
				height: 100,
				justifyContent: 'center',
				marginRight: theme.spacing.md,
				overflow: 'hidden',
				padding: theme.spacing.sm,
				width: 110,
			},
			changeContainer: {
				alignItems: 'center',
				flexDirection: 'row',
				gap: 2,
				justifyContent: 'center',
				marginTop: theme.spacing.xs,
				maxWidth: 90,
				width: '100%',
			},
			changeText: {
				flexShrink: 1,
				fontFamily: theme.typography.fontFamily.semiBold,
				fontSize: 13,
				textAlign: 'center',
			},
			iconContainer: {
				alignItems: 'center',
				height: 36,
				justifyContent: 'center',
				marginBottom: theme.spacing.xs,
				width: 36,
			},
			shimmerChange: {
				alignSelf: 'center',
				borderRadius: theme.borderRadius.sm,
				height: 14,
				width: '60%',
			},
			shimmerIcon: {
				alignSelf: 'center',
				borderRadius: 24,
				height: 48,
				marginBottom: 10,
				width: 48,
			},
			shimmerSymbol: {
				alignSelf: 'center',
				borderRadius: theme.borderRadius.sm,
				height: 16,
				marginBottom: theme.spacing.xs,
				width: '80%',
			},
			symbol: {
				color: theme.colors.onSurface,
				fontFamily: theme.typography.fontFamily.semiBold,
				fontSize: 12,
				marginBottom: theme.spacing.xs,
				maxWidth: 90,
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
