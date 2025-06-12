import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';

export const useStyle = () => {
	const theme = useTheme() as AppTheme;
	const colors = theme.colors;
	const styles = StyleSheet.create({
		container: {
			alignItems: 'center',
			backgroundColor: theme.colors.background,
			flex: 1,
			justifyContent: 'center',
		},
		loadingText: {
			color: theme.colors.primary,
			fontSize: theme.typography.fontSize.lg,
			marginTop: 10, // No exact match
		},
		logo: {
			height: 200, // No exact match
			marginBottom: theme.spacing.xl,
			width: 200, // No exact match
		},
	})
	return {
		...styles,
		colors,
		theme
	};
};
