import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) =>
	StyleSheet.create({
		container: {
			alignItems: 'center',
			backgroundColor: theme.colors.background,
			flex: 1,
			justifyContent: 'center',
		},
		loadingText: {
			color: theme.colors.primary,
			fontSize: 18,
			marginTop: 10,
		},
		logo: {
			height: 200,
			marginBottom: 20,
			width: 200,
		},
	}); 
