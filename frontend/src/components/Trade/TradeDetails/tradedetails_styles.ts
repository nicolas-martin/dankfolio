import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme'; // Import AppTheme
import { useTheme } from 'react-native-paper';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;
	const colors = theme.colors;
	const styles = StyleSheet.create({
		container: {
			backgroundColor: theme.colors.background,
			borderRadius: theme.borderRadius.md,
			marginTop: theme.spacing.xl,
			padding: theme.spacing.lg,
		},
		exchangeRate: {
			color: theme.colors.onSurface,
			marginBottom: theme.spacing.sm,
		},
		feeDetail: {
			color: theme.colors.onSurfaceVariant,
			marginBottom: theme.spacing.xs,
		},
	})
	return {
		...styles,
		colors,
		theme
	};
};
