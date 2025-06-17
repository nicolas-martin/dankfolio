import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';
import { useMemo } from 'react';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;
	return useMemo(() => {
		const trend = {
			positive: theme.trend.positive,
			negative: theme.trend.negative,
			neutral: theme.trend.neutral,
		};

		const styles = StyleSheet.create({
			cardWrapper: {
				marginRight: theme.spacing.md,
				width: 80,
			},
			changeContainer: {
				alignItems: 'center',
				flexDirection: 'row',
				gap: 2,
				justifyContent: 'flex-end',
				minWidth: 35,
			},
			container: {
				paddingBottom: theme.spacing.lg,
				paddingTop: theme.spacing.md,
			},
			emptyText: {
				color: theme.colors.onSurfaceVariant,
				minHeight: 100,
				paddingHorizontal: theme.spacing.lg,
				paddingVertical: theme.spacing.lg,
				textAlign: 'center',
			},
			listContentContainer: {
				paddingLeft: theme.spacing.lg,
				paddingRight: theme.spacing.xs,
			},
			newCoinCard: {
				alignItems: 'center',
				backgroundColor: theme.colors.surface,
				borderRadius: theme.borderRadius.lg,
				flexDirection: 'row',
				gap: theme.spacing.xs / 2,
				justifyContent: 'space-between',
				minHeight: 44,
				paddingHorizontal: theme.spacing.sm,
				paddingVertical: theme.spacing.xs,
				width: 140,
			},
			newCoinChange: {
				fontFamily: theme.typography.fontFamily.medium,
				fontSize: 10,
				textAlign: 'right',
			},
			newCoinSymbol: {
				color: theme.colors.onSurface,
				flex: 1,
				fontFamily: theme.typography.fontFamily.semiBold,
				fontSize: 12,
				marginLeft: theme.spacing.xs,
				textAlign: 'left',
			},
			placeholderCard: {
				alignItems: 'center',
				backgroundColor: theme.colors.surface,
				borderRadius: theme.borderRadius.lg,
				elevation: 2,
				flexDirection: 'row',
				justifyContent: 'space-between',
				minHeight: 44,
				paddingHorizontal: theme.spacing.sm,
				paddingVertical: theme.spacing.xs,
				shadowColor: theme.colors.shadow,
				shadowOffset: theme.shadows.sm.shadowOffset,
				shadowOpacity: 0.1,
				shadowRadius: theme.shadows.sm.shadowRadius,
				width: 140,
			},
			placeholderIconShimmer: {
				borderRadius: theme.borderRadius.full,
				height: 20,
				width: 20,
			},
			placeholderTextContainer: {
				flex: 1,
				marginLeft: theme.spacing.xs,
			},
			placeholderTextShimmerLine1: {
				borderRadius: theme.borderRadius.sm,
				height: 12,
				marginBottom: 2,
				width: '70%',
			},
			placeholderTextShimmerLine2: {
				borderRadius: theme.borderRadius.sm,
				height: 10,
				width: '50%',
			},
			title: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.xl,
				fontWeight: '600',
			},
			titleContainer: {
				alignItems: 'flex-start',
				flexDirection: 'row',
				justifyContent: 'space-between',
				marginBottom: theme.spacing.lg,
				paddingHorizontal: theme.spacing.lg,
			},
			titleShimmer: {
				backgroundColor: theme.colors.surface,
				borderRadius: theme.borderRadius.sm,
				height: 22,
				marginBottom: theme.spacing.sm,
				marginLeft: theme.spacing.lg,
				width: 200,
			},
		});
		return {
			...styles,
			colors: theme.colors,
			theme,
			trend: trend,
		};
	}, [theme]);
};
