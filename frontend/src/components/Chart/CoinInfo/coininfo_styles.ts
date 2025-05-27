import { StyleSheet, Platform } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
	container: {
		gap: 20,
		paddingTop: 8,
	},

	// Volume Section
	volumeSection: {
		paddingBottom: 16,
		borderBottomWidth: 1,
		borderBottomColor: theme.colors.outlineVariant,
	},
	volumeHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
		gap: 8,
	},
	volumeIcon: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: '#E3F2FD',
		justifyContent: 'center',
		alignItems: 'center',
	},
	volumeTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: theme.colors.onSurface,
	},
	volumeValue: {
		fontSize: 24,
		fontWeight: '700',
		color: theme.colors.onSurface,
	},

	// Tags Section
	tagsSection: {
		paddingBottom: 16,
		borderBottomWidth: 1,
		borderBottomColor: theme.colors.outlineVariant,
	},
	tagsHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
		gap: 8,
	},
	tagsIcon: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: '#F3E5F5',
		justifyContent: 'center',
		alignItems: 'center',
	},
	tagsTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: theme.colors.onSurface,
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
		// No bottom border for last section
	},
	linksHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
		gap: 8,
	},
	linksIcon: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: '#E8F5E8',
		justifyContent: 'center',
		alignItems: 'center',
	},
	linksTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: theme.colors.onSurface,
	},
	linksContainer: {
		backgroundColor: theme.colors.surfaceVariant,
		borderRadius: 12,
		overflow: 'hidden',
	},

	// Link Item styles
	linkItemContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: 'transparent',
	},
	linkItemIconContainer: {
		width: 32,
		height: 32,
		borderRadius: 16,
		marginRight: 12,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: theme.colors.surface,
	},
	linkItemTextContainer: {
		flex: 1,
	},
	linkItemLabel: {
		fontWeight: '600',
		fontSize: 16,
		color: theme.colors.onSurface,
		marginBottom: 2,
	},
	linkItemValue: {
		fontSize: 14,
		color: theme.colors.onSurfaceVariant,
	},
	divider: {
		height: 1,
		backgroundColor: theme.colors.outline,
		marginHorizontal: 16,
	},

	// Legacy styles for compatibility (kept minimal)
	sectionTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		marginBottom: 8,
	},
	sectionDescription: {
		fontSize: 16,
		marginBottom: 16,
	},
	detailRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingVertical: 8,
	},
	detailLabel: {
		fontSize: 16,
	},
	detailValue: {
		fontSize: 16,
	},
	tagsLabel: {
		marginBottom: 8,
	},
	tagsInnerContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	tagText: {
		fontSize: 14,
	},
});
