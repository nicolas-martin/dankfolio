import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;
	const colors = theme.colors;
	const styles = StyleSheet.create({
		container: {
			alignItems: 'flex-end',
			marginBottom: theme.spacing.xs,
			marginRight: theme.spacing.sm,
			marginTop: theme.spacing.xs,
		},
		link: {
			paddingHorizontal: theme.spacing.xs,
			paddingVertical: 2,
		},
		linkText: {
			color: theme.colors.primary, // blue link color
			fontSize: theme.typography.fontSize.xs,
			textDecorationLine: 'underline',
		},
		statusText: {
			color: theme.colors.onSurfaceVariant, // Was #888
			fontSize: 10,
			marginTop: 2,
		},
	})
	return {
		...styles,
		colors,
		theme
	};
};
