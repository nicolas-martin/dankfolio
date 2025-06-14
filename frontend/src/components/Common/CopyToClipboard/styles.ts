import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;
	const colors = theme.colors;
	const styles = StyleSheet.create({
		defaultIconButton: {
			alignItems: 'center',
			backgroundColor: 'transparent',
			borderRadius: 8,
			justifyContent: 'center',
			padding: 8,
		},
	});
	return {
		...styles,
		colors,
		theme
	};
};
