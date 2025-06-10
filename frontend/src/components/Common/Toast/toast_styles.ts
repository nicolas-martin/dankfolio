import { StyleSheet } from 'react-native';

export const createToastStyles = () => StyleSheet.create({
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
	statusIcon: {
		marginRight: 8,
	},
}); 
