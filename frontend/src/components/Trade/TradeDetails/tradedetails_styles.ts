import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme'; // Import AppTheme

export const createStyles = (theme: AppTheme) => StyleSheet.create({
	container: {
		backgroundColor: theme.colors.background,
		borderRadius: theme.borderRadius.md,
		marginTop: theme.spacing.xl,
		padding: theme.spacing.lg,
	},
	exchangeRate: {
		color: theme.colors.text,
		marginBottom: theme.spacing.sm,
	},
	feeDetail: {
		color: theme.colors.textSecondary,
		marginBottom: theme.spacing.xs,
	},
});
