import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';
import { useMemo } from 'react';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;
	return useMemo(() => {
		const colors = theme.colors; // Ensure colors is defined inside useMemo
		const styles = StyleSheet.create({
			container: {
				flex: 1,
			},
			listWrapper: {
				backgroundColor: colors.surface,
				borderRadius: theme.borderRadius.lg,
				elevation: 2,
				marginBottom: theme.spacing.lg,
				marginHorizontal: theme.spacing.lg,
				shadowColor: theme.shadows.sm.shadowColor,
				shadowOffset: theme.shadows.sm.shadowOffset,
				shadowOpacity: 0.08,
				shadowRadius: theme.spacing.xs,
			},
			emptyContainer: {
				alignItems: 'center',
				flex: 1,
				justifyContent: 'center',
				paddingVertical: 50,
			},
			emptyListContainer: {
				flex: 1,
				paddingBottom: 20,
			},
			emptyText: {
				color: colors.onSurfaceVariant,
				fontSize: 16,
				marginBottom: 16,
			},
			headerTitle: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize['2xl'],
				fontWeight: '700',
				marginBottom: theme.spacing['2xl'],
				marginTop: theme.spacing['2xl'],
				textAlign: 'left',
			},
			itemContainer: {
				backgroundColor: colors.surface,
				padding: 16,
			},
			itemContent: {
				alignItems: 'center',
				flexDirection: 'row',
				justifyContent: 'space-between',
			},
			leftSection: {
				alignItems: 'center',
				flex: 1,
				flexDirection: 'row',
			},
			listContainer: {
				paddingBottom: 20,
			},
			loadingContainer: {
				alignItems: 'center',
				flex: 1,
				justifyContent: 'center',
			},
			loadingIndicator: {
				color: colors.primary,
			},
			name: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.sm,
			},
			negativeChange: {
				color: theme.trend.negative,
			},
			placeholderIcon: {
				alignItems: 'center',
				backgroundColor: colors.surfaceVariant,
				borderRadius: 20,
				height: 40,
				justifyContent: 'center',
				width: 40,
			},
			placeholderText: {
				color: theme.colors.onSurfaceVariant,
				fontSize: 18,
				fontWeight: 'bold',
			},
			positiveChange: {
				color: theme.trend.positive,
			},
			price: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.base,
				fontWeight: '500',
			},
			priceChange: {
				fontSize: theme.typography.fontSize.sm,
				fontWeight: '500',
				marginTop: 2,
			},
			retryButton: {
				backgroundColor: theme.colors.primary,
				borderRadius: 8,
				paddingHorizontal: 24,
				paddingVertical: 12,
			},
			retryButtonText: {
				color: colors.onPrimary,
				fontSize: 14,
				fontWeight: '600',
			},
			rightSection: {
				alignItems: 'flex-end',
			},
			safeArea: {
				backgroundColor: theme.colors.background,
				flex: 1,
			},
			separator: {
				backgroundColor: colors.outline,
				height: StyleSheet.hairlineWidth,
				marginHorizontal: 16,
			},
			symbol: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.base,
				fontWeight: '600',
			},
			tokenInfo: {
				flex: 1,
				marginLeft: theme.spacing.xl,
			},
		});

		return {
			...styles,
			colors: theme.colors, // Return original theme.colors for consistency
			theme
		};
	}, [theme]);
};
