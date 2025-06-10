import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
	container: {
		gap: 20,
		paddingTop: 8,
	},
	dateHeader: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 8,
		marginBottom: 12,
	},
	dateIcon: {
		alignItems: 'center', // Sorted
		backgroundColor: theme.colors.surfaceVariant, // Generic background
		borderRadius: 12,
		height: 24,
		justifyContent: 'center',
		width: 24,
	},
	dateSection: {
		// No bottom border as it's the last section now
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
	descriptionHeader: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 8,
		marginBottom: 12,
	},
	descriptionIcon: {
		alignItems: 'center', // Sorted
		backgroundColor: theme.colors.surfaceVariant, // Generic background
		borderRadius: 12,
		height: 24,
		justifyContent: 'center',
		width: 24,
	},
	descriptionSection: {
		borderBottomColor: theme.colors.outlineVariant,
		borderBottomWidth: 1,
		paddingBottom: 16,
	},
	descriptionText: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 14,
		lineHeight: 20,
	},
	descriptionTitle: {
		color: theme.colors.onSurface,
		fontSize: 16,
		fontWeight: '600',
	},
	detailLabel: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 16,
	},
	detailRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingVertical: 8,
	},
	detailValue: { // Properties already sorted
		color: theme.colors.onSurface,
		fontSize: 16,
	},
	divider: {
		backgroundColor: theme.colors.outline,
		height: 1,
		marginHorizontal: 16,
	},
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
	linkItemLabel: {
		color: theme.colors.onSurface,
		fontSize: 16,
		fontWeight: '600',
		marginBottom: 2,
	},
	linkItemTextContainer: {
		flex: 1,
	},
	linkItemValue: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 14,
	},
	linksContainer: {
		backgroundColor: theme.colors.surfaceVariant,
		borderRadius: 12,
		overflow: 'hidden',
	},
	linksHeader: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 8,
		marginBottom: 12,
	},
	linksIcon: { // Properties already sorted
		alignItems: 'center',
		backgroundColor: theme.colors.tertiaryContainer,
		borderRadius: 12,
		height: 24,
		justifyContent: 'center',
		width: 24,
	},
	linksSection: {
		borderBottomColor: theme.colors.outlineVariant,
		borderBottomWidth: 1, // Ensure this is present if Date section follows
		paddingBottom: 16,
	},
	linksTitle: {
		color: theme.colors.onSurface,
		fontSize: 16,
		fontWeight: '600',
	},
	sectionDescription: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 16,
		marginBottom: 16,
	},
	sectionTitle: {
		color: theme.colors.onSurface,
		fontSize: 18,
		fontWeight: 'bold',
		marginBottom: 8,
	},
	tagItem: {
		backgroundColor: theme.colors.surfaceVariant,
		borderColor: theme.colors.outline,
	},
	tagText: {
		color: theme.colors.onSurface,
		fontSize: 14,
	},
	tagsContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	tagsHeader: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 8,
		marginBottom: 12,
	},
	tagsIcon: { // Properties already sorted
		alignItems: 'center',
		backgroundColor: theme.colors.secondaryContainer,
		borderRadius: 12,
		height: 24,
		justifyContent: 'center',
		width: 24,
	},
	tagsInnerContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	tagsLabel: {
		color: theme.colors.onSurfaceVariant,
		marginBottom: 8,
	},
	tagsSection: {
		borderBottomColor: theme.colors.outlineVariant,
		borderBottomWidth: 1,
		paddingBottom: 16,
	},
	tagsTitle: {
		color: theme.colors.onSurface,
		fontSize: 16,
		fontWeight: '600',
	},
	volumeHeader: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 8,
		marginBottom: 12,
	},
	volumeIcon: { // Properties already sorted
		alignItems: 'center',
		backgroundColor: theme.colors.tertiaryContainer,
		borderRadius: 12,
		height: 24,
		justifyContent: 'center',
		width: 24,
	},
	volumeSection: {
		borderBottomColor: theme.colors.outlineVariant,
		borderBottomWidth: 1,
		paddingBottom: 16,
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
});
