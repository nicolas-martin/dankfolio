import { StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import { AppTheme } from '@/utils/theme';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;

	const styles = StyleSheet.create({
		buttonContainer: {
			marginTop: theme.spacing.sm,
			width: '100%',
		},
		buttonText: {
			...theme.fonts.labelLarge,
			color: theme.colors.onPrimary,
			fontWeight: '600',
		},
		container: {
			backgroundColor: theme.colors.surface,
			borderRadius: theme.borderRadius.lg,
			elevation: 8,
			margin: theme.spacing.lg,
			maxWidth: 400,
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 4 },
			shadowOpacity: 0.25,
			shadowRadius: 8,
			width: '90%',
		},
		content: {
			alignItems: 'center',
			padding: theme.spacing.xl,
		},
		debugContainer: {
			backgroundColor: theme.colors.surfaceVariant,
			borderRadius: theme.borderRadius.sm,
			marginTop: theme.spacing.lg,
			padding: theme.spacing.md,
			width: '100%',
		},
		debugText: {
			...theme.fonts.labelSmall,
			color: theme.colors.onSurfaceVariant,
			fontFamily: 'monospace',
			textAlign: 'center',
		},
		description: {
			...theme.fonts.bodyMedium,
			color: theme.colors.onSurfaceVariant,
			lineHeight: 20,
			marginBottom: theme.spacing.xl,
			textAlign: 'center',
		},
		devButton: {
			alignItems: 'center',
			backgroundColor: theme.colors.tertiary,
			borderRadius: theme.borderRadius.md,
			justifyContent: 'center',
			marginTop: theme.spacing.sm,
			paddingHorizontal: theme.spacing.md,
			paddingVertical: theme.spacing.sm,
		},
		devButtonText: {
			...theme.fonts.labelMedium,
			color: theme.colors.onTertiary,
			fontWeight: '500',
		},
		dismissButton: {
			marginTop: theme.spacing.xs,
		},
		dismissButtonText: {
			...theme.fonts.labelMedium,
			color: theme.colors.onSurfaceVariant,
		},
		iconContainer: {
			alignItems: 'center',
			justifyContent: 'center',
			marginBottom: theme.spacing.lg,
		},
		message: {
			...theme.fonts.bodyLarge,
			color: theme.colors.error,
			lineHeight: 22,
			marginBottom: theme.spacing.md,
			textAlign: 'center',
		},
		overlay: {
			alignItems: 'center',
			backgroundColor: 'rgba(0, 0, 0, 0.8)',
			flex: 1,
			justifyContent: 'center',
		},
		retryButton: {
			alignItems: 'center',
			backgroundColor: theme.colors.primary,
			borderRadius: theme.borderRadius.lg,
			justifyContent: 'center',
			paddingHorizontal: theme.spacing.lg,
			paddingVertical: theme.spacing.md,
		},
		title: {
			...theme.fonts.headlineSmall,
			color: theme.colors.onSurface,
			fontWeight: '600',
			marginBottom: theme.spacing.md,
			textAlign: 'center',
		},
	});

	return {
		...styles,
		colors: theme.colors,
	};
};
