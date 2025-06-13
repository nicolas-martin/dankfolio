import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;
	const colors = theme.colors;
	const styles = StyleSheet.create({
		center: {
			alignItems: 'center',
			justifyContent: 'center',
		},
		container: {
			backgroundColor: 'transparent',
			flex: 1,
			overflow: 'hidden',
		},
	})

	// Sparkline chart colors using theme colors with transparency preserved
	const sparklineColors = {
		green: {
			opaque: `${theme.colors.primary}4D`, // 30% opacity using theme primary color
			transparent: `${theme.colors.primary}00`, // Fully transparent using theme primary color
		},
		red: {
			opaque: `${theme.colors.error}4D`, // 30% opacity using theme error color
			transparent: `${theme.colors.error}00`, // Fully transparent using theme error color
		},
	};

	return {
		...styles,
		colors,
		theme,
		sparklineColors
	};
};
