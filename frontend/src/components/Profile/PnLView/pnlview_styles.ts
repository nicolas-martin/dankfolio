import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';
import { useMemo } from 'react';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;
	return useMemo(() => {
		const styles = StyleSheet.create({
			allocationColumn: {
				flex: 0.7,
				justifyContent: 'center',
			},
			allocationColumnCenter: {
				flex: 0.7,
				justifyContent: 'center',
			},
			allocationText: {
				color: theme.colors.onSurfaceVariant,
				fontSize: 11,
				fontWeight: '500',
			},
			arrowColumn: {
				flex: 0.3,
				justifyContent: 'center',
			},
			container: {
				flex: 1,
			},
			contentContainer: {
				backgroundColor: theme.colors.surface,
			},
			costBasisColumn: {
				flex: 1.1,
				justifyContent: 'center',
			},
			costBasisColumnCenter: {
				flex: 1.1,
				justifyContent: 'center',
			},
			costBasisText: {
				color: theme.colors.onSurfaceVariant,
				fontSize: 11,
				fontWeight: '500',
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
			gainBadge: {
				alignSelf: 'center',
			},
			gainBadgeNegative: {
				// No background
			},
			gainBadgeNeutral: {
				// No background
			},
			gainBadgePositive: {
				// No background
			},
			gainColumn: {
				flex: 1.2,
				justifyContent: 'center',
			},
			gainColumnCenter: {
				flex: 1.2,
				justifyContent: 'center',
			},
			gainText: {
				fontSize: theme.typography.fontSize.sm,
				fontWeight: '600',
			},
			gainTextNegative: {
				color: theme.colors.error,
			},
			gainTextNeutral: {
				color: theme.colors.onSurfaceVariant,
			},
			gainTextPositive: {
				color: theme.success,
			},
			headerText: {
				color: theme.colors.onSurfaceVariant,
				fontSize: 10,
				fontWeight: '600',
				letterSpacing: 0.5,
			},
			iconColumn: {
				flex: 0.4,
				justifyContent: 'center',
			},
			iconColumnCell: {
				flex: 0.4,
				justifyContent: 'center',
			},
			lastRow: {
				borderBottomWidth: 0,
			},
			negativeSmallText: {
				color: theme.colors.error,
				fontSize: 10,
			},
			negativeText: {
				color: theme.colors.error,
			},
			neutralSmallText: {
				color: theme.colors.onSurfaceVariant,
				fontSize: 10,
			},
			neutralText: {
				color: theme.colors.onSurfaceVariant,
			},
			pnlColumn: {
				flex: 1.4,
				justifyContent: 'center',
			},
			pnlColumnCenter: {
				flex: 1.4,
				justifyContent: 'center',
			},
			pnlContainer: {
				alignItems: 'flex-end',
			},
			pnlPercentText: {
				fontSize: 10,
				marginTop: 2,
			},
			pnlUsdText: {
				fontSize: 11,
				fontWeight: '600',
			},
			positiveSmallText: {
				color: theme.success,
				fontSize: 10,
			},
			positiveText: {
				color: theme.success,
			},
			scrollContent: {
				flexGrow: 1,
				paddingBottom: 100,
			},
			summaryContainer: {
				backgroundColor: theme.colors.surface,
				borderBottomColor: theme.colors.surfaceVariant,
				borderBottomWidth: 1,
				paddingHorizontal: theme.spacing.lg,
				paddingVertical: theme.spacing.md,
			},
			summaryItem: {
				flex: 1,
			},
			summaryLabel: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.xs,
				fontWeight: '500',
				marginBottom: 4,
			},
			summaryRow: {
				flexDirection: 'row',
				justifyContent: 'space-between',
				marginBottom: theme.spacing.md,
			},
			summaryValue: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.lg,
				fontWeight: '700',
			},
			symbolCellContent: {
				alignItems: 'flex-start',
				flexDirection: 'row',
			},
			symbolColumn: {
				flex: 1.3,
			},
			symbolColumnStart: {
				flex: 1.3,
				justifyContent: 'flex-start',
			},
			tableHeader: {
				borderBottomColor: theme.colors.surfaceVariant,
			},
			tableRow: {
				alignItems: 'center',
				borderBottomColor: theme.colors.surfaceVariant,
				borderBottomWidth: 1,
				minHeight: 96,
				paddingVertical: theme.spacing.md,
			},
			tokenAmount: {
				color: theme.colors.onSurfaceVariant,
				fontSize: 10,
				marginTop: 2,
			},
			tokenIcon: {
				borderRadius: 14,
				height: 28,
				width: 28,
			},
			tokenInfoContainer: {
				alignItems: 'center',
			},
			tokenNameContainer: {
				alignItems: 'flex-start',
			},
			tokenShares: {
				color: theme.colors.onSurfaceVariant,
				fontSize: 10,
				marginTop: 1,
			},
			tokenSymbol: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.sm,
				fontWeight: '600',
				marginBottom: 4,
			},
			tokenValue: {
				color: theme.colors.onSurface,
				fontSize: 11,
				fontWeight: '600',
			},
			valueColumn: {
				flex: 1.1,
				justifyContent: 'center',
			},
			valueColumnCenter: {
				flex: 1.1,
				justifyContent: 'center',
			},
		});
		return {
			...styles,
			colors: theme.colors,
			theme,
		};
	}, [theme]);
};
