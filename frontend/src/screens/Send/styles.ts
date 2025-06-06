import { StyleSheet, Platform } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) =>
	StyleSheet.create({
		container: {
			backgroundColor: theme.colors.background,
			flex: 1,
		},
		scrollView: {
			flex: 1,
		},
		content: {
			paddingBottom: 100,
			paddingHorizontal: 16,
			paddingTop: 16,
		},

		// Token Selection Card
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

		// Amount Selection Card
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
		percentageContainer: {
			flexDirection: 'row',
			gap: 8,
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

		// Recipient Card
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
		recipientTitle: {
			color: theme.colors.onSurface,
			fontSize: 16,
			fontWeight: '600',
		},
		input: {
			backgroundColor: theme.colors.surfaceVariant,
			borderRadius: 12,
			color: theme.colors.onSurface,
			fontFamily: 'monospace',
			fontSize: 16,
			padding: 16,
		},

		// Send Button
		sendButton: {
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

		// Error States
		noWalletContainer: {
			alignItems: 'center',
			flex: 1,
			justifyContent: 'center',
			padding: 20,
		},
		noWalletCard: {
			alignItems: 'center',
			backgroundColor: theme.colors.surface,
			borderRadius: 20,
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
		noWalletTitle: {
			color: theme.colors.onSurface,
			fontSize: 22,
			fontWeight: '700',
			marginBottom: 8,
			marginTop: 16,
			textAlign: 'center',
		},
		noWalletSubtitle: {
			color: theme.colors.onSurfaceVariant,
			fontSize: 16,
			textAlign: 'center',
		},

		// Legacy styles for compatibility
		header: {
			alignItems: 'center',
			marginBottom: 32,
		},
		title: {
			color: theme.colors.onSurface,
			fontSize: 28,
			fontWeight: '700',
			marginBottom: 8,
			textAlign: 'center',
		},
		subtitle: {
			color: theme.colors.onSurfaceVariant,
			fontSize: 16,
			textAlign: 'center',
		},
		tokenCardHeader: {
			alignItems: 'center',
			flexDirection: 'row',
			marginBottom: 16,
		},
		tokenCardIcon: {
			alignItems: 'center',
			backgroundColor: theme.colors.primaryContainer,
			borderRadius: 12,
			height: 24,
			justifyContent: 'center',
			marginRight: 12,
			width: 24,
		},
		tokenCardTitle: {
			color: theme.colors.onSurface,
			flex: 1,
			fontSize: 18,
			fontWeight: '600',
		},
		amountHeader: {
			alignItems: 'center',
			flexDirection: 'row',
			marginBottom: 16,
		},
		amountIcon: {
			alignItems: 'center',
			backgroundColor: theme.colors.secondaryContainer,
			borderRadius: 12,
			height: 24,
			justifyContent: 'center',
			marginRight: 12,
			width: 24,
		},
		amountTitle: {
			color: theme.colors.onSurface,
			flex: 1,
			fontSize: 18,
			fontWeight: '600',
		},
		recipientIcon: {
			alignItems: 'center',
			backgroundColor: theme.colors.tertiaryContainer,
			borderRadius: 12,
			height: 24,
			justifyContent: 'center',
			marginRight: 12,
			width: 24,
		},
		inputContainer: {
			marginBottom: 20,
		},
		label: {
			color: theme.colors.onSurface,
			fontSize: 16,
			marginBottom: 8,
		},
		errorText: {
			color: theme.colors.error,
			fontSize: 14,
			marginTop: 4,
		},
		button: {
			alignItems: 'center',
			backgroundColor: theme.colors.primary,
			borderRadius: 8,
			opacity: 1,
			padding: 16,
		},
		buttonDisabled: {
			opacity: 0.5,
		},
		buttonText: {
			color: theme.colors.onPrimary,
			fontSize: 16,
			fontWeight: 'bold',
		},
		contentPadding: {
			padding: 20,
		},
		amountContainer: {
			alignItems: 'center',
			flexDirection: 'row',
			gap: 8,
		},
		maxButton: {
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
		balanceText: {
			color: theme.colors.onSurfaceVariant,
			fontSize: 12,
			marginTop: 4,
		},

		// Verification Modal Styles
		centeredView: {
			alignItems: 'center',
			backgroundColor: 'rgba(0,0,0,0.5)',
			flex: 1,
			justifyContent: 'center', // Semi-transparent background
		},
		modalView: {
			margin: 20,
			backgroundColor: theme.colors.surface,
			borderRadius: 20,
			padding: 25, // Adjusted padding
			alignItems: 'center',
			shadowColor: '#000',
			shadowOffset: {
				width: 0,
				height: 2,
			},
			shadowOpacity: 0.25,
			shadowRadius: 4,
			elevation: 5,
			width: '85%', // Max width for the modal
		},
		modalText: {
			marginBottom: 20, // Increased margin
			textAlign: 'center',
			fontSize: 16,
			color: theme.colors.onSurface,
			lineHeight: 24,
		},
		verificationModalButton: {
			borderRadius: 12, // Consistent with other buttons
			paddingVertical: 12, // Adjusted padding
			paddingHorizontal: 20, // Adjusted padding
			elevation: 2,
			marginVertical: 8, // Increased margin
			width: '100%', // Full width within modal content
			alignItems: 'center',
			justifyContent: 'center',
		},
		verificationModalButtonLink: {
			backgroundColor: theme.colors.primary, // Use theme color
		},
		verificationModalButtonProceed: {
			backgroundColor: theme.colors.tertiary, // Example: theme.colors.success or a green shade
		},
		verificationModalButtonClose: {
			backgroundColor: theme.colors.error, // Use theme color
		},
		verificationModalButtonText: {
			color: theme.colors.onError, // Ensure contrast, or use theme.colors.onPrimary for link
			fontSize: 16,
			fontWeight: '600', // Consistent with other button texts
			textAlign: 'center',
		},
		verificationModalLinkButtonText: {
			color: theme.colors.onPrimary, // Specific for link button if background is primary
			fontSize: 16,
			fontWeight: '600',
			textAlign: 'center',
		},
		verificationModalProceedButtonText: {
			color: theme.colors.onTertiary, // Specific for proceed button
			fontSize: 16,
			fontWeight: '600',
			textAlign: 'center',
		}
	}); 
