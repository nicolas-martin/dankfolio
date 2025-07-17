import { StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import { AppTheme } from '@/utils/theme';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;

	return {
		...StyleSheet.create({
			container: {
				flex: 1,
			},
			contentContainer: {
				backgroundColor: theme.colors.surface,
				borderRadius: theme.roundness,
				marginHorizontal: theme.spacing.md,
				marginTop: theme.spacing.md,
				overflow: 'hidden',
			},
			currentPrice: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.xs,
				marginTop: 2,
			},
			currentValue: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.base,
				fontWeight: '700',
				textAlign: 'right',
			},
			divider: {
				marginVertical: theme.spacing.lg,
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
			infoIcon: {
				margin: 0,
				marginRight: theme.spacing.xs,
			},
			noPnlData: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.xs,
				fontStyle: 'italic',
				marginTop: theme.spacing.xs,
				textAlign: 'right',
			},
			noteContainer: {
				alignItems: 'center',
				flexDirection: 'row',
			},
			noteText: {
				color: theme.colors.onSurfaceVariant,
				flex: 1,
				fontSize: theme.typography.fontSize.sm,
				fontStyle: 'italic',
			},
			pnlContainer: {
				alignItems: 'flex-end',
				marginTop: theme.spacing.xs,
			},
			pnlNegative: {
				color: theme.colors.error,
			},
			pnlPercentage: {
				fontSize: theme.typography.fontSize.xs,
				fontWeight: '600',
			},
			pnlPercentageNegative: {
				color: theme.colors.error,
				fontSize: theme.typography.fontSize.xs,
				fontWeight: '600',
			},
			pnlPercentagePositive: {
				color: theme.success,
				fontSize: theme.typography.fontSize.xs,
				fontWeight: '600',
			},
			pnlPositive: {
				color: theme.success,
			},
			pnlValue: {
				fontSize: theme.typography.fontSize.sm,
				fontWeight: '700',
			},
			pnlValueNegative: {
				color: theme.colors.error,
				fontSize: theme.typography.fontSize.sm,
				fontWeight: '700',
			},
			pnlValuePositive: {
				color: theme.success,
				fontSize: theme.typography.fontSize.sm,
				fontWeight: '700',
			},
			scrollContent: {
				flexGrow: 1,
			},
			sectionTitle: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.lg,
				fontWeight: '600',
				marginBottom: theme.spacing.md,
				marginTop: theme.spacing.xl,
			},
			statItem: {
				flex: 1,
			},
			statLabel: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.sm,
				marginBottom: theme.spacing.xs,
			},
			statSubtext: {
				fontSize: theme.typography.fontSize.sm,
				marginTop: theme.spacing.xs,
			},
			statValue: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.xl,
				fontWeight: '700',
			},
			statsGrid: {
				flexDirection: 'row',
				justifyContent: 'space-between',
				marginTop: theme.spacing.md,
			},
			summaryCard: {
				marginBottom: theme.spacing.lg,
			},
			summaryTitle: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.xl,
				fontWeight: '700',
			},
			tokenAmount: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.xs,
				marginTop: 2,
			},
			tokenCard: {
				marginBottom: theme.spacing.md,
			},
			tokenContent: {
				paddingHorizontal: theme.spacing.md,
				paddingVertical: theme.spacing.md,
			},
			tokenIcon: {
				borderRadius: theme.spacing.xl,
				height: 40,
				width: 40,
			},
			tokenIconContainer: {
				marginRight: theme.spacing.md,
			},
			tokenInfo: {
				flex: 1,
			},
			tokenItem: {
				borderBottomColor: theme.colors.surfaceVariant,
				borderBottomWidth: StyleSheet.hairlineWidth,
				paddingHorizontal: theme.spacing.md,
				paddingVertical: theme.spacing.md,
			},
			tokenItemLast: {
				borderBottomWidth: 0,
			},
			tokenLeft: {
				alignItems: 'center',
				flex: 1,
				flexDirection: 'row',
			},
			tokenName: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.xs,
				marginTop: 2,
			},
			tokenRight: {
				alignItems: 'flex-end',
				justifyContent: 'center',
			},
			tokenRow: {
				flexDirection: 'row',
				justifyContent: 'space-between',
			},
			tokenSymbol: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.base,
				fontWeight: '600',
			},
		}),
		colors: theme.colors,
	};
};