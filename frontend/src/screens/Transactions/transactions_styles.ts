import { StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';

export const useStyles = () => {
	const theme = useTheme();
	const colors = theme.colors;

	return StyleSheet.create({
		safeArea: {
			flex: 1,
			backgroundColor: colors.background,
		},
		container: {
			flex: 1,
			backgroundColor: colors.background,
		},
		listWrapper: {
			flex: 1,
			backgroundColor: colors.surface,
			borderRadius: theme.borderRadius.lg,
			elevation: 2,
			marginBottom: theme.spacing.lg,
			marginHorizontal: theme.spacing.lg,
			overflow: 'hidden',
			shadowColor: theme.shadows.sm.shadowColor,
			shadowOffset: theme.shadows.sm.shadowOffset,
			shadowOpacity: 0.08,
			shadowRadius: theme.spacing.xs,
		},
		colors: colors,
	} as const);
};