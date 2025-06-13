import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;
	const colors = theme.colors;
	const styles = StyleSheet.create({
		container: {
			position: 'relative',
		},
		defaultIconButton: {
			padding: 8,
			borderRadius: 8,
			backgroundColor: 'transparent',
			justifyContent: 'center',
			alignItems: 'center',
		},
		checkmarkContainer: {
			position: 'absolute',
			top: 0,
			left: 0,
			right: 0,
			bottom: 0,
			justifyContent: 'center',
			alignItems: 'center',
			backgroundColor: 'rgba(0, 0, 0, 0.1)',
			borderRadius: 8,
		},
		checkmarkIcon: {
			backgroundColor: theme.colors.primary,
			borderRadius: 20,
			padding: 8,
		},
		disabledContainer: {
			opacity: 0.5,
		},
	});
	return {
		...styles,
		colors,
		theme
	};
};
