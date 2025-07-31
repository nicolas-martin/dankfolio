import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';
import { useMemo } from 'react';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;
	return useMemo(() => {
		const colors = theme.colors; // Ensure colors is defined inside useMemo
		const styles = StyleSheet.create({
			// actionContainer is removed as ScreenActionButton has its own container styling
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
			infoIcon: {
				color: theme.colors.onSurfaceVariant,
			},
			loadingContainer: {
				alignItems: 'center',
				flex: 1,
				justifyContent: 'center',
				paddingVertical: theme.spacing['4xl'],
			},
			loadingText: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.base,
				marginTop: theme.spacing.md,
			},
			noWalletContainer: {
				alignItems: 'center',
				backgroundColor: theme.colors.background,
				flex: 1,
				justifyContent: 'center',
				padding: theme.spacing['2xl'],
			},
			noWalletText: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.base,
				marginTop: theme.spacing.lg,
				textAlign: 'center',
			},
			refreshProgressBar: {
				borderRadius: 3, // No exact match
				height: 6, // No exact match
			},
			refreshProgressContainer: {
				backgroundColor: theme.colors.surface,
				borderRadius: theme.borderRadius.md,
				elevation: 2,
				marginBottom: theme.spacing.xl,
				padding: theme.spacing.lg,
			},
			refreshProgressHeader: {
				alignItems: 'center',
				flexDirection: 'row',
				marginBottom: theme.spacing.sm,
			},
			refreshProgressIcon: {
				marginRight: theme.spacing.sm,
			},
			refreshProgressLabel: {
				color: theme.colors.onSurface,
				flex: 1,
				fontSize: theme.typography.fontSize.sm,
			},
			refreshProgressText: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.xs,
				marginLeft: theme.spacing['3xl'],
			},
			routingCard: {
				backgroundColor: theme.colors.surfaceVariant,
				marginBottom: theme.spacing.xl,
			},
			routingDescription: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.sm,
			},
			routingLabel: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.base,
				fontWeight: '600',
			},
			routingLabelContainer: {
				alignItems: 'center',
				flexDirection: 'row',
				gap: theme.spacing.sm,
			},
			routingRow: {
				alignItems: 'center',
				flexDirection: 'row',
				justifyContent: 'space-between',
			},
			routingTextContainer: {
				flex: 1,
				marginRight: theme.spacing.md,
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
				zIndex: 10, // Restored from -1
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
			// tradeButton, tradeButtonContent, and tradeButtonLabel are removed
			// as ScreenActionButton handles its own styling.
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
