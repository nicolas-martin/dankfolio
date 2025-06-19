import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme'; // Import AppTheme
import { useTheme } from 'react-native-paper';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;
	const colors = theme.colors;
	const styles = StyleSheet.create({
		// Accordion styles
		accordionContainer: {
			backgroundColor: 'transparent',
			marginHorizontal: 0,
			paddingHorizontal: 0,
			borderRadius: theme.borderRadius.sm,
		},
		accordionDescription: {
			color: theme.colors.onSurfaceVariant,
			fontSize: 12,
		},
		accordionIcon: {
			marginLeft: 0,
		},
		accordionTitle: {
			color: theme.colors.onSurface,
			fontSize: 14,
			fontWeight: '600',
		},
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
		feeBreakdownContainer: {
			marginBottom: theme.spacing.sm,
			marginTop: theme.spacing.sm,
		},
		feeBreakdownDetails: {
			marginBottom: theme.spacing.xs,
			marginLeft: theme.spacing.sm,
		},
		feeBreakdownItem: {
			color: theme.colors.onSurfaceVariant,
			fontSize: 12,
			marginBottom: theme.spacing.xs,
		},
		feeDetail: {
			color: theme.colors.onSurfaceVariant,
			marginBottom: theme.spacing.xs,
		},
		helpText: {
			color: theme.colors.onSurfaceVariant,
			fontSize: 11,
			fontStyle: 'italic',
			marginTop: theme.spacing.xs,
			opacity: 0.8,
		},
		listItemStyle: {
			paddingHorizontal: 0,
			paddingVertical: theme.spacing.xs,
		},
		majorCostItem: {
			color: theme.colors.primary,
			fontWeight: '500',
		},
		totalFeeHeader: {
			color: theme.colors.onSurface,
			fontWeight: '600',
			marginBottom: theme.spacing.sm,
		},
	})
	return {
		...styles,
		colors,
		theme
	};
};
