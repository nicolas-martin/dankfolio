import { StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';

export const useStyles = () => {
	const theme = useTheme();

	return StyleSheet.create({
		checkmarkContainer: {
			alignItems: 'center',
			backgroundColor: 'rgba(0, 0, 0, 0.1)',
			borderRadius: 8,
			bottom: 0,
			justifyContent: 'center',
			left: 0,
			position: 'absolute',
			right: 0,
			top: 0,
		},
		checkmarkIcon: {
			backgroundColor: theme.colors.primary,
			borderRadius: 20,
			padding: 8,
		},
		container: {
			position: 'relative',
		},
		disabledContainer: {
			opacity: 0.5,
		},
	});
}; 