import { StyleSheet, Platform } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: theme.colors.background,
		},
		scrollView: {
			flex: 1,
		},
		content: {
			paddingHorizontal: 16,
			paddingTop: 16,
			paddingBottom: 100,
		},

		// Token Selection Card
		tokenCard: {
			backgroundColor: theme.colors.surface,
			borderRadius: 16,
			padding: 20,
			marginBottom: 12,
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
			padding: 16,
			marginBottom: 12,
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
			backgroundColor: theme.colors.surfaceVariant,
			paddingHorizontal: 12,
			paddingVertical: 10,
			borderRadius: 8,
			flex: 1,
			alignItems: 'center',
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
			padding: 20,
			marginBottom: 20,
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
			flexDirection: 'row',
			alignItems: 'center',
			marginBottom: 12,
			gap: 8,
		},
		recipientTitle: {
			fontSize: 16,
			fontWeight: '600',
			color: theme.colors.onSurface,
		},
		input: {
			backgroundColor: theme.colors.surfaceVariant,
			padding: 16,
			borderRadius: 12,
			color: theme.colors.onSurface,
			fontSize: 16,
			fontFamily: 'monospace',
		},

		// Send Button
		sendButton: {
			backgroundColor: theme.colors.primary,
			borderRadius: 12,
			paddingVertical: 16,
			paddingHorizontal: 24,
			alignItems: 'center',
			marginHorizontal: 16,
			flexDirection: 'row',
			justifyContent: 'center',
			gap: 8,
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
			flex: 1,
			justifyContent: 'center',
			alignItems: 'center',
			padding: 20,
		},
		noWalletCard: {
			backgroundColor: theme.colors.surface,
			borderRadius: 20,
			padding: 32,
			alignItems: 'center',
			width: '90%',
			maxWidth: 320,
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
			fontSize: 22,
			fontWeight: '700',
			color: theme.colors.onSurface,
			textAlign: 'center',
			marginTop: 16,
			marginBottom: 8,
		},
		noWalletSubtitle: {
			fontSize: 16,
			color: theme.colors.onSurfaceVariant,
			textAlign: 'center',
		},

		// Legacy styles for compatibility
		header: {
			alignItems: 'center',
			marginBottom: 32,
		},
		title: {
			fontSize: 28,
			fontWeight: '700',
			color: theme.colors.onSurface,
			textAlign: 'center',
			marginBottom: 8,
		},
		subtitle: {
			fontSize: 16,
			color: theme.colors.onSurfaceVariant,
			textAlign: 'center',
		},
		tokenCardHeader: {
			flexDirection: 'row',
			alignItems: 'center',
			marginBottom: 16,
		},
		tokenCardIcon: {
			width: 24,
			height: 24,
			borderRadius: 12,
			backgroundColor: theme.colors.primaryContainer,
			marginRight: 12,
			justifyContent: 'center',
			alignItems: 'center',
		},
		tokenCardTitle: {
			fontSize: 18,
			fontWeight: '600',
			color: theme.colors.onSurface,
			flex: 1,
		},
		amountHeader: {
			flexDirection: 'row',
			alignItems: 'center',
			marginBottom: 16,
		},
		amountIcon: {
			width: 24,
			height: 24,
			borderRadius: 12,
			backgroundColor: theme.colors.secondaryContainer,
			marginRight: 12,
			justifyContent: 'center',
			alignItems: 'center',
		},
		amountTitle: {
			fontSize: 18,
			fontWeight: '600',
			color: theme.colors.onSurface,
			flex: 1,
		},
		recipientIcon: {
			width: 24,
			height: 24,
			borderRadius: 12,
			backgroundColor: theme.colors.tertiaryContainer,
			marginRight: 12,
			justifyContent: 'center',
			alignItems: 'center',
		},
		inputContainer: {
			marginBottom: 20,
		},
		label: {
			fontSize: 16,
			color: theme.colors.onSurface,
			marginBottom: 8,
		},
		errorText: {
			color: theme.colors.error,
			fontSize: 14,
			marginTop: 4,
		},
		button: {
			backgroundColor: theme.colors.primary,
			padding: 16,
			borderRadius: 8,
			alignItems: 'center',
			opacity: 1,
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
			flexDirection: 'row',
			alignItems: 'center',
			gap: 8,
		},
		maxButton: {
			backgroundColor: theme.colors.primaryContainer,
			paddingHorizontal: 12,
			paddingVertical: 8,
			borderRadius: 8,
			justifyContent: 'center',
		},
		maxButtonText: {
			color: theme.colors.onPrimaryContainer,
			fontSize: 14,
			fontWeight: '600',
		},
		balanceText: {
			fontSize: 12,
			color: theme.colors.onSurfaceVariant,
			marginTop: 4,
		},

		// Verification Modal Styles
		centeredView: {
			flex: 1,
			justifyContent: 'center',
			alignItems: 'center',
			backgroundColor: 'rgba(0,0,0,0.5)', // Semi-transparent background
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
