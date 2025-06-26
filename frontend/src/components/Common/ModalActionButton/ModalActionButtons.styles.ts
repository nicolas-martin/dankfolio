import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;
	const colors = theme.colors;

	const styles = StyleSheet.create({
		button: {
			borderRadius: theme.borderRadius.lg,
			flex: 1,
			paddingVertical: theme.spacing.xs,
		},
		buttonContainer: {
			flexDirection: 'row',
			gap: theme.spacing.md,
			justifyContent: 'flex-end',
			paddingBottom: theme.spacing.xl,
		},
		primaryButtonLabel: {
			fontSize: theme.typography.fontSize.base,
			fontWeight: '600',
		},
		secondaryButton: {
		},
		secondaryButtonLabel: {
			fontSize: theme.typography.fontSize.base,
			fontWeight: '600',
		},
	})
	return {
		...styles,
		colors,
		theme
	};
};
