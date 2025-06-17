import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/types/navigation';
import { Coin } from '@/types';

// Profile screen doesn't receive any params
export type ProfileScreenProps = NativeStackScreenProps<RootStackParamList, 'Profile'>;

// For screens that navigate to Profile
export type ProfileScreenNavigationProp = ProfileScreenProps['navigation'];

export interface ProfileCoin {
	address: string;        // Was: mintAddress (aligned with BirdEye)
	amount: number;
	price: number;
	value: number;
	coin: Coin;
}

export interface ProfileScreenStyles {
	safeArea: unknown;
	container: unknown;
	centered: unknown;
	scrollContent: unknown;
	contentPadding: unknown;
	headerSection: unknown;
	profileHeader: unknown;
	profileIcon: unknown;
	profileTitle: unknown;
	walletAddressContainer: unknown;
	walletAddress: unknown;
	copyButton: unknown;
	portfolioCard: unknown;
	portfolioHeader: unknown;
	portfolioTitle: unknown;
	portfolioValue: unknown;
	portfolioSubtext: unknown;
	sendButton: unknown;
	sendButtonContent: unknown;
	sendButtonDisabled: unknown;
	tokensSection: unknown;
	tokensHeader: unknown;
	tokensIcon: unknown;
	tokensTitle: unknown;
	emptyStateContainer: unknown;
	emptyStateIcon: unknown;
	emptyStateTitle: unknown;
	emptyStateText: unknown;
	noWalletContainer: unknown;
	noWalletCard: unknown;
	noWalletIcon: unknown;
	noWalletTitle: unknown;
	noWalletText: unknown;
	debugButton: unknown;
	// New styles for transactions
	transactionsSection: unknown;
	transactionsHeader: unknown;
	transactionsTitle: unknown;
	transactionItem: unknown;
	transactionDetails: unknown;
	transactionTexts: unknown;
	transactionDescription: unknown;
	transactionDate: unknown;
	transactionAmountStatus: unknown;
	statusDot: unknown;
	transactionIconContainer: unknown;
	loadingIndicator: unknown;
	// Enhanced styles
	transactionStatusTextPending: unknown;
	transactionStatusTextCompleted: unknown;
	transactionStatusTextFailed: unknown;
	transactionInfoContainer: unknown; // Renaming transactionTexts for clarity
	transactionTitleText: unknown; // For "Swap X to Y"
	transactionSubtitleText: unknown; // For date and status line
	viewAllButton: unknown;
	transactionsListContainer: unknown; // Container for the List.Item elements
	transactionEmptyStateContainer: unknown; // Specific for transactions empty state
}
