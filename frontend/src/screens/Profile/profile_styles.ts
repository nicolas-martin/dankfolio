import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';
import { theme as customTheme } from '@utils/theme';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
	safeArea: {
		backgroundColor: theme.colors.background,
		flex: 1,
	},
	container: {
		flex: 1,
	},
	centered: {
		alignItems: 'center',
		justifyContent: 'center',
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
		alignItems: 'center',
		flexDirection: 'row',
		marginBottom: 8,
	},
	profileIcon: {
		marginRight: 12,
	},
	profileTitle: {
		color: theme.colors.onSurface,
		fontSize: 24,
		fontWeight: '700',
	},
	walletAddressContainer: {
		alignItems: 'center',
		flexDirection: 'row',
		marginTop: 4,
	},
	walletAddress: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 14,
		fontWeight: '400',
	},
	copyButton: {
		marginLeft: 4,
		marginTop: -2,
	},

	// Theme Toggle Section
	themeToggleContainer: {
		alignItems: 'center',
		backgroundColor: theme.colors.surface,
		borderRadius: 20,
		elevation: 4,
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 24,
		padding: 20,
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.1,
		shadowRadius: 8,
	},
	themeToggleHeader: {
		alignItems: 'center',
		flexDirection: 'row',
	},
	themeToggleTitle: {
		color: theme.colors.onSurface,
		fontSize: 16,
		fontWeight: '600',
		marginLeft: 12,
	},

	// Portfolio Value Card
	portfolioCard: {
		backgroundColor: theme.colors.surface,
		borderRadius: 20,
		elevation: 4,
		marginBottom: 24,
		padding: 24,
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.1,
		shadowRadius: 8,
	},
	portfolioHeader: {
		marginBottom: 16,
	},
	portfolioTitle: {
		color: theme.colors.onSurface,
		fontSize: 16,
		fontWeight: '600',
		marginBottom: 4,
	},
	portfolioValue: {
		color: theme.colors.onSurface,
		fontSize: 32,
		fontWeight: '700',
		marginBottom: 8,
	},
	portfolioSubtext: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 14,
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
	sendButtonDisabled: {
		backgroundColor: theme.colors.primary,
		opacity: 0.5,
	},

	// Tokens Section
	tokensSection: {
		flex: 1,
	},
	tokensHeader: {
		alignItems: 'center',
		flexDirection: 'row',
		marginBottom: 16,
	},
	tokensIcon: {
		marginRight: 12,
	},
	tokensTitle: {
		color: theme.colors.onSurface,
		fontSize: 20,
		fontWeight: '600',
	},

	// Empty State
	emptyStateContainer: {
		alignItems: 'center',
		flex: 1,
		justifyContent: 'center',
		paddingHorizontal: 40,
		paddingVertical: 60,
	},
	emptyStateIcon: {
		marginBottom: 16,
		opacity: 0.6,
	},
	emptyStateTitle: {
		color: theme.colors.onSurface,
		fontSize: 18,
		fontWeight: '600',
		marginBottom: 8,
		textAlign: 'center',
	},
	emptyStateText: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 14,
		lineHeight: 20,
		textAlign: 'center',
	},

	// No Wallet State
	noWalletContainer: {
		alignItems: 'center',
		flex: 1,
		justifyContent: 'center',
		paddingHorizontal: 40,
	},
	noWalletCard: {
		alignItems: 'center',
		backgroundColor: theme.colors.surface,
		borderRadius: 20,
		elevation: 4,
		padding: 32,
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.1,
		shadowRadius: 8,
	},
	noWalletIcon: {
		marginBottom: 20,
		opacity: 0.7,
	},
	noWalletTitle: {
		color: theme.colors.onSurface,
		fontSize: 20,
		fontWeight: '600',
		marginBottom: 8,
		textAlign: 'center',
	},
	noWalletText: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 14,
		lineHeight: 20,
		textAlign: 'center',
	},

	// Debug button (temporary)
	debugButton: {
		marginHorizontal: 20,
		marginTop: 40,
	},

	// Debug section (development only)
	debugSection: {
		backgroundColor: theme.colors.surfaceVariant,
		borderColor: theme.colors.outline,
		borderRadius: 12,
		borderWidth: 1,
		marginHorizontal: 20,
		marginTop: 20,
		paddingHorizontal: 16,
		paddingVertical: 16,
	},

	// Transactions Section
	transactionsSection: {
		// Consistent with tokensSection margin, or specific if needed
		marginTop: 24,
		// If sections have background/borders, add them here, e.g.:
		// backgroundColor: theme.colors.surface,
		// borderRadius: 12,
		// padding: 16, // If card-like
	},
	transactionsHeader: { // Similar to tokensHeader
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 16, // Spacing before the list starts
		// paddingHorizontal: 16, // If transactionsSection is card-like
	},
	transactionsTitle: { // Similar to tokensTitle
		fontSize: 20,
		fontWeight: '600',
		color: theme.colors.onSurface,
		marginLeft: 12, // Space from icon
	},
	transactionsListContainer: {
		// If transactions are in a card, this might have a border or different bg
		// For now, assumes items are directly under header
	},
	transactionItem: { // For react-native-paper List.Item style prop
		paddingVertical: 10, // Reduced padding
		paddingHorizontal: 0, // List.Item has its own padding, adjust as needed
		borderBottomWidth: StyleSheet.hairlineWidth, // Thinner border
		borderBottomColor: theme.colors.outlineVariant,
		// backgroundColor: theme.colors.surface, // if items have distinct background
		// borderRadius: 8, // if items are card-like
		// marginBottom: 8, // if items are card-like and need spacing
	},
	transactionIconContainer: { // Holds the icon (Swap, Transfer)
		width: 40,
		height: 40,
		borderRadius: 20, // Circular background for icon
		backgroundColor: theme.colors.surfaceVariant, // A subtle background
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12, // Space between icon and text
	},
	// transactionDetails: not directly used by List.Item, but concepts apply to content within
	transactionInfoContainer: { // Replaces transactionTexts, used for title/subtitle block in List.Item
		flex: 1, // Take remaining space
		justifyContent: 'center',
	},
	transactionTitleText: { // For the main description "Swap X for Y"
		fontSize: 15, // Slightly smaller
		fontWeight: '500', // Medium weight
		color: theme.colors.onSurface,
		marginBottom: 3, // Space to subtitle
	},
	transactionSubtitleText: { // For the line with Date and Status
		fontSize: 13,
		color: theme.colors.onSurfaceVariant, // Muted color
		alignItems: 'center',
	},
	transactionDate: { // Style for the date part of subtitle (if styled differently) - now part of transactionSubtitleText
		// fontSize: 13, (already in subtitle)
		// color: theme.colors.onSurfaceVariant, (already in subtitle)
	},
	transactionStatusTextPending: {
		fontSize: 13,
		color: customTheme.colors.warning, // Orange color for pending
		fontWeight: 'bold',
		marginLeft: 4,
	},
	transactionStatusTextCompleted: {
		fontSize: 13,
		color: customTheme.colors.success, // Green color for completed
		fontWeight: 'bold',
		marginLeft: 4,
	},
	transactionStatusTextFailed: {
		fontSize: 13,
		color: theme.colors.error, // Red for failed
		fontWeight: 'bold',
		marginLeft: 4,
	},
	transactionStatusTextDefault: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 13,
		fontWeight: 'bold',
		marginLeft: 4,
	},
	// transactionAmountStatus: not directly used by List.Item's right prop if it's simple text
	// statusDot: Can be used within transactionSubtitleText if preferred over colored text
	loadingIndicator: {
		marginVertical: 30, // More space for loading indicator
	},
	viewAllButton: { // For "View All Transactions"
		marginTop: 12,
		alignSelf: 'center', // Center the button
	},
	// Ensure empty state for transactions is consistent with other empty states
	transactionEmptyStateContainer: { // Specific empty state for transactions
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingVertical: 40,
		paddingHorizontal: 40,
	},
	// Removed transactionDescription, transactionDate as they are now transactionTitleText and part of transactionSubtitleText
	// Removed transactionDetails and transactionTexts as List.Item handles its internal layout
	pendingText: {
		color: customTheme.colors.warning, // Orange color for pending
		fontSize: 12,
		fontWeight: '500',
	},
	completedText: {
		color: customTheme.colors.success, // Green color for completed
		fontSize: 12,
		fontWeight: '500',
	},
});
