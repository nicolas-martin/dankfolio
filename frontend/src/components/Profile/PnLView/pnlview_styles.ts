import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';
import { useMemo } from 'react';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;
	return useMemo(() => {
		const styles = StyleSheet.create({
			arrowColumn: {
				flex: 0.3,
				justifyContent: 'center',
			},
			container: {
				flex: 1,
			},
			contentContainer: {
				backgroundColor: theme.colors.surface,
				borderRadius: theme.roundness,
				marginHorizontal: theme.spacing.md,
				overflow: 'hidden',
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
			lastRow: {
				borderBottomWidth: 0,
			},
			scrollContent: {
				flexGrow: 1,
				paddingBottom: 100,
			},
			symbolCellContent: {
				alignItems: 'flex-start',
				flexDirection: 'row',
			},
			symbolColumn: {
				flex: 1.2,
			},
			symbolColumnStart: {
				flex: 1.2,
				justifyContent: 'flex-start',
			},
			tableHeader: {
				borderBottomColor: theme.colors.surfaceVariant,
				borderBottomWidth: 1,
				height: 40,
				paddingHorizontal: theme.spacing.sm,
			},
			tableRow: {
				alignItems: 'center',
				borderBottomColor: theme.colors.surfaceVariant,
				borderBottomWidth: 1,
				minHeight: 72,
			},
			tokenAmount: {
				color: theme.colors.onSurfaceVariant,
				fontSize: 10,
				marginTop: 2,
			},
			tokenIcon: {
				borderRadius: 20,
				height: 40,
				width: 40,
			},
			tokenInfoContainer: {
				alignItems: 'center',
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
				fontSize: theme.typography.fontSize.sm,
				fontWeight: '600',
			},
			valueColumn: {
				flex: 1.5,
				justifyContent: 'center',
			},
			valueColumnCenter: {
				flex: 1.5,
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
