import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme'; // Assuming AppTheme is your extended theme type
import { useTheme } from 'react-native-paper';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;
	return StyleSheet.create({
		container: {
			alignItems: 'center',
			flex: 1,
			justifyContent: 'center',
			padding: theme.spacing.lg,
		},
		errorMessage: {
			color: theme.colors.error,
			fontSize: theme.typography.fontSize.base,
			lineHeight: theme.typography.fontSize.lg * 1.2,
			textAlign: 'center',
		},
		errorText: {
			color: theme.colors.error,
		},
		errorTitle: {
			color: theme.colors.error,
			fontSize: theme.typography.fontSize.xl,
			fontWeight: 'bold',
			marginBottom: theme.spacing.sm,
			textAlign: 'center',
		},
		iconContainer: {
			marginBottom: theme.spacing.md,
		},
		message: {
			color: theme.colors.onSurfaceVariant,
			fontSize: theme.typography.fontSize.base,
			lineHeight: theme.typography.fontSize.lg * 1.2,
			textAlign: 'center',
		},
		title: {
			color: theme.colors.onSurface,
			fontSize: theme.typography.fontSize.xl,
			fontWeight: 'bold',
			marginBottom: theme.spacing.sm,
			textAlign: 'center',
		}
	});
};
