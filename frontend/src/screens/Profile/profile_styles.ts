import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';
import { useMemo } from 'react';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;
	return useMemo(() => {
		const sendButtonStyle = {
			style: {
				backgroundColor: theme.colors.primary,
				borderRadius: theme.borderRadius.md,
				paddingVertical: theme.spacing.xs,
			}
		};
		const refreshControlColors = [theme.colors.primary];
		const noWalletContainerStyle = {
			backgroundColor: theme.colors.background,
			flex: 1,
			alignItems: 'center' as const,
			justifyContent: 'center' as const,
		};
		// const colors = theme.colors; // This variable was unused
		const styles = StyleSheet.create({
			centered: {
				alignItems: 'center',
				justifyContent: 'center',
			},
			completedText: {
				color: theme.success,
				fontSize: theme.typography.fontSize.xs,
				fontWeight: '500',
			},
			connectButton: {
				backgroundColor: theme.colors.primary,
				borderRadius: theme.borderRadius.md,
				paddingHorizontal: theme.spacing['2xl'],
				paddingVertical: theme.spacing.md,
			},
			connectButtonText: {
				color: theme.colors.onPrimary,
				fontSize: theme.typography.fontSize.base,
				fontWeight: '600',
			},
			container: {
				backgroundColor: theme.colors.background,
				flex: 1,
			},
			contentPadding: {
				paddingHorizontal: theme.spacing.xl,
				paddingTop: theme.spacing.xl,
			},
			copyButton: {
				marginLeft: theme.spacing.xs,
				marginTop: -2, // No exact match
			},
			debugButton: {
				marginHorizontal: theme.spacing.xl,
				marginTop: theme.spacing['4xl'],
			},
			debugSection: {
				backgroundColor: theme.colors.surfaceVariant,
				borderColor: theme.colors.outline,
				borderRadius: theme.borderRadius.md,
				borderWidth: 1,
				marginHorizontal: theme.spacing.xl,
				marginTop: theme.spacing.xl,
				paddingHorizontal: theme.spacing.lg,
				paddingVertical: theme.spacing.lg,
			},
			emptyStateContainer: {
				alignItems: 'center',
				flex: 1,
				justifyContent: 'center',
				paddingHorizontal: theme.spacing['4xl'],
				paddingVertical: 60, // No exact match
			},
			emptyStateIcon: {
				marginBottom: theme.spacing.lg,
				opacity: 0.6,
			},
			emptyStateText: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.sm,
				lineHeight: theme.typography.fontSize.xl,
				textAlign: 'center',
			},
			emptyStateTitle: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.lg,
				fontWeight: '600',
				marginBottom: theme.spacing.sm,
				textAlign: 'center',
			},
			headerSection: {
				marginBottom: theme.spacing['2xl'],
			},
			loadingIndicator: {
				marginVertical: 30, // No exact match
			},
			noWalletCard: {
				alignItems: 'center',
				backgroundColor: theme.colors.surface,
				borderRadius: theme.spacing.xl,
				elevation: 4, // No exact match
				padding: theme.spacing['3xl'],
				shadowColor: theme.shadows.sm.shadowColor,
				shadowOffset: theme.shadows.md.shadowOffset,
				shadowOpacity: 0.1, // No exact match
				shadowRadius: theme.spacing.sm,
			},
			noWalletContainer: {
				alignItems: 'center',
				flex: 1,
				justifyContent: 'center',
				paddingHorizontal: theme.spacing['4xl'],
			},
			noWalletIcon: {
				marginBottom: theme.spacing.xl,
				opacity: 0.7,
			},
			noWalletText: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.sm,
				lineHeight: theme.typography.fontSize.xl,
				marginBottom: theme.spacing['2xl'],
				textAlign: 'center',
			},
			noWalletTitle: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.xl,
				fontWeight: '600',
				marginBottom: theme.spacing.sm,
				textAlign: 'center',
			},
			pendingText: {
				color: theme.warning, // Orange color for pending
				fontSize: theme.typography.fontSize.xs,
				fontWeight: '500',
			},
			portfolioCard: {
				backgroundColor: theme.colors.surface,
				borderRadius: theme.spacing.xl,
				elevation: 4, // No exact match
				marginBottom: theme.spacing['2xl'],
				padding: theme.spacing['2xl'],
				shadowColor: theme.shadows.sm.shadowColor,
				shadowOffset: theme.shadows.md.shadowOffset,
				shadowOpacity: 0.1, // No exact match
				shadowRadius: theme.spacing.sm,
			},
			portfolioHeader: {
				marginBottom: theme.spacing.lg,
			},
			portfolioSubtext: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.sm,
				marginBottom: theme.spacing.xl,
			},
			portfolioTitle: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.base,
				fontWeight: '600',
				marginBottom: theme.spacing.xs,
			},
			portfolioValue: {
				color: theme.colors.onSurface,
				fontSize: 32, // No exact match
				fontWeight: '700',
				marginBottom: theme.spacing.sm,
			},
			profileHeader: { // Properties are already sorted
				alignItems: 'center',
				flexDirection: 'row',
				justifyContent: 'space-between',
			},
			profileIconContainer: {
				alignItems: 'center',
				flexDirection: 'row',
				marginRight: theme.spacing.md,
			},
			profileTitle: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize['2xl'],
				fontWeight: '700',
				marginLeft: theme.spacing.md,
			},
			safeArea: {
				backgroundColor: theme.colors.background,
				flex: 1,
			},
			scrollContent: {
				flexGrow: 1,
				paddingBottom: 100, // No exact match
			},
			sendButton: {
				backgroundColor: theme.colors.primary,
				borderRadius: theme.borderRadius.md,
				paddingVertical: theme.spacing.xs,
			},
			sendButtonContent: {
				paddingVertical: theme.spacing.sm,
			},
			sendButtonDisabled: {
				backgroundColor: theme.colors.primary,
				opacity: 0.5,
			},
			sendButtonText: {
				color: theme.colors.onPrimary,
				fontSize: 16,
				fontWeight: '600',
			},
			settingsButton: {
				marginRight: -8, // No exact match
			},
			tabBar: {
				backgroundColor: 'transparent',
			},
			themeToggleContainer: {
				alignItems: 'center',
				backgroundColor: theme.colors.surface,
				borderRadius: theme.spacing.xl,
				elevation: 4, // No exact match
				flexDirection: 'row',
				justifyContent: 'space-between',
				marginBottom: theme.spacing['2xl'],
				padding: theme.spacing.xl,
				shadowColor: theme.shadows.sm.shadowColor,
				shadowOffset: theme.shadows.md.shadowOffset,
				shadowOpacity: 0.1, // No exact match
				shadowRadius: theme.spacing.sm,
			},
			themeToggleHeader: {
				alignItems: 'center',
				flexDirection: 'row',
			},
			themeToggleTitle: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.base,
				fontWeight: '600',
				marginLeft: theme.spacing.md,
			},
			tokensHeader: {
				alignItems: 'center',
				flexDirection: 'row',
				marginBottom: theme.spacing.lg,
			},
			tokensIcon: {
				marginRight: theme.spacing.md,
			},
			tokensSection: {
				flex: 1,
			},
			tokensTitle: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.xl,
				fontWeight: '600',
			},
			transactionDate: { // Style for the date part of subtitle (if styled differently) - now part of transactionSubtitleText
				// fontSize: 13, (already in subtitle)
				// color: theme.colors.onSurfaceVariant, (already in subtitle)
			},
			transactionEmptyStateContainer: {
				alignItems: 'center',
				flex: 1,
				justifyContent: 'center',
				paddingHorizontal: theme.spacing['4xl'],
				paddingVertical: theme.spacing['4xl'],
			},
			transactionIconContainer: {
				alignItems: 'center',
				backgroundColor: theme.colors.surfaceVariant,
				borderRadius: theme.spacing.xl,
				height: theme.spacing['4xl'],
				justifyContent: 'center',
				marginRight: theme.spacing.md,
				width: theme.spacing['4xl'],
			},
			transactionInfoContainer: {
				flex: 1,
				justifyContent: 'center',
			},
			transactionItem: {
				borderBottomColor: theme.colors.outlineVariant,
				borderBottomWidth: StyleSheet.hairlineWidth,
				paddingHorizontal: 0, // No exact match for 0 if it's not a spacing unit
				paddingVertical: 10, // No exact match
			},
			transactionStatusTextCompleted: {
				color: theme.success, // Green color for completed
				fontSize: 13, // No exact match
				fontWeight: 'bold',
				marginLeft: theme.spacing.xs,
			},
			transactionStatusTextDefault: {
				color: theme.colors.onSurfaceVariant,
				fontSize: 13, // No exact match
				fontWeight: 'bold',
				marginLeft: theme.spacing.xs,
			},
			transactionStatusTextFailed: {
				color: theme.colors.error, // Red for failed
				fontSize: 13, // No exact match
				fontWeight: 'bold',
				marginLeft: theme.spacing.xs,
			},
			transactionStatusTextPending: {
				color: theme.warning, // Orange color for pending
				fontSize: 13, // No exact match
				fontWeight: 'bold',
				marginLeft: theme.spacing.xs,
			},
			transactionSubtitleText: {
				alignItems: 'center',
				color: theme.colors.onSurfaceVariant,
				fontSize: 13, // No exact match
			},
			transactionTitleText: {
				color: theme.colors.onSurface,
				fontSize: 15, // No exact match
				fontWeight: '500',
				marginBottom: 3, // No exact match
			},
			transactionsHeader: {
				alignItems: 'center',
				flexDirection: 'row',
				marginBottom: theme.spacing.lg,
			},
			transactionsListContainer: {
				// If transactions are in a card, this might have a border or different bg
				// For now, assumes items are directly under header
			},
			transactionsSection: {
				marginTop: theme.spacing['2xl'],
			},
			viewAllButton: {
				alignSelf: 'center',
				marginTop: theme.spacing.md,
			},
			walletAddress: { // Properties are already sorted
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.sm,
				fontWeight: '400',
			},
			walletAddressContainer: {
				alignItems: 'center',
				flexDirection: 'row',
				marginTop: theme.spacing.xs,
			},
		});
		return {
			...styles,
			colors: theme.colors, // Return original theme.colors for consistency
			theme,
			sendButtonStyle,
			refreshControlColors,
			noWalletContainerStyle
		};
	}, [theme]);
};
