import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
		backgroundColor: theme.colors.background,
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 30,
		color: theme.colors.onBackground,
	},
	mnemonicInput: {
		height: 100,
		width: '100%',
		borderColor: theme.colors.outline,
		borderWidth: 1,
		borderRadius: 5,
		padding: 10,
		marginBottom: 15,
		textAlignVertical: 'top',
		color: theme.colors.onSurface,
		backgroundColor: theme.colors.surface,
	},
	errorText: {
		color: theme.colors.error,
		marginBottom: 15,
		textAlign: 'center',
	},
	orText: {
		marginVertical: 20,
		fontSize: 16,
		color: theme.colors.onSurfaceVariant,
	},
}); 