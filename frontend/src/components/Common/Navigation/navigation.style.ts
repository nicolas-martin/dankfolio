import { Platform, StyleSheet } from 'react-native'; // Added StyleSheet
import { useTheme } from 'react-native-paper';
import { AppTheme } from '@/utils/theme';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;
	const colors = theme.colors;
	const styles = StyleSheet.create({
		bottomNavBar: {
			backgroundColor: theme.colors.surface,
			borderTopWidth: 0,
			height: Platform.select({
				ios: 88,
				android: 80,
			}),
		},
		shadowOffset: {
			height: -2, width: 0
		},
	});
	return {
		...styles,
		colors,
		theme,
	};
};
