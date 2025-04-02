import { StyleSheet } from 'react-native';
import { theme } from '../../../utils/theme';

export const styles = StyleSheet.create({
	container: {
		marginBottom: theme.spacing.xl,
	},
	label: {
		color: theme.colors.onSurfaceVariant,
		marginBottom: theme.spacing.sm,
	},
	coinSelector: {
		backgroundColor: theme.colors.background,
		borderRadius: theme.borderRadius.md,
		padding: theme.spacing.lg,
		marginBottom: theme.spacing.sm,
	},
	coinContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	leftSection: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	coinIcon: {
		width: 30,
		height: 30,
		borderRadius: 15,
		marginRight: theme.spacing.sm,
	},
	coinInfo: {
		flex: 1,
	},
	coinSymbol: {
		color: theme.colors.onSurface,
		fontWeight: 'bold',
		fontSize: theme.typography.fontSize.base,
	},
	coinName: {
		color: theme.colors.onSurfaceVariant,
		fontSize: theme.typography.fontSize.sm,
	},
	balanceSection: {
		alignItems: 'flex-end',
	},
	balanceText: {
		color: theme.colors.onSurface,
		fontSize: theme.typography.fontSize.sm,
		fontWeight: '600',
	},
	valueText: {
		color: theme.colors.onSurfaceVariant,
		fontSize: theme.typography.fontSize.xs,
		marginTop: 2,
	},
	placeholderText: {
		color: theme.colors.onSurfaceVariant,
	},
	amountInput: {
		backgroundColor: theme.colors.background,
		borderRadius: theme.borderRadius.md,
		padding: theme.spacing.lg,
		color: theme.colors.onSurface,
		fontSize: theme.typography.fontSize.xl,
		textAlign: 'right',
	},
	toAmountContainer: {
		flex: 1,
		alignItems: 'flex-end',
	},
	toAmount: {
		fontSize: 24,
		fontWeight: 'bold',
		color: theme.colors.text,
	},
	valueHintContainer: {
		marginTop: 4,
		alignItems: 'flex-end',
	},
	approxValueText: {
		fontSize: 14,
		color: theme.colors.textSecondary,
	},
	rateText: {
		fontSize: 12,
		color: theme.colors.textSecondary,
	},
});
