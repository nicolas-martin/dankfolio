import { StyleSheet } from 'react-native';
import { theme } from '../../../utils/theme';

export const styles = StyleSheet.create({
	container: {
		padding: theme.spacing.lg,
		backgroundColor: theme.colors.surface,
		borderRadius: theme.borderRadius.lg,
		marginTop: theme.spacing.lg,
	},
	section: {
		marginBottom: theme.spacing.xl,
	},
	title: {
		fontSize: theme.typography.fontSize['2xl'],
		fontWeight: 'bold',
		color: theme.colors.onSurface,
		marginBottom: theme.spacing.lg,
	},
	description: {
		fontSize: theme.typography.fontSize.base,
		color: theme.colors.onSurfaceVariant,
		lineHeight: 24,
	},
	detailRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: theme.spacing.md,
	},
	detailLabel: {
		fontSize: theme.typography.fontSize.base,
		color: theme.colors.onSurfaceVariant,
	},
	detailValue: {
		fontSize: theme.typography.fontSize.base,
		color: theme.colors.onSurface,
		fontWeight: '500',
	},
	tagsContainer: {
		marginTop: theme.spacing.md,
	},
	tagsList: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		marginTop: theme.spacing.sm,
		gap: theme.spacing.sm,
	},
	tag: {
		backgroundColor: theme.colors.secondary,
		paddingHorizontal: theme.spacing.md,
		paddingVertical: theme.spacing.sm,
		borderRadius: theme.borderRadius.full,
	},
	tagText: {
		color: theme.colors.onSecondary,
		fontSize: theme.typography.fontSize.sm,
	},
	linkRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: theme.spacing.md,
		paddingVertical: theme.spacing.sm,
	},
	linkLeft: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	icon: {
		width: 24,
		height: 24,
		marginRight: theme.spacing.md,
	},
	linkText: {
		fontSize: theme.typography.fontSize.base,
		color: theme.colors.onSurface,
	},
	linkValue: {
		fontSize: theme.typography.fontSize.base,
		color: theme.colors.onSurfaceVariant,
	},
});
