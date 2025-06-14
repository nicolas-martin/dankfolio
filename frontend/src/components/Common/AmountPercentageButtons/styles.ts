import { StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import { AppTheme } from '@/utils/theme';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;
	const colors = theme.colors;
	const styles = StyleSheet.create({
		activeButton: {
			backgroundColor: theme.colors.primary,
			elevation: 2,
		},
		activeButtonText: { // New style
			color: colors.onPrimary,
		},
		activeButtonText: { // New style
			color: colors.onPrimary,
		},
		button: {
			alignItems: 'center',
			borderRadius: theme.spacing.sm,
			flex: 1,
			justifyContent: 'center',
			marginHorizontal: theme.spacing.xs,
			paddingHorizontal: theme.spacing.md,
			paddingVertical: theme.spacing.sm,
		},
		container: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			marginTop: theme.spacing.sm,
			paddingHorizontal: theme.spacing.sm,
			paddingVertical: theme.spacing.lg,
		},
		percentageButton: {
			alignItems: 'center',
			backgroundColor: theme.colors.surfaceVariant,
			borderRadius: theme.spacing.sm,
			elevation: 1,
			flex: 1,
			justifyContent: 'center',
			marginHorizontal: theme.spacing.xs,
			paddingHorizontal: theme.spacing.md,
			paddingVertical: theme.spacing.sm,
		},
		percentageButtonText: {
			color: theme.colors.onSurfaceVariant,
			fontSize: theme.typography.fontSize.sm,
			fontWeight: '600',
		},
	});
	return {
		...styles,
		colors,
		theme
	};
};
