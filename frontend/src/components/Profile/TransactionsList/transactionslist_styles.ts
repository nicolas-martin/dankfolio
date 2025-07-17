import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';
import { useMemo } from 'react';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;
	return useMemo(() => {
		const styles = StyleSheet.create({
			arrowIcon: {
				margin: 0,
				marginHorizontal: theme.spacing.xs,
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
				fontSize: theme.typography.fontSize.xs,
				marginTop: 2,
			},
			coinColumn: {
				alignItems: 'center',
				flex: 1,
			},
			coinIcon: {
				borderRadius: theme.spacing.xl,
				height: 32,
				width: 32,
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
			iconContainer: {
				backgroundColor: theme.colors.surfaceVariant,
				borderRadius: theme.spacing.xl,
				marginRight: theme.spacing.md,
			},
			listContainer: {
				backgroundColor: theme.colors.surface,
				borderRadius: theme.roundness,
				marginHorizontal: theme.spacing.md,
				marginTop: theme.spacing.md,
				overflow: 'hidden',
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
				marginTop: theme.spacing.xs,
			},
			statusChipCompleted: {
				backgroundColor: theme.success + '20',
				marginTop: theme.spacing.xs,
			},
			statusChipFailed: {
				backgroundColor: theme.colors.error + '20',
				marginTop: theme.spacing.xs,
			},
			statusChipPending: {
				backgroundColor: theme.warning + '20',
				marginTop: theme.spacing.xs,
			},
			statusChipText: {
				fontSize: theme.typography.fontSize.xs,
				fontWeight: '600',
				textTransform: 'capitalize',
			},
			swapArrow: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.sm,
				marginHorizontal: theme.spacing.xs,
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
				fontSize: theme.typography.fontSize.xs,
			},
			transactionDetails: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.sm,
				marginTop: 2,
			},
			transactionHeader: {
				alignItems: 'center',
				flexDirection: 'row',
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
				paddingHorizontal: theme.spacing.md,
				paddingVertical: theme.spacing.sm,
			},
			transactionItemLast: {
				borderBottomWidth: 0,
			},
			transactionLeft: {
				flex: 1,
			},
			transactionMainRow: {
				flexDirection: 'row',
				justifyContent: 'space-between',
			},
			transactionRight: {
				alignItems: 'flex-end',
				justifyContent: 'center',
			},
			transactionRow: {
				flexDirection: 'row',
				justifyContent: 'space-between',
			},
			transactionTop: {
				alignItems: 'center',
				flexDirection: 'row',
				justifyContent: 'space-between',
			},
			transactionType: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.sm,
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
