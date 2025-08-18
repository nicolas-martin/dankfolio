import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';
import { useMemo } from 'react';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;
	return useMemo(() => {
		const styles = StyleSheet.create({
			amountContainer: {
				marginTop: theme.spacing.xs,
			},
			arrowIcon: {
				height: 36,
				margin: 0,
				marginHorizontal: theme.spacing.md,
				width: 36,
			},
			cardContent: {
				paddingHorizontal: theme.spacing.md,
				paddingVertical: theme.spacing.sm,
			},
			centerContainer: {
				alignItems: 'center',
				flex: 1,
				justifyContent: 'center',
				paddingVertical: theme.spacing['4xl'],
			},
			coinAmount: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.sm,
			},
			coinColumn: {
				alignItems: 'center',
				flex: 1,
			},
			coinIcon: {
				borderRadius: theme.spacing.xl,
				height: 36,
				width: 36,
			},
			coinIconContainer: {
				alignItems: 'center',
				height: 36,
				justifyContent: 'center',
				width: 36,
			},
			coinSymbol: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.sm,
				fontWeight: '600',
				marginTop: theme.spacing.xs,
			},
			container: {
				flex: 1,
			},
			customStatusBadge: {
				alignItems: 'center',
				borderRadius: 18,
				height: 36,
				justifyContent: 'center',
				marginTop: theme.spacing.xs,
				minWidth: 90,
				paddingHorizontal: theme.spacing.md,
			},
			customStatusText: {
				fontSize: theme.typography.fontSize.sm,
				fontWeight: '600',
				textTransform: 'capitalize',
			},
			emptyContainer: {
				alignItems: 'center',
				flex: 1,
				justifyContent: 'center',
				paddingHorizontal: theme.spacing['2xl'],
				paddingVertical: theme.spacing['4xl'],
			},
			emptyIcon: {
				marginBottom: theme.spacing.sm,
				opacity: 0.5,
			},
			emptySubtext: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.sm,
				textAlign: 'center',
			},
			emptyTitle: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.lg,
				fontWeight: '600',
				marginBottom: theme.spacing.xs,
			},
			errorSubtext: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.sm,
				marginTop: theme.spacing.xs,
				textAlign: 'center',
			},
			errorText: {
				color: theme.colors.error,
				fontSize: theme.typography.fontSize.base,
				fontWeight: '600',
				marginTop: theme.spacing.md,
				textAlign: 'center',
			},
			fromAmount: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.sm,
				fontWeight: '600',
			},
			iconContainer: {
				backgroundColor: theme.colors.surfaceVariant,
				borderRadius: theme.spacing.xl,
				marginRight: theme.spacing.md,
			},
			listContainer: {
				backgroundColor: theme.colors.surface,
			},
			loadingText: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.base,
				marginTop: theme.spacing.lg,
				textAlign: 'center',
			},
			scrollContent: {
				flexGrow: 1,
			},
			statusChip: {
				borderRadius: 18,
				height: 36,
				marginTop: theme.spacing.xs,
				minWidth: 120,
				paddingHorizontal: theme.spacing.lg,
			},
			statusChipCompleted: {
				backgroundColor: theme.success + '20',
				borderRadius: 18,
				height: 36,
				marginTop: theme.spacing.xs,
				minWidth: 120,
				paddingHorizontal: theme.spacing.lg,
			},
			statusChipFailed: {
				backgroundColor: theme.colors.error + '20',
				borderRadius: 18,
				height: 36,
				marginTop: theme.spacing.xs,
				minWidth: 120,
				paddingHorizontal: theme.spacing.lg,
			},
			statusChipPending: {
				backgroundColor: theme.warning + '20',
				borderRadius: 18,
				height: 36,
				marginTop: theme.spacing.xs,
				minWidth: 120,
				paddingHorizontal: theme.spacing.lg,
			},
			statusChipText: {
				fontSize: theme.typography.fontSize.sm,
				fontWeight: '600',
				textTransform: 'capitalize',
			},
			swapArrow: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.sm,
				marginHorizontal: theme.spacing.xs,
			},
			toAmount: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.xs,
				marginTop: 2,
			},
			transactionAmount: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.base,
				fontWeight: '700',
				textAlign: 'right',
			},
			transactionBottom: {
				flexDirection: 'row',
				marginTop: theme.spacing.xs,
			},
			transactionCard: {
				marginBottom: theme.spacing.md,
			},
			transactionDate: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.sm,
				marginBottom: theme.spacing.xs,
			},
			transactionDetails: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.sm,
				marginTop: 2,
			},
			transactionHeader: {
				alignItems: 'center',
				flexDirection: 'row',
				marginBottom: theme.spacing.xs,
			},
			transactionIcon: {
				margin: 0,
			},
			transactionInfo: {
				flex: 1,
			},
			transactionItem: {
				borderBottomColor: theme.colors.surfaceVariant,
				borderBottomWidth: StyleSheet.hairlineWidth,
				minHeight: 88,
				paddingHorizontal: theme.spacing.lg,
				paddingVertical: theme.spacing.lg,
			},
			transactionItemLast: {
				borderBottomWidth: 0,
			},
			transactionLeft: {
				flex: 0.6,
			},
			transactionMainRow: {
				flexDirection: 'row',
				justifyContent: 'space-between',
			},
			transactionRight: {
				alignItems: 'flex-end',
				flex: 1,
				justifyContent: 'space-between',
			},
			transactionRow: {
				alignItems: 'center',
				flexDirection: 'row',
				justifyContent: 'flex-start',
				marginTop: theme.spacing.xs,
			},
			transactionTop: {
				alignItems: 'center',
				flexDirection: 'row',
				justifyContent: 'space-between',
			},
			transactionType: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.base,
				fontWeight: '600',
			},
			transactionTypeIcon: {
				margin: 0,
				marginLeft: -8,
				marginRight: theme.spacing.xs,
			},
		});
		return {
			...styles,
			colors: theme.colors,
			theme,
		};
	}, [theme]);
};
