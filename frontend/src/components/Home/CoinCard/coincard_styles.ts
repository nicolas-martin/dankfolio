import { StyleSheet } from 'react-native';
import { theme } from '../../../utils/theme';

export const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: theme.colors.surface,
		borderRadius: theme.borderRadius.lg,
		padding: theme.spacing.md,
		paddingVertical: theme.spacing.lg,
		marginHorizontal: theme.spacing.sm,
		marginBottom: theme.spacing.sm,
		elevation: 2,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.2,
		shadowRadius: 1.5,
		minHeight: 48,
	},
	leftSection: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 2,
		minWidth: 0,
		paddingRight: theme.spacing.sm,
	},
	rightSection: {
		alignItems: 'flex-end',
		flex: 1,
		marginLeft: theme.spacing.sm,
	},
	nameSection: {
		flex: 1,
		justifyContent: 'center',
		minWidth: 0,
		marginRight: theme.spacing.sm,
	},
	logo: {
		width: 36,
		height: 36,
		borderRadius: 18,
		marginRight: theme.spacing.sm,
		backgroundColor: theme.colors.surface,
	},
	symbol: {
		color: theme.colors.onSurface,
		fontSize: theme.typography.fontSize.base,
		fontWeight: 'bold',
		letterSpacing: 0.5,
	},
	name: {
		color: theme.colors.onSurfaceVariant,
		fontSize: theme.typography.fontSize.sm,
		marginTop: theme.spacing.xs,
		maxWidth: '90%',
		letterSpacing: 0.25,
	},
	price: {
		color: theme.colors.onSurface,
		fontSize: theme.typography.fontSize.base,
		fontWeight: 'bold',
		marginBottom: theme.spacing.xs,
		letterSpacing: 0.5,
	},
	volume: {
		color: theme.colors.onSurfaceVariant,
		fontSize: theme.typography.fontSize.xs,
		marginBottom: theme.spacing.xs,
		letterSpacing: 0.25,
	},
	priceChange: {
		fontSize: theme.typography.fontSize.sm,
		fontWeight: '600',
		letterSpacing: 0.25,
	},
	positive: {
		color: theme.colors.primary,
	},
	negative: {
		color: theme.colors.error,
	},
	card: {
		marginHorizontal: 8,
		marginBottom: 8,
	},
	content: {
		padding: 16,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
});
