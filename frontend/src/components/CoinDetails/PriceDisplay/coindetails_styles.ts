import { StyleSheet } from 'react-native';
import { theme } from '../../../utils/theme';

export const styles = StyleSheet.create({
	container: {
		paddingHorizontal: theme.spacing.lg,
		paddingVertical: theme.spacing.md,
		alignItems: 'flex-start',
	},
	topRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: theme.spacing.sm,
	},
	changeRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	icon: {
		width: 40,
		height: 40,
		borderRadius: 20,
		marginRight: theme.spacing.sm,
		backgroundColor: theme.colors.topBar,
	},
	name: {
		fontSize: theme.typography.fontSize.base,
		color: theme.colors.textSecondary,
		fontWeight: '500',
	},
	price: {
		fontSize: theme.typography.fontSize['3xl'],
		fontWeight: 'bold',
		color: theme.colors.text,
		marginBottom: theme.spacing.xs,
	},
	change: {
		fontSize: theme.typography.fontSize.base,
		fontWeight: '500',
	},
	period: {
		fontSize: theme.typography.fontSize.base,
		color: theme.colors.textSecondary,
		fontWeight: '500',
	},
	positiveChange: {
		color: theme.colors.success,
		backgroundColor: 'rgba(0, 200, 5, 0.1)',
		paddingHorizontal: theme.spacing.sm,
		paddingVertical: theme.spacing.xs,
		borderRadius: theme.borderRadius.sm,
	},
	negativeChange: {
		color: theme.colors.error,
		backgroundColor: 'rgba(255, 75, 75, 0.1)',
		paddingHorizontal: theme.spacing.sm,
		paddingVertical: theme.spacing.xs,
		borderRadius: theme.borderRadius.sm,
	},
});
