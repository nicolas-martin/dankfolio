import { Platform } from 'react-native';
import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';
import { useMemo } from 'react';

export const useStyle = () => {
	const theme = useTheme() as AppTheme;
	return useMemo(() => {
		// Memoized style functions
		const getSendButtonStyle = (isLoading: boolean) => {
			return isLoading ? [styles.sendButton, styles.sendButtonDisabled].flat() : styles.sendButton;
		};
		const getVerificationCancelButtonStyle = () => {
			return [styles.verificationButton, styles.verificationButtonCancel].flat()
		};
		const getVerificationContinueButtonStyle = () => {
			return [styles.verificationButton, styles.verificationButtonContinue].flat()
		};
		const colors = theme.colors; // Ensure colors is defined inside useMemo
		const styles = StyleSheet.create({
			amountCard: {
				backgroundColor: colors.surface, // Use local colors variable
				borderRadius: theme.borderRadius.lg, // 16
				marginBottom: theme.spacing.md, // 12
				padding: theme.spacing.lg, // 16
				...Platform.select({
					ios: {
						shadowColor: theme.shadows.sm.shadowColor,
						shadowOffset: theme.shadows.md.shadowOffset, // {0,2}
						shadowOpacity: 0.1, // No exact match
						shadowRadius: theme.spacing.sm, // 8
					},
					android: {
						elevation: 4, // No exact match
					},
				}),
			},
			amountContainer: { // Legacy
				alignItems: 'center',
				flexDirection: 'row',
				gap: theme.spacing.sm, // 8
			},
			amountHeader: { // Legacy
				alignItems: 'center',
				flexDirection: 'row',
				marginBottom: theme.spacing.lg, // 16
			},
			amountIcon: { // Legacy
				alignItems: 'center',
				backgroundColor: theme.colors.secondaryContainer,
				borderRadius: theme.borderRadius.md, // 12
				height: theme.spacing['2xl'], // 24
				justifyContent: 'center',
				marginRight: theme.spacing.md, // 12
				width: theme.spacing['2xl'], // 24
			},
			amountTitle: { // Legacy
				color: theme.colors.onSurface,
				flex: 1,
				fontSize: theme.typography.fontSize.lg, // 18
				fontWeight: '600',
			},
			balanceText: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.xs, // 12
				marginTop: theme.spacing.xs, // 4
			},
			button: { // Legacy
				alignItems: 'center',
				backgroundColor: theme.colors.primary,
				borderRadius: theme.spacing.sm, // 8
				opacity: 1,
				padding: theme.spacing.lg, // 16
			},
			buttonDisabled: { // Legacy
				opacity: 0.5,
			},
			buttonText: { // Legacy
				color: theme.colors.onPrimary,
				fontSize: theme.typography.fontSize.base, // 16
				fontWeight: 'bold',
			},
			centeredView: { // For Verification Modal
				alignItems: 'center',
				backgroundColor: theme.colors.backdrop, // 'rgba(0,0,0,0.5)'
				flex: 1,
				justifyContent: 'center',
			},
			container: {
				backgroundColor: theme.colors.background,
				flex: 1,
			},
			content: {
				paddingBottom: 100, // No exact match
				paddingHorizontal: theme.spacing.lg, // 16
				paddingTop: theme.spacing.lg, // 16
			},
			contentPadding: { // Legacy
				padding: theme.spacing.xl, // 20
			},
			errorContainer: {
				alignItems: 'center',
				backgroundColor: theme.colors.errorContainer,
				borderRadius: theme.borderRadius.md, // 12
				flexDirection: 'row',
				gap: theme.spacing.sm, // 8
				marginBottom: theme.spacing.lg, // 16
				marginHorizontal: theme.spacing.lg, // 16
				paddingHorizontal: theme.spacing.lg, // 16
				paddingVertical: theme.spacing.md, // 12
			},
			errorText: {
				color: theme.colors.onErrorContainer,
				flex: 1,
				fontSize: theme.typography.fontSize.sm, // 14
				fontWeight: '500',
			},
			header: { // Legacy
				alignItems: 'center',
				marginBottom: theme.spacing['3xl'], // 32
			},
			input: {
				backgroundColor: theme.colors.surfaceVariant,
				borderRadius: theme.borderRadius.md, // 12
				color: theme.colors.onSurface,
				fontFamily: 'monospace',
				fontSize: theme.typography.fontSize.base, // 16
				padding: theme.spacing.lg, // 16
			},
			inputContainer: { // Legacy
				marginBottom: theme.spacing.xl, // 20
			},
			label: { // Legacy
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.base, // 16
				marginBottom: theme.spacing.sm, // 8
			},
			maxButton: { // Properties are already sorted
				backgroundColor: theme.colors.primaryContainer,
				borderRadius: theme.spacing.sm, // 8
				justifyContent: 'center',
				paddingHorizontal: theme.spacing.md, // 12
				paddingVertical: theme.spacing.sm, // 8
			},
			maxButtonText: {
				color: theme.colors.onPrimaryContainer,
				fontSize: theme.typography.fontSize.sm, // 14
				fontWeight: '600',
			},
			modalText: { // For Verification Modal
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.base, // 16
				lineHeight: theme.typography.fontSize['2xl'], // 24
				marginBottom: theme.spacing.xl, // 20
				textAlign: 'center',
			},
			modalView: { // For Verification Modal
				alignItems: 'center',
				backgroundColor: theme.colors.surface,
				borderRadius: theme.spacing.xl, // 20
				elevation: theme.shadows.md.elevation, // 5
				margin: theme.spacing.xl, // 20
				padding: 25, // No exact match
				shadowColor: theme.shadows.sm.shadowColor,
				shadowOffset: theme.shadows.md.shadowOffset, // {0,2}
				shadowOpacity: theme.shadows.md.shadowOpacity, // 0.25
				shadowRadius: theme.spacing.xs, // 4
				width: '85%',
			},
			noWalletCard: {
				alignItems: 'center',
				backgroundColor: theme.colors.surface,
				borderRadius: theme.spacing.xl, // 20
				elevation: 4, // No exact match
				maxWidth: 320, // No exact match
				padding: theme.spacing['3xl'], // 32
				width: '90%',
				...Platform.select({
					ios: {
						shadowColor: theme.shadows.sm.shadowColor,
						shadowOffset: { width: 0, height: 4 }, // No exact match
						shadowOpacity: 0.15, // No exact match
						shadowRadius: theme.spacing.md, // 12
					},
					android: {
						elevation: 6, // No exact match
					},
				}),
			},
			noWalletContainer: {
				alignItems: 'center',
				flex: 1,
				justifyContent: 'center',
				padding: theme.spacing.xl, // 20
			},
			noWalletIcon: {
				marginBottom: theme.spacing.xl, // 20
				opacity: 0.7,
			},
			noWalletSubtitle: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.base, // 16
				textAlign: 'center',
			},
			noWalletTitle: {
				color: theme.colors.onSurface,
				fontSize: 22, // No exact match
				fontWeight: '700',
				marginBottom: theme.spacing.sm, // 8
				marginTop: theme.spacing.lg, // 16
				textAlign: 'center',
			},
			percentageButton: {
				alignItems: 'center',
				backgroundColor: theme.colors.surfaceVariant,
				borderRadius: theme.spacing.sm, // 8
				flex: 1,
				paddingHorizontal: theme.spacing.md, // 12
				paddingVertical: 10, // No exact match
			},
			percentageButtonText: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.sm, // 14
				fontWeight: '600',
			},
			percentageContainer: {
				flexDirection: 'row',
				gap: theme.spacing.sm, // 8
			},
			recipientCard: {
				backgroundColor: theme.colors.surface,
				borderRadius: theme.borderRadius.lg, // 16
				marginBottom: theme.spacing.xl, // 20
				padding: theme.spacing.xl, // 20
				...Platform.select({
					ios: {
						shadowColor: theme.shadows.sm.shadowColor,
						shadowOffset: theme.shadows.md.shadowOffset, // {0,2}
						shadowOpacity: 0.1, // No exact match
						shadowRadius: theme.spacing.sm, // 8
					},
					android: {
						elevation: 4, // No exact match
					},
				}),
			},
			recipientHeader: {
				alignItems: 'center',
				flexDirection: 'row',
				gap: theme.spacing.sm, // 8
				marginBottom: theme.spacing.md, // 12
			},
			recipientIcon: { // Legacy
				alignItems: 'center',
				backgroundColor: theme.colors.tertiaryContainer,
				borderRadius: theme.borderRadius.md, // 12
				height: theme.spacing['2xl'], // 24
				justifyContent: 'center',
				marginRight: theme.spacing.md, // 12
				width: theme.spacing['2xl'], // 24
			},
			recipientTitle: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.base, // 16
				fontWeight: '600',
			},
			scrollView: {
				flex: 1,
			},
			sendButton: { // Properties are already sorted
				alignItems: 'center',
				backgroundColor: theme.colors.primary,
				borderRadius: theme.borderRadius.md, // 12
				flexDirection: 'row',
				gap: theme.spacing.sm, // 8
				justifyContent: 'center',
				marginHorizontal: theme.spacing.lg, // 16
				paddingHorizontal: theme.spacing['2xl'], // 24
				paddingVertical: theme.spacing.lg, // 16
				...Platform.select({
					ios: {
						shadowColor: theme.shadows.sm.shadowColor,
						shadowOffset: theme.shadows.md.shadowOffset, // {0,2}
						shadowOpacity: 0.15, // No exact match
						shadowRadius: theme.spacing.sm, // 8
					},
					android: {
						elevation: 6, // No exact match
					},
				}),
			},
			sendButtonDisabled: {
				opacity: 0.6,
			},
			sendButtonText: {
				color: theme.colors.onPrimary,
				fontSize: theme.typography.fontSize.base, // 16
				fontWeight: '600',
			},
			subtitle: { // Legacy
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.base, // 16
				textAlign: 'center',
			},
			title: { // Legacy
				color: theme.colors.onSurface,
				fontSize: 28, // No exact match
				fontWeight: '700',
				marginBottom: theme.spacing.sm, // 8
				textAlign: 'center',
			},
			tokenCard: {
				backgroundColor: theme.colors.surface,
				borderRadius: theme.borderRadius.lg, // 16
				marginBottom: theme.spacing.md, // 12
				padding: theme.spacing.xl, // 20
				...Platform.select({
					ios: {
						shadowColor: theme.shadows.sm.shadowColor,
						shadowOffset: theme.shadows.md.shadowOffset, // {0,2}
						shadowOpacity: 0.1, // No exact match
						shadowRadius: theme.spacing.sm, // 8
					},
					android: {
						elevation: 4, // No exact match
					},
				}),
			},
			tokenCardHeader: { // Legacy
				alignItems: 'center',
				flexDirection: 'row',
				marginBottom: theme.spacing.lg, // 16
			},
			tokenCardIcon: { // Legacy
				alignItems: 'center',
				backgroundColor: theme.colors.primaryContainer,
				borderRadius: theme.borderRadius.md, // 12
				height: theme.spacing['2xl'], // 24
				justifyContent: 'center',
				marginRight: theme.spacing.md, // 12
				width: theme.spacing['2xl'], // 24
			},
			tokenCardTitle: { // Legacy
				color: theme.colors.onSurface,
				flex: 1,
				fontSize: theme.typography.fontSize.lg, // 18
				fontWeight: '600',
			},
			verificationContainer: {
				marginBottom: theme.spacing['2xl'], // 24
			},
			verificationActions: {
				flexDirection: 'row',
				gap: theme.spacing.md, // 12
				marginTop: theme.spacing.lg, // 16
			},
			verificationButton: {
				alignItems: 'center',
				borderRadius: theme.borderRadius.md, // 12
				flex: 1,
				justifyContent: 'center',
				paddingHorizontal: theme.spacing.lg, // 16
				paddingVertical: theme.spacing.md, // 12
			},
			verificationButtonCancel: {
				backgroundColor: theme.colors.surfaceVariant,
			},
			verificationButtonCancelText: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.sm, // 14
				fontWeight: '600',
			},
			verificationButtonContinue: {
				backgroundColor: theme.colors.primary,
			},
			verificationButtonContinueText: {
				color: theme.colors.onPrimary,
				fontSize: theme.typography.fontSize.sm, // 14
				fontWeight: '600',
			},
			verificationDismissButton: {
				alignItems: 'center',
				backgroundColor: theme.colors.surfaceVariant,
				borderRadius: theme.borderRadius.full,
				height: 40,
				justifyContent: 'center',
				width: 40,
			},
			verificationCard: {
				backgroundColor: theme.colors.surface,
				borderRadius: theme.borderRadius.lg, // 16
				marginBottom: theme.spacing.lg, // 16
				padding: theme.spacing.xl, // 20
				...Platform.select({
					ios: {
						shadowColor: theme.shadows.sm.shadowColor,
						shadowOffset: theme.shadows.md.shadowOffset, // {0,2}
						shadowOpacity: 0.1, // No exact match
						shadowRadius: theme.spacing.sm, // 8
					},
					android: {
						elevation: 4, // No exact match
					},
				}),
			},
			verificationCardError: {
				borderLeftColor: theme.colors.error,
				borderLeftWidth: theme.spacing.xs, // 4
			},
			verificationCardInfo: {
				borderLeftColor: theme.colors.onSurfaceVariant,
				borderLeftWidth: theme.spacing.xs, // 4
			},
			verificationCardSuccess: {
				borderLeftColor: theme.colors.primary,
				borderLeftWidth: theme.spacing.xs, // 4
			},
			verificationCardWarning: {
				borderLeftColor: theme.colors.tertiary,
				borderLeftWidth: theme.spacing.xs, // 4
			},
			verificationHeader: {
				alignItems: 'center',
				flexDirection: 'row',
				gap: theme.spacing.sm, // 8
				marginBottom: theme.spacing.md, // 12
			},
			verificationMessage: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.sm, // 14
				lineHeight: theme.typography.fontSize.xl, // 20
				marginBottom: theme.spacing.lg, // 16
			},
			verificationModalButton: { // For Verification Modal (old)
				alignItems: 'center',
				borderRadius: theme.borderRadius.md, // 12
				elevation: 2, // No exact match
				justifyContent: 'center',
				marginVertical: theme.spacing.sm, // 8
				paddingHorizontal: theme.spacing.xl, // 20
				paddingVertical: theme.spacing.md, // 12
				width: '100%',
			},
			verificationModalButtonClose: { // For Verification Modal (old)
				backgroundColor: theme.colors.error,
			},
			verificationModalButtonLink: { // For Verification Modal (old)
				backgroundColor: theme.colors.primary,
			},
			verificationModalButtonProceed: { // For Verification Modal (old)
				backgroundColor: theme.colors.tertiary,
			},
			verificationModalButtonText: { // For Verification Modal (old)
				color: theme.colors.onError,
				fontSize: theme.typography.fontSize.base, // 16
				fontWeight: '600',
				textAlign: 'center',
			},
			verificationModalLinkButtonText: { // For Verification Modal (old)
				color: theme.colors.onPrimary,
				fontSize: theme.typography.fontSize.base, // 16
				fontWeight: '600',
				textAlign: 'center',
			},
			verificationModalProceedButtonText: { // For Verification Modal (old)
				color: theme.colors.onTertiary,
				fontSize: theme.typography.fontSize.base, // 16
				fontWeight: '600',
				textAlign: 'center',
			},
			verificationTitle: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.base, // 16
				fontWeight: '600',
			},
		});

		return {
			...styles,
			colors: theme.colors, // Return original theme.colors for consistency
			theme,
			getSendButtonStyle,
			getVerificationCancelButtonStyle,
			getVerificationContinueButtonStyle,
		};
	}, [theme]);
};
