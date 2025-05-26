import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: theme.colors.background,
	},
	container: {
		flex: 1,
	},
	centered: {
		justifyContent: 'center',
		alignItems: 'center',
	},
	scrollContent: {
		flexGrow: 1,
		paddingBottom: 100,
	},
	contentPadding: {
		paddingHorizontal: 20,
		paddingTop: 20,
	},
	
	// Header Section
	headerSection: {
		marginBottom: 24,
	},
	profileHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	profileIcon: {
		marginRight: 12,
	},
	profileTitle: {
		fontSize: 24,
		fontWeight: '700',
		color: theme.colors.onSurface,
	},
	walletAddressContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 4,
	},
	walletAddress: {
		fontSize: 14,
		color: theme.colors.onSurfaceVariant,
		fontWeight: '400',
	},
	copyButton: {
		marginLeft: 4,
		marginTop: -2,
	},
	
	// Portfolio Value Card
	portfolioCard: {
		backgroundColor: theme.colors.surface,
		borderRadius: 20,
		padding: 24,
		marginBottom: 24,
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 4,
	},
	portfolioHeader: {
		marginBottom: 16,
	},
	portfolioTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: theme.colors.onSurface,
		marginBottom: 4,
	},
	portfolioValue: {
		fontSize: 32,
		fontWeight: '700',
		color: theme.colors.onSurface,
		marginBottom: 8,
	},
	portfolioSubtext: {
		fontSize: 14,
		color: theme.colors.onSurfaceVariant,
		marginBottom: 20,
	},
	sendButton: {
		backgroundColor: theme.colors.primary,
		borderRadius: 12,
		paddingVertical: 4,
	},
	sendButtonContent: {
		paddingVertical: 8,
	},
	
	// Tokens Section
	tokensSection: {
		flex: 1,
	},
	tokensHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 16,
	},
	tokensIcon: {
		marginRight: 12,
	},
	tokensTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: theme.colors.onSurface,
	},
	
	// Empty State
	emptyStateContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingVertical: 60,
		paddingHorizontal: 40,
	},
	emptyStateIcon: {
		marginBottom: 16,
		opacity: 0.6,
	},
	emptyStateTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: theme.colors.onSurface,
		marginBottom: 8,
		textAlign: 'center',
	},
	emptyStateText: {
		fontSize: 14,
		color: theme.colors.onSurfaceVariant,
		textAlign: 'center',
		lineHeight: 20,
	},
	
	// No Wallet State
	noWalletContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 40,
	},
	noWalletCard: {
		backgroundColor: theme.colors.surface,
		borderRadius: 20,
		padding: 32,
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 4,
	},
	noWalletIcon: {
		marginBottom: 20,
		opacity: 0.7,
	},
	noWalletTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: theme.colors.onSurface,
		marginBottom: 8,
		textAlign: 'center',
	},
	noWalletText: {
		fontSize: 14,
		color: theme.colors.onSurfaceVariant,
		textAlign: 'center',
		lineHeight: 20,
	},
	
	// Debug button (temporary)
	debugButton: {
		marginTop: 40,
		marginHorizontal: 20,
	},
});
