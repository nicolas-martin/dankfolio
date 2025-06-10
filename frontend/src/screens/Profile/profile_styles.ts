import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';
import { theme as customTheme } from '@utils/theme';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
	centered: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	completedText: {
		color: customTheme.colors.success, // Green color for completed
		fontSize: 12,
		fontWeight: '500',
	},
	connectButton: {
		backgroundColor: theme.colors.primary,
		borderRadius: 12,
		paddingHorizontal: 24,
		paddingVertical: 12,
	},
	connectButtonText: {
		color: theme.colors.onPrimary,
		fontSize: 16,
		fontWeight: '600',
	},
	container: {
		backgroundColor: theme.colors.background,
		flex: 1,
	},
	contentPadding: {
		paddingHorizontal: 20,
		paddingTop: 20,
	},
	copyButton: {
		marginLeft: 4,
		marginTop: -2,
	},
	debugButton: {
		marginHorizontal: 20,
		marginTop: 40,
	},
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
	emptyStateText: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 14,
		lineHeight: 20,
		textAlign: 'center',
	},
	emptyStateTitle: {
		color: theme.colors.onSurface,
		fontSize: 18,
		fontWeight: '600',
		marginBottom: 8,
		textAlign: 'center',
	},
	headerSection: {
		marginBottom: 24,
	},
	loadingIndicator: {
		marginVertical: 30, // More space for loading indicator
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
	noWalletContainer: {
		alignItems: 'center',
		flex: 1,
		justifyContent: 'center',
		paddingHorizontal: 40,
	},
	noWalletIcon: {
		marginBottom: 20,
		opacity: 0.7,
	},
	noWalletText: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 14,
		lineHeight: 20,
		marginBottom: 24,
		textAlign: 'center',
	},
	noWalletTitle: {
		color: theme.colors.onSurface,
		fontSize: 20,
		fontWeight: '600',
		marginBottom: 8,
		textAlign: 'center',
	},
	pendingText: {
		color: customTheme.colors.warning, // Orange color for pending
		fontSize: 12,
		fontWeight: '500',
	},
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
	portfolioSubtext: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 14,
		marginBottom: 20,
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
	profileHeader: { // Properties are already sorted
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	profileIconContainer: {
		alignItems: 'center',
		flexDirection: 'row',
		marginRight: 12,
	},
	profileTitle: {
		color: theme.colors.onSurface,
		fontSize: 24,
		fontWeight: '700',
		marginLeft: 12,
	},
	safeArea: {
		backgroundColor: theme.colors.background,
		flex: 1,
	},
	scrollContent: {
		flexGrow: 1,
		paddingBottom: 100,
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
	settingsButton: {
		marginRight: -8,
	},
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
	tokensHeader: {
		alignItems: 'center',
		flexDirection: 'row',
		marginBottom: 16,
	},
	tokensIcon: {
		marginRight: 12,
	},
	tokensSection: {
		flex: 1,
	},
	tokensTitle: {
		color: theme.colors.onSurface,
		fontSize: 20,
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
		paddingHorizontal: 40,
		paddingVertical: 40,
	},
	transactionIconContainer: {
		alignItems: 'center',
		backgroundColor: theme.colors.surfaceVariant,
		borderRadius: 20,
		height: 40,
		justifyContent: 'center',
		marginRight: 12,
		width: 40,
	},
	transactionInfoContainer: {
		flex: 1,
		justifyContent: 'center',
	},
	transactionItem: {
		borderBottomColor: theme.colors.outlineVariant,
		borderBottomWidth: StyleSheet.hairlineWidth,
		paddingHorizontal: 0,
		paddingVertical: 10,
	},
	transactionStatusTextCompleted: {
		color: customTheme.colors.success, // Green color for completed
		fontSize: 13,
		fontWeight: 'bold',
		marginLeft: 4,
	},
	transactionStatusTextDefault: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 13,
		fontWeight: 'bold',
		marginLeft: 4,
	},
	transactionStatusTextFailed: {
		color: theme.colors.error, // Red for failed
		fontSize: 13,
		fontWeight: 'bold',
		marginLeft: 4,
	},
	transactionStatusTextPending: {
		color: customTheme.colors.warning, // Orange color for pending
		fontSize: 13,
		fontWeight: 'bold',
		marginLeft: 4,
	},
	transactionSubtitleText: {
		alignItems: 'center',
		color: theme.colors.onSurfaceVariant,
		fontSize: 13,
	},
	transactionTitleText: {
		color: theme.colors.onSurface,
		fontSize: 15,
		fontWeight: '500',
		marginBottom: 3,
	},
	transactionsHeader: {
		alignItems: 'center',
		flexDirection: 'row',
		marginBottom: 16,
	},
	transactionsListContainer: {
		// If transactions are in a card, this might have a border or different bg
		// For now, assumes items are directly under header
	},
	transactionsSection: {
		marginTop: 24,
	},
	viewAllButton: {
		alignSelf: 'center',
		marginTop: 12,
	},
	walletAddress: { // Properties are already sorted
		color: theme.colors.onSurfaceVariant,
		fontSize: 14,
		fontWeight: '400',
	},
	walletAddressContainer: {
		alignItems: 'center',
		flexDirection: 'row',
		marginTop: 4,
	},
});
