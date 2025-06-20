import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;
	const colors = theme.colors;
	
	const styles = StyleSheet.create({
		accordionContainer: {
			backgroundColor: 'transparent',
			borderRadius: theme.borderRadius.sm,
			marginHorizontal: 0,
			paddingHorizontal: 0,
		},
		accordionDescription: {
			color: theme.colors.onSurfaceVariant,
			fontSize: 12,
		},
		accordionTitle: {
			color: theme.colors.onSurface,
			fontSize: 14,
			fontWeight: '600',
		},
		card: {
			backgroundColor: theme.colors.surface,
			borderRadius: theme.borderRadius.md,
			marginBottom: theme.spacing.md,
		},
		container: {
			backgroundColor: theme.colors.background,
			flex: 1,
		},
		debugButton: {
			marginTop: theme.spacing.md,
		},
		debugText: {
			color: theme.colors.onSurface,
			fontSize: 14,
			marginBottom: theme.spacing.xs,
		},
		feeBreakdownItem: {
			color: theme.colors.onSurfaceVariant,
			fontSize: 12,
		},
		helpText: {
			color: theme.colors.onSurfaceVariant,
			fontSize: 11,
			fontStyle: 'italic',
			opacity: 0.8,
		},
		listItemTitle: {
			color: theme.colors.onSurface,
			fontSize: 14,
		},
		scrollView: {
			flex: 1,
			paddingHorizontal: theme.spacing.lg,
		},
		title: {
			color: theme.colors.onBackground,
			fontWeight: 'bold',
			marginBottom: theme.spacing.lg,
			marginTop: theme.spacing.lg,
			textAlign: 'center',
		},
	});

	return {
		...styles,
		colors,
		theme
	};
};