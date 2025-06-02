import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/index';
import { Coin } from '@/types';

// Profile screen doesn't receive any params
export type ProfileScreenProps = NativeStackScreenProps<RootStackParamList, 'Profile'>;

// For screens that navigate to Profile
export type ProfileScreenNavigationProp = ProfileScreenProps['navigation'];

export interface ProfileCoin {
	mintAddress: string;
	amount: number;
	price: number;
	value: number;
	coin: Coin;
}

export interface ProfileScreenStyles {
	safeArea: any;
	container: any;
	centered: any;
	scrollContent: any;
	contentPadding: any;
	headerSection: any;
	profileHeader: any;
	profileIcon: any;
	profileTitle: any;
	walletAddressContainer: any;
	walletAddress: any;
	copyButton: any;
	portfolioCard: any;
	portfolioHeader: any;
	portfolioTitle: any;
	portfolioValue: any;
	portfolioSubtext: any;
	sendButton: any;
	sendButtonContent: any;
	tokensSection: any;
	tokensHeader: any;
	tokensIcon: any;
	tokensTitle: any;
	emptyStateContainer: any;
	emptyStateIcon: any;
	emptyStateTitle: any;
	emptyStateText: any;
	noWalletContainer: any;
	noWalletCard: any;
	noWalletIcon: any;
	noWalletTitle: any;
	noWalletText: any;
	debugButton: any;
	// New styles for transactions
	transactionsSection: any;
	transactionsHeader: any;
	transactionsTitle: any;
	transactionItem: any;
	transactionDetails: any;
	transactionTexts: any;
	transactionDescription: any;
	transactionDate: any;
	transactionAmountStatus: any;
	statusDot: any;
	transactionIconContainer: any;
	loadingIndicator: any;
	// Enhanced styles
	transactionStatusTextPending: any;
	transactionStatusTextCompleted: any;
	transactionStatusTextFailed: any;
	transactionInfoContainer: any; // Renaming transactionTexts for clarity
	transactionTitleText: any; // For "Swap X to Y"
	transactionSubtitleText: any; // For date and status line
	viewAllButton: any;
	transactionsListContainer: any; // Container for the List.Item elements
	transactionEmptyStateContainer: any; // Specific for transactions empty state
}
