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

	// Sparkline chart colors using theme trend colors with transparency preserved
	const sparklineColors = {
		green: {
			opaque: `${theme.trend.positive}80`, // 50% opacity using theme positive trend color
			transparent: `${theme.trend.positive}20`, // 12.5% opacity using theme positive trend color
		},
		red: {
			opaque: `${theme.trend.negative}80`, // 50% opacity using theme negative trend color
			transparent: `${theme.trend.negative}20`, // 12.5% opacity using theme negative trend color
		},
	};

	return {
		...styles,
		colors,
		theme,
		sparklineColors
	};
};
