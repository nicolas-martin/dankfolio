import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';
import { AppTheme } from '@/utils/theme';

export const createStyles = (theme: AppTheme) => StyleSheet.create({
	container: {
		gap: theme.spacing.xl,
		paddingTop: theme.spacing.sm,
	},
	dateHeader: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: theme.spacing.sm,
		marginBottom: theme.spacing.md,
	},
	dateIcon: {
		alignItems: 'center', // Sorted
		backgroundColor: theme.colors.surfaceVariant, // Generic background
		borderRadius: theme.borderRadius.md,
		height: theme.spacing['2xl'],
		justifyContent: 'center',
		width: theme.spacing['2xl'],
	},
	dateSection: {
		// No bottom border as it's the last section now
	},
	dateTitle: {
		color: theme.colors.onSurface,
		fontSize: theme.typography.fontSize.base,
		fontWeight: '600',
	},
	dateValue: {
		color: theme.colors.onSurfaceVariant,
		fontSize: theme.typography.fontSize.sm,
		fontWeight: 'normal',
	},
	descriptionHeader: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: theme.spacing.sm,
		marginBottom: theme.spacing.md,
	},
	descriptionIcon: {
		alignItems: 'center', // Sorted
		backgroundColor: theme.colors.surfaceVariant, // Generic background
		borderRadius: theme.borderRadius.md,
		height: theme.spacing['2xl'],
		justifyContent: 'center',
		width: theme.spacing['2xl'],
	},
	descriptionSection: {
		borderBottomColor: theme.colors.outlineVariant,
		borderBottomWidth: 1,
		paddingBottom: theme.spacing.lg,
	},
	descriptionText: {
		color: theme.colors.onSurfaceVariant,
		fontSize: theme.typography.fontSize.sm,
		lineHeight: theme.typography.fontSize.xl,
	},
	descriptionTitle: {
		color: theme.colors.onSurface,
		fontSize: theme.typography.fontSize.base,
		fontWeight: '600',
	},
	detailLabel: {
		color: theme.colors.onSurfaceVariant,
		fontSize: theme.typography.fontSize.base,
	},
	detailRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingVertical: theme.spacing.sm,
	},
	detailValue: { // Properties already sorted
		color: theme.colors.onSurface,
		fontSize: theme.typography.fontSize.base,
	},
	divider: {
		backgroundColor: theme.colors.outline,
		height: 1,
		marginHorizontal: theme.spacing.lg,
	},
	linkItemContainer: {
		alignItems: 'center',
		backgroundColor: 'transparent',
		flexDirection: 'row',
		paddingHorizontal: theme.spacing.lg,
		paddingVertical: theme.spacing.md,
	},
	linkItemIconContainer: {
		alignItems: 'center',
		backgroundColor: theme.colors.surface,
		borderRadius: theme.borderRadius.lg,
		height: theme.spacing['3xl'],
		justifyContent: 'center',
		marginRight: theme.spacing.md,
		width: theme.spacing['3xl'],
	},
	linkItemLabel: {
		color: theme.colors.onSurface,
		fontSize: theme.typography.fontSize.base,
		fontWeight: '600',
		marginBottom: theme.spacing.xs,
	},
	linkItemTextContainer: {
		flex: 1,
	},
	linkItemValue: {
		color: theme.colors.onSurfaceVariant,
		fontSize: theme.typography.fontSize.sm,
	},
	linksContainer: {
		backgroundColor: theme.colors.surfaceVariant,
		borderRadius: theme.borderRadius.md,
		overflow: 'hidden',
	},
	linksHeader: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: theme.spacing.sm,
		marginBottom: theme.spacing.md,
	},
	linksIcon: { // Properties already sorted
		alignItems: 'center',
		backgroundColor: theme.colors.tertiaryContainer,
		borderRadius: theme.borderRadius.md,
		height: theme.spacing['2xl'],
		justifyContent: 'center',
		width: theme.spacing['2xl'],
	},
	linksSection: {
		borderBottomColor: theme.colors.outlineVariant,
		borderBottomWidth: 1, // Ensure this is present if Date section follows
		paddingBottom: theme.spacing.lg,
	},
	linksTitle: {
		color: theme.colors.onSurface,
		fontSize: theme.typography.fontSize.base,
		fontWeight: '600',
	},
	sectionDescription: {
		color: theme.colors.onSurfaceVariant,
		fontSize: theme.typography.fontSize.base,
		marginBottom: theme.spacing.lg,
	},
	sectionTitle: {
		color: theme.colors.onSurface,
		fontSize: theme.typography.fontSize.lg,
		fontWeight: 'bold',
		marginBottom: theme.spacing.sm,
	},
	tagItem: {
		backgroundColor: theme.colors.surfaceVariant,
		borderColor: theme.colors.outline,
	},
	tagText: {
		color: theme.colors.onSurface,
		fontSize: theme.typography.fontSize.sm,
	},
	tagsContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: theme.spacing.sm,
	},
	tagsHeader: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: theme.spacing.sm,
		marginBottom: theme.spacing.md,
	},
	tagsIcon: { // Properties already sorted
		alignItems: 'center',
		backgroundColor: theme.colors.secondaryContainer,
		borderRadius: theme.borderRadius.md,
		height: theme.spacing['2xl'],
		justifyContent: 'center',
		width: theme.spacing['2xl'],
	},
	tagsInnerContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: theme.spacing.sm,
	},
	tagsLabel: {
		color: theme.colors.onSurfaceVariant,
		marginBottom: theme.spacing.sm,
	},
	tagsSection: {
		borderBottomColor: theme.colors.outlineVariant,
		borderBottomWidth: 1,
		paddingBottom: theme.spacing.lg,
	},
	tagsTitle: {
		color: theme.colors.onSurface,
		fontSize: theme.typography.fontSize.base,
		fontWeight: '600',
	},
	volumeHeader: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: theme.spacing.sm,
		marginBottom: theme.spacing.md,
	},
	volumeIcon: { // Properties already sorted
		alignItems: 'center',
		backgroundColor: theme.colors.tertiaryContainer,
		borderRadius: theme.borderRadius.md,
		height: theme.spacing['2xl'],
		justifyContent: 'center',
		width: theme.spacing['2xl'],
	},
	volumeSection: {
		borderBottomColor: theme.colors.outlineVariant,
		borderBottomWidth: 1,
		paddingBottom: theme.spacing.lg,
	},
	volumeTitle: {
		color: theme.colors.onSurface,
		fontSize: theme.typography.fontSize.base,
		fontWeight: '600',
	},
	volumeValue: {
		color: theme.colors.onSurface,
		fontSize: theme.typography.fontSize['2xl'],
		fontWeight: '700',
	},
});
