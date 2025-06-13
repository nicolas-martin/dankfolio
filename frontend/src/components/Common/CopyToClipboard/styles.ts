import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;
	const colors = theme.colors;
	const styles = StyleSheet.create({
		defaultIconButton: {
			padding: 8,
			borderRadius: 8,
			backgroundColor: 'transparent',
			justifyContent: 'center',
			alignItems: 'center',
		},
	});
	return {
		...styles,
		colors,
		theme
	};
};
