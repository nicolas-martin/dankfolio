import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
	container: {
		flex: 1,
	},
	chartContainer: {
		height: 400,
		padding: 25,
		position: "relative",
	},
});
