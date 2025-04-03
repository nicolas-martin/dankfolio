import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
	container: {
		padding: 16,
	},
	// Link Item styles
	linkItemContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
	linkItemIconContainer: {
		width: 32,
		height: 32,
		borderRadius: 999,
		marginRight: 8,
		alignItems: 'center',
		justifyContent: 'center',
	},
	linkItemTextContainer: {
		flex: 1,
	},
	linkItemLabel: {
		fontWeight: '500',
		fontSize: 16,
	},
	linkItemValue: {
		fontSize: 14,
	},
	// Section styles
	sectionTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		marginBottom: 8,
	},
	sectionDescription: {
		fontSize: 16,
		marginBottom: 16,
	},
	// Detail styles
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
	// Tags styles
	tagsContainer: {
		marginTop: 16,
	},
	tagsLabel: {
		marginBottom: 8,
	},
	tagsInnerContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	tagItem: {
		marginRight: 8,
		marginBottom: 8,
	},
	tagText: {
		fontSize: 14,
	},
	// Links section
	linksContainer: {
		borderRadius: 8,
	},
	divider: {
		height: 1,
	},
});
