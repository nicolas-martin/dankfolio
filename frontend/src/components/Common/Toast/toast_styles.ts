import { StyleSheet } from 'react-native';
import type { EdgeInsets } from 'react-native-safe-area-context'; // For insets type

// Renaming to createStyles to match import in index.tsx and accepting insets
export const createStyles = (insets: EdgeInsets) => StyleSheet.create({
	closeButton: {
		marginLeft: 8,
		padding: 4,
	},
	content: {
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingRight: 8,
	},
	message: {
		flex: 1,
		marginLeft: 8,
	},
	messageContainer: {
		alignItems: 'center',
		flexDirection: 'row',
		flex: 1,
	},
	snackbarStyleBase: { // New style
		borderRadius: 8,
		marginHorizontal: insets.left + 10, // Use insets
	},
	statusIcon: {
		marginRight: 8,
	},
}); 
