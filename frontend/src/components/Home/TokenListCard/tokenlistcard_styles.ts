import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';
import { useMemo } from 'react';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;

	return useMemo(() => {
		const styles = StyleSheet.create({
			balance: {
				color: theme.colors.onSurface,
				fontSize: 15,
				fontWeight: '500',
				letterSpacing: 0,
				textAlign: 'right',
			},
			change: {
				fontSize: 13,
				fontWeight: '500',
				textAlign: 'right',
			},
			changeNegative: {
				color: theme.trend.negative,
			},
			changeNeutral: {
				color: theme.colors.onSurfaceVariant,
			},
			changePositive: {
				color: theme.trend.positive,
			},
			columnHeader: {
				alignItems: 'center',
				flexDirection: 'row',
				justifyContent: 'space-between',
				paddingBottom: theme.spacing.sm,
				paddingHorizontal: theme.spacing.lg,
			},
			columnHeaderText: {
				color: theme.colors.onSurfaceVariant,
				fontSize: 12,
				fontWeight: '500',
				letterSpacing: 0.5,
				textAlign: 'center',
				textTransform: 'uppercase',
			},
			container: {
				backgroundColor: theme.colors.surface,
				borderRadius: theme.borderRadius.lg,
				elevation: 2,
				marginBottom: theme.spacing.lg,
				marginHorizontal: theme.spacing.lg,
				shadowColor: theme.shadows.sm.shadowColor,
				shadowOffset: theme.shadows.sm.shadowOffset,
				shadowOpacity: 0.08,
				shadowRadius: theme.spacing.xs,
			},
			divider: {
				backgroundColor: theme.colors.surfaceVariant,
				height: 0.5,
				marginHorizontal: theme.spacing.lg,
			},
			header: {
				paddingBottom: theme.spacing.sm,
				paddingHorizontal: theme.spacing.lg,
				paddingTop: theme.spacing.lg,
			},
			itemContainer: {
				paddingHorizontal: theme.spacing.lg,
				paddingVertical: theme.spacing.lg,
			},
			itemContent: {
				alignItems: 'center',
				flexDirection: 'row',
				justifyContent: 'space-between',
			},
			leftSection: {
				alignItems: 'center',
				flex: 0.4,
				flexDirection: 'row',
				minWidth: 0,
				paddingRight: theme.spacing.sm,
			},
			listContainer: {
				paddingBottom: theme.spacing.sm,
			},
			name: {
				color: theme.colors.onSurfaceVariant,
				flexShrink: 1,
				fontSize: 13,
				fontWeight: '400',
				letterSpacing: 0,
			},
			nameSection: {
				flex: 1,
				justifyContent: 'center',
				minWidth: 0,
			},
			percentChange: {
				// fontSize: 17,
				fontWeight: '600',
				letterSpacing: 0,
				textAlign: 'right',
			},
			rightSection: {
				alignItems: 'flex-end',
				flex: 0.3,
				justifyContent: 'center',
				minWidth: 0,
			},
			sparklineContainer: {
				alignItems: 'center',
				flex: 0.4,
				height: 40,
				justifyContent: 'center',
				paddingHorizontal: theme.spacing.sm,
			},
			symbol: {
				color: theme.colors.onSurface,
				fontSize: 17,
				fontWeight: '600',
				letterSpacing: 0,
				marginBottom: 2,
			},
			title: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.xl,
				fontWeight: '600',
				letterSpacing: 0,
			},
			value: {
				color: theme.colors.onSurfaceVariant,
				fontSize: 13,
				fontWeight: '400',
				letterSpacing: 0,
				marginTop: 2,
				textAlign: 'right',
			},
			volume: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.xs,
				fontWeight: '400',
				letterSpacing: 0.1,
				textAlign: 'right',
			},
		});

		return {
			...styles,
			colors: theme.colors,
			theme,
		};
	}, [theme]);
};
