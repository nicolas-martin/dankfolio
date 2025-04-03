import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper'; // Assuming MD3Theme is needed

// Copied from index.tsx
export const createStyles = (theme: MD3Theme) => StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: theme.colors.background,
	},
	noWalletContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: theme.colors.background,
	},
	padding: {
		padding: 16,
	},
	valueInfoContainer: {
		marginVertical: 8,
	},
	keyboardAvoidingView: {
		flex: 1,
	},
	scrollView: {
		flex: 1,
	},
}); 