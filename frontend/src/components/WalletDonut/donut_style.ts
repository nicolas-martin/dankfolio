import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';

export const createDonutStyles = (_theme: AppTheme) => StyleSheet.create({
	chartContainer: {
		height: 400, // No exact match
		padding: 25, // No exact match
		position: "relative",
	},
	container: {
		flex: 1,
	},
});
