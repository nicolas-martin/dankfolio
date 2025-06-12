import { StyleSheet } from 'react-native';
import type { EdgeInsets } from 'react-native-safe-area-context'; // For insets type
import { AppTheme } from '@/utils/theme';

// Renaming to createStyles to match import in index.tsx and accepting insets
export const createStyles = (theme: AppTheme, insets: EdgeInsets) => StyleSheet.create({
	closeButton: {
		marginLeft: theme.spacing.sm,
		padding: theme.spacing.xs,
	},
	content: {
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingRight: theme.spacing.sm,
	},
	message: {
		flex: 1,
		marginLeft: theme.spacing.sm,
	},
	messageContainer: {
		alignItems: 'center',
		flexDirection: 'row',
		flex: 1,
	},
	snackbarStyleBase: { // New style
		borderRadius: theme.spacing.sm,
		marginHorizontal: insets.left + 10, // Use insets, 10 has no exact theme match
	},
	statusIcon: {
		marginRight: theme.spacing.sm,
	},
}); 
