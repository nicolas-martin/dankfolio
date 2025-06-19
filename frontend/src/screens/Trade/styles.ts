import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';
import { useMemo } from 'react';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;
	return useMemo(() => {
		const colors = theme.colors; // Ensure colors is defined inside useMemo
		const styles = StyleSheet.create({
			actionContainer: {
				padding: theme.spacing.xl,
				paddingTop: 0,
			},
			cardLabel: {
				color: colors.onSurfaceVariant, // Use local colors variable
				fontSize: theme.typography.fontSize.sm,
				fontWeight: '600',
				letterSpacing: 0.5,
				marginBottom: theme.spacing.lg,
				textTransform: 'uppercase',
			},
			container: {
				backgroundColor: theme.colors.background,
				flex: 1,
			},
			content: {
				padding: theme.spacing.xl,
			},
			detailLabel: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.sm,
			},
			detailRow: {
				alignItems: 'center',
				flexDirection: 'row',
				justifyContent: 'space-between',
				marginBottom: theme.spacing.md,
			},
			detailSubLabel: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.xs,
				marginLeft: theme.spacing.sm,
			},
			detailSubValue: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.xs,
				fontWeight: '500',
			},
			detailValue: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.sm,
				fontWeight: '600',
			},
			detailsCard: {
				backgroundColor: theme.colors.surfaceVariant,
				marginBottom: theme.spacing['2xl'],
			},
			detailsContent: {
				paddingTop: 0,
			},
			detailsIcon: {
				alignItems: 'center',
				backgroundColor: theme.colors.primary,
				borderRadius: theme.borderRadius.md,
				height: theme.spacing['2xl'],
				justifyContent: 'center',
				marginRight: theme.spacing.sm,
				width: theme.spacing['2xl'],
			},
			detailsTitle: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.base,
				fontWeight: '600',
			},
			errorContainer: {
				alignItems: 'center',
				backgroundColor: theme.colors.errorContainer,
				borderRadius: theme.borderRadius.md,
				flexDirection: 'row',
				marginBottom: theme.spacing.xl,
				padding: theme.spacing.lg,
			},
			errorIcon: {
				marginRight: theme.spacing.md,
			},
			errorText: {
				color: theme.colors.onErrorContainer,
				flex: 1,
				fontSize: theme.typography.fontSize.sm,
			},
			exchangeRateLabel: {
				alignItems: 'center',
				color: theme.colors.onSurfaceVariant,
				flexDirection: 'row',
				fontSize: theme.typography.fontSize.sm,
			},
			exchangeRateLabelText: {
				marginLeft: theme.spacing.xs,
			},
			exchangeRateRow: {
				alignItems: 'center',
				borderTopColor: theme.colors.outline,
				borderTopWidth: 1,
				flexDirection: 'row',
				justifyContent: 'space-between',
				marginTop: theme.spacing.xs,
				paddingTop: theme.spacing.md,
			},
			exchangeRateValue: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.base,
				fontWeight: '700',
			},
			header: { // Header Section
				alignItems: 'center',
				marginBottom: theme.spacing['3xl'],
			},
			loadingContainer: {
				alignItems: 'center',
				flex: 1,
				justifyContent: 'center',
				padding: theme.spacing.xl,
			},
			loadingText: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.base,
				marginTop: theme.spacing.lg,
				textAlign: 'center',
			},
			noWalletContainer: {
				alignItems: 'center',
				backgroundColor: theme.colors.background,
				flex: 1,
				justifyContent: 'center',
				padding: theme.spacing.xl,
			},
			noWalletText: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.base,
				marginBottom: theme.spacing.xl,
				textAlign: 'center',
			},
			refreshProgressBar: {
				borderRadius: 3, // No exact match
				height: 6, // No exact match
			},
			refreshProgressContainer: {
				backgroundColor: theme.colors.surfaceVariant,
				borderRadius: theme.borderRadius.md,
				marginBottom: theme.spacing.xl,
				padding: theme.spacing.lg,
			},
			refreshProgressHeader: {
				alignItems: 'center',
				flexDirection: 'row',
				marginBottom: theme.spacing.md,
			},
			refreshProgressIcon: {
				marginRight: theme.spacing.sm,
			},
			refreshProgressLabel: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.xs,
				marginTop: theme.spacing.sm,
				textAlign: 'center',
			},
			refreshProgressText: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.sm,
				fontWeight: '500',
			},
			scrollView: {
				flex: 1,
			},
			subtitle: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.base,
				textAlign: 'center',
			},
			swapButton: {
				borderRadius: 22, // No exact match
				height: 44, // No exact match
				width: 44, // No exact match
			},
			swapButtonContainer: {
				alignItems: 'center',
				backgroundColor: theme.colors.background,
				borderColor: theme.colors.background,
				borderRadius: 28, // No exact match
				borderWidth: 2, // No exact match
				elevation: 8, // No exact match
				height: 56, // No exact match
				justifyContent: 'center',
				left: '50%',
				position: 'absolute',
				shadowColor: theme.colors.primary,
				shadowOffset: { width: 0, height: 0 },
				shadowOpacity: 0.3, // No exact match
				shadowRadius: theme.spacing.sm,
				top: -28, // No exact match
				transform: [{ translateX: -28 }], // No exact match
				width: 56, // No exact match
				zIndex: 10, // No exact match
			},
			title: { // Effective definition (was duplicate, using the latter one)
				color: theme.colors.onSurface,
				fontSize: 28, // No exact match
				fontWeight: '700',
				marginBottom: theme.spacing.sm,
				textAlign: 'center',
			},
			toCardContainerStyle: {
				marginTop: -8, // No exact match
				position: 'relative',
			},
			tradeButton: {
				borderRadius: theme.borderRadius.lg,
				elevation: 2, // No exact match
				paddingVertical: theme.spacing.xs,
				shadowColor: '#00FF9F', // Specific color
				shadowOffset: { width: 0, height: 0 },
				shadowOpacity: 0.8, // No exact match
				shadowRadius: theme.spacing.sm,
			},
			tradeButtonContent: {
				paddingVertical: theme.spacing.md,
			},
			tradeButtonLabel: {
				fontSize: theme.typography.fontSize.lg,
				fontWeight: '700',
			},
			tradeCard: {
				backgroundColor: theme.colors.surfaceVariant,
				borderRadius: theme.spacing.xl,
				elevation: 2, // No exact match
				marginBottom: theme.spacing.xl,
				padding: theme.spacing.xl,
				position: 'relative',
				shadowColor: theme.shadows.sm.shadowColor,
				shadowOffset: theme.shadows.md.shadowOffset,
				shadowOpacity: 0.1, // No exact match
				shadowRadius: theme.spacing.sm,
			},
			tradeContainer: { // Trade Cards Container
				marginBottom: theme.spacing['2xl'],
				position: 'relative',
			},
		});

		return {
			...styles,
			colors: theme.colors, // Return original theme.colors for consistency
			theme
		};
	}, [theme]);
};
