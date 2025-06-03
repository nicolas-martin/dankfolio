import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';
import { theme as customTheme } from '@utils/theme';

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

	// Debug section (development only)
	debugSection: {
		marginTop: 20,
		marginHorizontal: 20,
		paddingVertical: 16,
		paddingHorizontal: 16,
		backgroundColor: theme.colors.surfaceVariant,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: theme.colors.outline,
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
		flexDirection: 'row', // To allow status text to be part of it
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
