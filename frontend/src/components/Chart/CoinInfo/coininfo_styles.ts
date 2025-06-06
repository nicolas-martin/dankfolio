import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
	container: {
		gap: 20,
		paddingTop: 8,
	},

	// Volume Section
	volumeSection: {
		borderBottomColor: theme.colors.outlineVariant,
		borderBottomWidth: 1,
		paddingBottom: 16,
	},
	volumeHeader: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 8,
		marginBottom: 12,
	},
	volumeIcon: {
		alignItems: 'center',
		backgroundColor: theme.colors.tertiaryContainer,
		borderRadius: 12,
		height: 24,
		justifyContent: 'center',
		width: 24,
	},
	volumeTitle: {
		color: theme.colors.onSurface,
		fontSize: 16,
		fontWeight: '600',
	},
	volumeValue: {
		color: theme.colors.onSurface,
		fontSize: 24,
		fontWeight: '700',
	},

	// Description Section
	descriptionSection: {
		borderBottomColor: theme.colors.outlineVariant,
		borderBottomWidth: 1,
		paddingBottom: 16,
	},
	descriptionHeader: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 8,
		marginBottom: 12,
	},
	descriptionIcon: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: theme.colors.surfaceVariant, // Generic background
		justifyContent: 'center',
		alignItems: 'center',
	},
	descriptionTitle: {
		color: theme.colors.onSurface,
		fontSize: 16,
		fontWeight: '600',
	},
	descriptionText: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 14,
		lineHeight: 20,
	},

	// Tags Section
	tagsSection: {
		borderBottomColor: theme.colors.outlineVariant,
		borderBottomWidth: 1,
		paddingBottom: 16,
	},
	tagsHeader: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 8,
		marginBottom: 12,
	},
	tagsIcon: {
		alignItems: 'center',
		backgroundColor: theme.colors.secondaryContainer,
		borderRadius: 12,
		height: 24,
		justifyContent: 'center',
		width: 24,
	},
	tagsTitle: {
		color: theme.colors.onSurface,
		fontSize: 16,
		fontWeight: '600',
	},
	tagsContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	tagItem: {
		backgroundColor: theme.colors.surfaceVariant,
		borderColor: theme.colors.outline,
	},

	// Links Section
	linksSection: {
		paddingBottom: 16,
		borderBottomWidth: 1, // Ensure this is present if Date section follows
		borderBottomColor: theme.colors.outlineVariant,
	},
	linksHeader: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 8,
		marginBottom: 12,
	},
	linksIcon: {
		alignItems: 'center',
		backgroundColor: theme.colors.tertiaryContainer,
		borderRadius: 12,
		height: 24,
		justifyContent: 'center',
		width: 24,
	},
	linksTitle: {
		color: theme.colors.onSurface,
		fontSize: 16,
		fontWeight: '600',
	},
	linksContainer: {
		backgroundColor: theme.colors.surfaceVariant,
		borderRadius: 12,
		overflow: 'hidden',
	},

	// Link Item styles
	linkItemContainer: {
		alignItems: 'center',
		backgroundColor: 'transparent',
		flexDirection: 'row',
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
	linkItemIconContainer: {
		alignItems: 'center',
		backgroundColor: theme.colors.surface,
		borderRadius: 16,
		height: 32,
		justifyContent: 'center',
		marginRight: 12,
		width: 32,
	},
	linkItemTextContainer: {
		flex: 1,
	},
	linkItemLabel: {
		color: theme.colors.onSurface,
		fontSize: 16,
		fontWeight: '600',
		marginBottom: 2,
	},
	linkItemValue: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 14,
	},
	divider: {
		backgroundColor: theme.colors.outline,
		height: 1,
		marginHorizontal: 16,
	},

	// Date Section
	dateSection: {
		// No bottom border as it's the last section now
	},
	dateHeader: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 8,
		marginBottom: 12,
	},
	dateIcon: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: theme.colors.surfaceVariant, // Generic background
		justifyContent: 'center',
		alignItems: 'center',
	},
	dateTitle: {
		color: theme.colors.onSurface,
		fontSize: 16,
		fontWeight: '600',
	},
	dateValue: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 14,
		fontWeight: 'normal',
	},

	// Legacy styles for compatibility (kept minimal)
	sectionTitle: {
		color: theme.colors.onSurface,
		fontSize: 18,
		fontWeight: 'bold',
		marginBottom: 8,
	},
	sectionDescription: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 16,
		marginBottom: 16,
	},
	detailRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingVertical: 8,
	},
	detailLabel: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 16,
	},
	detailValue: {
		color: theme.colors.onSurface,
		fontSize: 16,
	},
	tagsLabel: {
		color: theme.colors.onSurfaceVariant,
		marginBottom: 8,
	},
	tagsInnerContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	tagText: {
		color: theme.colors.onSurface,
		fontSize: 14,
	},
});
