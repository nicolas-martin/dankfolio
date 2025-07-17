import { StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import { AppTheme } from '@/utils/theme';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;

	return {
		...StyleSheet.create({
			cardContent: {
				paddingHorizontal: theme.spacing.md,
				paddingVertical: theme.spacing.md,
			},
			centerContainer: {
				alignItems: 'center',
				flex: 1,
				justifyContent: 'center',
				paddingVertical: theme.spacing['4xl'],
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
				paddingBottom: theme.spacing.xl,
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
			transactionAmount: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.base,
				fontWeight: '700',
				textAlign: 'right',
			},
			transactionCard: {
				marginBottom: theme.spacing.md,
			},
			transactionDate: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.xs,
				marginTop: theme.spacing.xs,
			},
			transactionDetails: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.sm,
				marginTop: 2,
			},
			transactionIcon: {
				margin: 0,
			},
			transactionInfo: {
				flex: 1,
			},
			transactionLeft: {
				alignItems: 'center',
				flexDirection: 'row',
				flex: 1,
			},
			transactionRight: {
				alignItems: 'flex-end',
				justifyContent: 'center',
			},
			transactionRow: {
				flexDirection: 'row',
				justifyContent: 'space-between',
			},
			transactionType: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.base,
				fontWeight: '600',
			},
		}),
		colors: theme.colors,
	};
};