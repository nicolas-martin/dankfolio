import { StyleSheet, Platform } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) =>
	StyleSheet.create({
		amountCard: {
			backgroundColor: theme.colors.surface,
			borderRadius: 16,
			marginBottom: 12,
			padding: 16,
			...Platform.select({
				ios: {
					shadowColor: '#000',
					shadowOffset: { width: 0, height: 2 },
					shadowOpacity: 0.1,
					shadowRadius: 8,
				},
				android: {
					elevation: 4,
				},
			}),
		},
		amountContainer: { // Legacy
			alignItems: 'center',
			flexDirection: 'row',
			gap: 8,
		},
		amountHeader: { // Legacy
			alignItems: 'center',
			flexDirection: 'row',
			marginBottom: 16,
		},
		amountIcon: { // Legacy
			alignItems: 'center',
			backgroundColor: theme.colors.secondaryContainer,
			borderRadius: 12,
			height: 24,
			justifyContent: 'center',
			marginRight: 12,
			width: 24,
		},
		amountTitle: { // Legacy
			color: theme.colors.onSurface,
			flex: 1,
			fontSize: 18,
			fontWeight: '600',
		},
		balanceText: {
			color: theme.colors.onSurfaceVariant,
			fontSize: 12,
			marginTop: 4,
		},
		button: { // Legacy
			alignItems: 'center',
			backgroundColor: theme.colors.primary,
			borderRadius: 8,
			opacity: 1,
			padding: 16,
		},
		buttonDisabled: { // Legacy
			opacity: 0.5,
		},
		buttonText: { // Legacy
			color: theme.colors.onPrimary,
			fontSize: 16,
			fontWeight: 'bold',
		},
		centeredView: { // For Verification Modal
			alignItems: 'center',
			backgroundColor: 'rgba(0,0,0,0.5)',
			flex: 1,
			justifyContent: 'center',
		},
		content: {
			paddingBottom: 100,
			paddingHorizontal: 16,
			paddingTop: 16,
		},
		contentPadding: { // Legacy
			padding: 20,
		},
		container: {
			backgroundColor: theme.colors.background,
			flex: 1,
		},
		errorContainer: {
			alignItems: 'center',
			backgroundColor: theme.colors.errorContainer,
			borderRadius: 12,
			flexDirection: 'row',
			gap: 8,
			marginBottom: 16,
			marginHorizontal: 16,
			paddingHorizontal: 16,
			paddingVertical: 12,
		},
		errorText: {
			color: theme.colors.onErrorContainer,
			flex: 1,
			fontSize: 14,
			fontWeight: '500',
		},
		header: { // Legacy
			alignItems: 'center',
			marginBottom: 32,
		},
		input: {
			backgroundColor: theme.colors.surfaceVariant,
			borderRadius: 12,
			color: theme.colors.onSurface,
			fontFamily: 'monospace',
			fontSize: 16,
			padding: 16,
		},
		inputContainer: { // Legacy
			marginBottom: 20,
		},
		label: { // Legacy
			color: theme.colors.onSurface,
			fontSize: 16,
			marginBottom: 8,
		},
		maxButton: { // Properties are already sorted
			backgroundColor: theme.colors.primaryContainer,
			borderRadius: 8,
			justifyContent: 'center',
			paddingHorizontal: 12,
			paddingVertical: 8,
		},
		maxButtonText: {
			color: theme.colors.onPrimaryContainer,
			fontSize: 14,
			fontWeight: '600',
		},
		modalText: { // For Verification Modal
			marginBottom: 20,
			textAlign: 'center',
			fontSize: 16,
			color: theme.colors.onSurface,
			lineHeight: 24,
		},
		modalView: { // For Verification Modal
			margin: 20,
			backgroundColor: theme.colors.surface,
			borderRadius: 20,
			padding: 25,
			alignItems: 'center',
			shadowColor: '#000',
			shadowOffset: {
				width: 0,
				height: 2,
			},
			shadowOpacity: 0.25,
			shadowRadius: 4,
			elevation: 5,
			width: '85%',
		},
		noWalletCard: {
			alignItems: 'center',
			backgroundColor: theme.colors.surface,
			borderRadius: 20,
			elevation: 4,
			maxWidth: 320,
			padding: 32,
			width: '90%',
			...Platform.select({
				ios: {
					shadowColor: '#000',
					shadowOffset: { width: 0, height: 4 },
					shadowOpacity: 0.15,
					shadowRadius: 12,
				},
				android: {
					elevation: 6,
				},
			}),
		},
		noWalletContainer: {
			alignItems: 'center',
			flex: 1,
			justifyContent: 'center',
			padding: 20,
		},
		noWalletIcon: {
			marginBottom: 20,
			opacity: 0.7,
		},
		noWalletSubtitle: {
			color: theme.colors.onSurfaceVariant,
			fontSize: 16,
			textAlign: 'center',
		},
		noWalletTitle: {
			color: theme.colors.onSurface,
			fontSize: 22,
			fontWeight: '700',
			marginBottom: 8,
			marginTop: 16,
			textAlign: 'center',
		},
		percentageButton: {
			alignItems: 'center',
			backgroundColor: theme.colors.surfaceVariant,
			borderRadius: 8,
			flex: 1,
			paddingHorizontal: 12,
			paddingVertical: 10,
		},
		percentageButtonText: {
			color: theme.colors.onSurfaceVariant,
			fontSize: 14,
			fontWeight: '600',
		},
		percentageContainer: {
			flexDirection: 'row',
			gap: 8,
		},
		recipientCard: {
			backgroundColor: theme.colors.surface,
			borderRadius: 16,
			marginBottom: 20,
			padding: 20,
			...Platform.select({
				ios: {
					shadowColor: '#000',
					shadowOffset: { width: 0, height: 2 },
					shadowOpacity: 0.1,
					shadowRadius: 8,
				},
				android: {
					elevation: 4,
				},
			}),
		},
		recipientHeader: {
			alignItems: 'center',
			flexDirection: 'row',
			gap: 8,
			marginBottom: 12,
		},
		recipientIcon: { // Legacy
			alignItems: 'center',
			backgroundColor: theme.colors.tertiaryContainer,
			borderRadius: 12,
			height: 24,
			justifyContent: 'center',
			marginRight: 12,
			width: 24,
		},
		recipientTitle: {
			color: theme.colors.onSurface,
			fontSize: 16,
			fontWeight: '600',
		},
		scrollView: {
			flex: 1,
		},
		sendButton: { // Properties are already sorted
			alignItems: 'center',
			backgroundColor: theme.colors.primary,
			borderRadius: 12,
			flexDirection: 'row',
			gap: 8,
			justifyContent: 'center',
			marginHorizontal: 16,
			paddingHorizontal: 24,
			paddingVertical: 16,
			...Platform.select({
				ios: {
					shadowColor: '#000',
					shadowOffset: { width: 0, height: 2 },
					shadowOpacity: 0.15,
					shadowRadius: 8,
				},
				android: {
					elevation: 6,
				},
			}),
		},
		sendButtonDisabled: {
			opacity: 0.6,
		},
		sendButtonText: {
			color: theme.colors.onPrimary,
			fontSize: 16,
			fontWeight: '600',
		},
		subtitle: { // Legacy
			color: theme.colors.onSurfaceVariant,
			fontSize: 16,
			textAlign: 'center',
		},
		title: { // Legacy
			color: theme.colors.onSurface,
			fontSize: 28,
			fontWeight: '700',
			marginBottom: 8,
			textAlign: 'center',
		},
		tokenCard: {
			backgroundColor: theme.colors.surface,
			borderRadius: 16,
			marginBottom: 12,
			padding: 20,
			...Platform.select({
				ios: {
					shadowColor: '#000',
					shadowOffset: { width: 0, height: 2 },
					shadowOpacity: 0.1,
					shadowRadius: 8,
				},
				android: {
					elevation: 4,
				},
			}),
		},
		tokenCardHeader: { // Legacy
			alignItems: 'center',
			flexDirection: 'row',
			marginBottom: 16,
		},
		tokenCardIcon: { // Legacy
			alignItems: 'center',
			backgroundColor: theme.colors.primaryContainer,
			borderRadius: 12,
			height: 24,
			justifyContent: 'center',
			marginRight: 12,
			width: 24,
		},
		tokenCardTitle: { // Legacy
			color: theme.colors.onSurface,
			flex: 1,
			fontSize: 18,
			fontWeight: '600',
		},
		verificationActions: {
			flexDirection: 'row',
			gap: 12,
		},
		verificationButton: {
			alignItems: 'center',
			borderRadius: 12,
			flex: 1,
			justifyContent: 'center',
			paddingHorizontal: 16,
			paddingVertical: 12,
		},
		verificationButtonCancel: {
			backgroundColor: theme.colors.surfaceVariant,
		},
		verificationButtonCancelText: {
			color: theme.colors.onSurfaceVariant,
			fontSize: 14,
			fontWeight: '600',
		},
		verificationButtonContinue: {
			backgroundColor: theme.colors.primary,
		},
		verificationButtonContinueText: {
			color: theme.colors.onPrimary,
			fontSize: 14,
			fontWeight: '600',
		},
		verificationCard: {
			backgroundColor: theme.colors.surface,
			borderRadius: 16,
			marginBottom: 16,
			padding: 20,
			...Platform.select({
				ios: {
					shadowColor: '#000',
					shadowOffset: { width: 0, height: 2 },
					shadowOpacity: 0.1,
					shadowRadius: 8,
				},
				android: {
					elevation: 4,
				},
			}),
		},
		verificationCardError: {
			borderLeftColor: theme.colors.error,
			borderLeftWidth: 4,
		},
		verificationCardInfo: {
			borderLeftColor: theme.colors.onSurfaceVariant,
			borderLeftWidth: 4,
		},
		verificationCardSuccess: {
			borderLeftColor: theme.colors.primary,
			borderLeftWidth: 4,
		},
		verificationCardWarning: {
			borderLeftColor: theme.colors.tertiary,
			borderLeftWidth: 4,
		},
		verificationHeader: {
			alignItems: 'center',
			flexDirection: 'row',
			gap: 8,
			marginBottom: 12,
		},
		verificationMessage: {
			color: theme.colors.onSurface,
			fontSize: 14,
			lineHeight: 20,
			marginBottom: 16,
		},
		verificationModalButton: { // For Verification Modal (old)
			borderRadius: 12,
			paddingVertical: 12,
			paddingHorizontal: 20,
			elevation: 2,
			marginVertical: 8,
			width: '100%',
			alignItems: 'center',
			justifyContent: 'center',
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
			fontSize: 16,
			fontWeight: '600',
			textAlign: 'center',
		},
		verificationModalLinkButtonText: { // For Verification Modal (old)
			color: theme.colors.onPrimary,
			fontSize: 16,
			fontWeight: '600',
			textAlign: 'center',
		},
		verificationModalProceedButtonText: { // For Verification Modal (old)
			color: theme.colors.onTertiary,
			fontSize: 16,
			fontWeight: '600',
			textAlign: 'center',
		},
		verificationTitle: {
			color: theme.colors.onSurface,
			fontSize: 16,
			fontWeight: '600',
		},
	});
