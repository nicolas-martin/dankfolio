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
		// New styles for comprehensive fee breakdown
		feeBreakdownContainer: {
			marginTop: theme.spacing.sm,
			marginBottom: theme.spacing.sm,
		},
		totalFeeHeader: {
			color: theme.colors.onSurface,
			fontWeight: '600',
			marginBottom: theme.spacing.sm,
		},
		feeBreakdownDetails: {
			marginLeft: theme.spacing.sm,
			marginBottom: theme.spacing.xs,
		},
		feeBreakdownItem: {
			color: theme.colors.onSurfaceVariant,
			marginBottom: theme.spacing.xs,
			fontSize: 12,
		},
		majorCostItem: {
			color: theme.colors.primary,
			fontWeight: '500',
		},
		helpText: {
			color: theme.colors.onSurfaceVariant,
			fontSize: 11,
			fontStyle: 'italic',
			marginTop: theme.spacing.xs,
			opacity: 0.8,
		},
	})
	return {
		...styles,
		colors,
		theme
	};
};
