import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: theme.colors.background,
			justifyContent: 'center',
			alignItems: 'center',
		},
		logo: {
			width: 200,
			height: 200,
			marginBottom: 20,
		},
		loadingText: {
			color: theme.colors.primary,
			fontSize: 18,
			marginTop: 10,
		},
	}); 
