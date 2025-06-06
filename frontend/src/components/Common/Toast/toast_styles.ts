import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';
import { EdgeInsets } from 'react-native-safe-area-context';

export const createStyles = (theme: MD3Theme, insets: EdgeInsets) => {
	return StyleSheet.create({
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
}; 
