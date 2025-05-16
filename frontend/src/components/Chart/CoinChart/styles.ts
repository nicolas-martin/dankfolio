import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
	chartContainer: {
		height: 250,
	},
	loadingContainer: {
		height: 250,
		justifyContent: 'center',
		alignItems: 'center',
	},
});
