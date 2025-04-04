import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
	container: {
		padding: 16,
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	icon: {
		width: 32,
		height: 32,
		borderRadius: 16,
	},
	nameText: {
		marginLeft: 8,
	},
	priceText: {
		marginBottom: 8,
	},
	changeRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	changeText: {},
	periodText: {
		marginLeft: 4,
	},
});
