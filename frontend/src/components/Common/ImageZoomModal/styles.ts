import { useTheme } from 'react-native-paper';
import { AppTheme } from '@/utils/theme';
import { StyleSheet, Dimensions } from 'react-native';
const { width } = Dimensions.get('window');
const IMAGE_SIZE = width * 0.7;

export const useStyles = () => {
	const theme = useTheme() as AppTheme;
	const colors = theme.colors;
	const styles = StyleSheet.create({
		backdrop: {
			alignItems: 'center',
			backgroundColor: 'rgba(0, 0, 0, 0.3)',
			flex: 1,
			justifyContent: 'center',
		},
		blurContainer: {
			flex: 1,
		},
		container: {
			alignItems: 'center',
			justifyContent: 'center',
		},
		image: {
			borderColor: 'rgba(255, 255, 255, 0.9)',
			borderRadius: IMAGE_SIZE / 2,
			borderWidth: 3,
			height: IMAGE_SIZE,
			width: IMAGE_SIZE,
		},
	})
	return {
		...styles,
		colors,
		theme
	};
};
