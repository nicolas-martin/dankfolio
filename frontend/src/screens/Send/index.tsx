import React, { useEffect, useState, useCallback } from 'react';
import { View, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { usePortfolioStore } from '@store/portfolio';
import { useTransactionsStore } from '@/store/transactions'; // Added
import TokenSelector from 'components/Common/TokenSelector';
import AmountPercentageButtons from '@components/Common/AmountPercentageButtons';
import { useToast } from '@components/Common/Toast';
import { SendTokensScreenProps } from './types';
import { PortfolioToken } from '@store/portfolio';
import {
	validateForm,
	handleTokenTransfer,
	handleTokenSelect,
	getDefaultSolanaToken,
	validateAddressRealTime
} from './scripts';
import { useStyle } from './styles';
import { Coin } from '@/types'; // Added Wallet
import TradeConfirmation from '@components/Trade/TradeConfirmation';
import TradeStatusModal from '@components/Trade/TradeStatusModal';
// import { PollingStatus } from '@components/Trade/TradeStatusModal/types';
import { logger } from '@/utils/logger';
import { formatTokenBalance as formatBalance } from '@/utils/numberFormat';
import { useTransactionPolling, PollingStatus as HookPollingStatus } from '@/hooks/useTransactionPolling';
import { grpcApi } from '@/services/grpcApi';
import VerificationCard from '@components/Common/Form';
import { VerificationStatus } from '@/components/Common/Form/VerificationCard.styles';

// Static object for TradeConfirmation fees
const staticTradeConfirmationFees = {
	priceImpactPct: "0",
	totalFee: "0",
	gasFee: "0",
	route: "Direct Transfer"
};

const Send: React.FC<SendTokensScreenProps> = ({ navigation }) => {
	const styles = useStyle();
	const { wallet, tokens, fetchPortfolioBalance } = usePortfolioStore(); // Added fetchPortfolioBalance
	const { fetchRecentTransactions } = useTransactionsStore(); // Added fetchRecentTransactions
	const { showToast } = useToast();

	const [selectedToken, setSelectedToken] = useState<PortfolioToken | undefined>(undefined);
	const [amount, setAmount] = useState('');
	const [recipientAddress, setRecipientAddress] = useState('');
	const [isLoading, setIsLoading] = useState(false); // General loading for submit, distinct from polling's internal loading

	// Error state for validation
	const [validationError, setValidationError] = useState<string | null>(null);

	const {
		txHash: polledTxHash,
		status: currentPollingStatus,
		// data: pollingData, // Not explicitly used here, but available
		error: currentPollingError,
		confirmations: currentPollingConfirmations,
		startPolling: startTxPolling,
		// stopPolling: stopTxPolling, // Removed as unused
		resetPolling: resetTxPolling
	} = useTransactionPolling(
		grpcApi.getSwapStatus, // Pass the actual polling function
		undefined, // onSuccess
		(errorMsg) => showToast({ type: 'error', message: errorMsg || 'Transaction polling failed' }), // onError
		(finalData) => { // onFinalized
			if (wallet?.address && finalData && !finalData.error) { // Assuming finalData contains the structure from getSwapStatus
				logger.info('[Send] Transaction finalized successfully, refreshing portfolio, transactions, and PnL.');
				fetchPortfolioBalance(wallet.address);
				fetchRecentTransactions(wallet.address);
				usePortfolioStore.getState().fetchPortfolioPnL(wallet.address);
			}
		}
	);

	const [isConfirmationVisible, setIsConfirmationVisible] = useState(false);
	const [isStatusModalVisible, setIsStatusModalVisible] = useState(false);
	// const [submittedTxHash, setSubmittedTxHash] = useState<string | null>(null); // Replaced by polledTxHash from hook

	// Flag to prevent double navigation when closing status modal
	const [isNavigating, setIsNavigating] = useState(false);

	// State for Solscan Verification Modal
	const [verificationInfo, setVerificationInfo] = useState<{
		message: string;
		code?: string;
	} | null>(null);

	// State for real-time address validation
	const [isValidatingAddress, setIsValidatingAddress] = useState(false);

	useEffect(() => {
		logger.breadcrumb({ category: 'navigation', message: 'Viewed SendTokensScreen' });
	}, []);

	// Initialize with SOL token
	useEffect(() => {
		if (tokens.length > 0 && !selectedToken) {
			const solToken = getDefaultSolanaToken(tokens);
			if (solToken) {
				setSelectedToken(solToken);
			}
		}
	}, [tokens, selectedToken]); // Added selectedToken to dependency array

	// Error handling effect
	useEffect(() => {
		if (!wallet) {
			showToast({
				type: 'error',
				message: 'No wallet connected'
			});
			return;
		}

		// Remove the toast notification for empty portfolio
		// The visual indicator in the UI will be sufficient
	}, [wallet, tokens, showToast]);

	// Cleanup polling on unmount - handled by useTransactionPolling hook's internal useEffect

	const onTokenSelect = (coin: Coin) => {
		logger.breadcrumb({ category: 'ui', message: 'Selected token for sending', data: { tokenSymbol: coin.symbol, tokenMint: coin.mintAddress } });
		const portfolioToken = handleTokenSelect(coin, tokens);
		setSelectedToken(portfolioToken);
	};

	// Polling functions (componentStopPolling, componentPollStatus, componentStartPolling) are now replaced by hook's functions

	const handleSubmit = async () => {
		try {
			// Clear any previous validation errors and verification info
			setValidationError(null);
			setVerificationInfo(null);

			if (!wallet) {
				setValidationError('No wallet connected');
				return;
			}
			if (!selectedToken) {
				setValidationError('No token selected');
				return;
			}

			// Skip address validation if we already have verification info from real-time validation
			if (!verificationInfo) {
				const validationResult = await validateForm({
					toAddress: recipientAddress,
					amount,
					selectedTokenMint: selectedToken.mintAddress
				}, selectedToken);

				if (validationResult && !validationResult.isValid) {
					// Show validation error
					setValidationError(validationResult.message);
					return;
				}

				// Don't show verification info during submit - proceed directly to confirmation
			} else {
				// We already have verification info, just validate other fields
				if (!recipientAddress) {
					setValidationError('Recipient address is required');
					return;
				}

				if (!amount || parseFloat(amount) <= 0) {
					setValidationError('Please enter a valid amount');
					return;
				}

				if (selectedToken) {
					const amountNum = parseFloat(amount);
					if (amountNum > selectedToken.amount) {
						setValidationError(`Insufficient balance. Maximum available: ${formatBalance(selectedToken.amount)} ${selectedToken.coin.symbol}`);
						return;
					}
				}
			}

			// Always proceed to confirmation
			logger.breadcrumb({ category: 'ui', message: 'User proceeding to confirmation', data: { toAddress: recipientAddress, amount, token: selectedToken?.coin.symbol } });
			setIsConfirmationVisible(true);

		} catch (error) {
			logger.exception(error, { functionName: 'handleSubmit' });
			setValidationError(error instanceof Error ? error.message : 'Validation failed');
		}
	};

	const handleCancelVerification = () => {
		setVerificationInfo(null);
		logger.breadcrumb({ category: 'ui', message: 'User dismissed address verification', data: { toAddress: recipientAddress } });
	};

	// Clear validation errors when user starts typing
	const handleAmountChange = (newAmount: string) => {
		setAmount(newAmount);
		if (validationError) {
			setValidationError(null);
		}
		if (verificationInfo) {
			setVerificationInfo(null);
		}
	};

	// Debounced validation function
	const debouncedValidateAddress = useCallback(() => {
		let timeoutId: ReturnType<typeof setTimeout>;
		return (address: string) => {
			clearTimeout(timeoutId);
			timeoutId = setTimeout(() => {
				validateAddressRealTime(address, selectedToken, setIsValidatingAddress, setVerificationInfo, setValidationError);
			}, 500); // 500ms delay
		};
	}, [selectedToken])();

	const handleRecipientChange = (newAddress: string) => {
		setRecipientAddress(newAddress);
		if (validationError) {
			setValidationError(null);
		}
		if (verificationInfo) {
			setVerificationInfo(null);
		}

		// Trigger real-time validation only for addresses that are likely complete (43-44 chars)
		if (newAddress.length >= 43 && newAddress.length <= 44) {
			debouncedValidateAddress(newAddress);
		}
	};

	const handleConfirmSubmit = async () => {
		logger.breadcrumb({ category: 'send_tokens', message: 'Send confirmed by user', data: { toAddress: recipientAddress, amount, token: selectedToken?.coin.symbol } });
		try {
			setIsLoading(true);
			setIsConfirmationVisible(false); // Close confirmation modal

			logger.info('[Send] Attempting token transfer.');
			let txHash: string | null = null;
			try {
				txHash = await handleTokenTransfer({
					toAddress: recipientAddress,
					amount,
					selectedTokenMint: selectedToken!.mintAddress
				});
				logger.info(`[Send] Token transfer successful. TxHash: ${txHash}`);
			} catch (error) {
				logger.error('[Send] Token transfer failed.', error);
				throw error; // Re-throw to be caught by the outer catch block
			}

			logger.info('[Send] Token transfer successful. TxHash obtained:', txHash);
			// setSubmittedTxHash(txHash); // Not needed, txHash is set via startTxPolling
			logger.breadcrumb({ category: 'ui', message: 'Send status modal opened', data: { txHash } });
			setIsStatusModalVisible(true);
			logger.info('[Send] Starting polling via hook.');
			startTxPolling(txHash);
			// setIsLoading(false); // isLoading should be managed by the hook or for the submission part only
		} catch (error: unknown) {
			setIsLoading(false); // Ensure loading is stopped on submission error
			const errorMessage = error instanceof Error ?
				(error.message || 'Failed to send tokens') :
				'An unknown error occurred while sending tokens';

			// Show both validation error and toast for better UX
			setValidationError(errorMessage);
			showToast({
				type: 'error',
				message: errorMessage
			});
			setIsLoading(false);
		}
	};

	const handleCloseStatusModal = () => {
		logger.breadcrumb({ category: 'ui', message: 'Send status modal closed', data: { txHash: polledTxHash, finalStatus: currentPollingStatus } });

		// Prevent double navigation
		if (isNavigating) {
			logger.info('[Send] Navigation already in progress, skipping duplicate navigation');
			return;
		}

		setIsNavigating(true);
		setIsStatusModalVisible(false);
		// stopTxPolling(); // stopPolling is called by resetPolling or internally by the hook on terminal states
		resetTxPolling(); // Reset all polling states in the hook

		// onFinalized callback in useTransactionPolling handles portfolio/transaction refresh now.

		// Reset form fields
		setAmount('');
		setRecipientAddress('');

		// Navigate back to previous screen if possible, otherwise go to Profile tab
		if (navigation.canGoBack()) {
			navigation.goBack();
		} else {
			// Fallback to Profile tab if no navigation history
			// @ts-expect-error - Navigation type issue with nested navigators
			navigation.navigate('MainTabs', { screen: 'Profile' });
		}

		// Reset navigation flag after navigation completes
		setTimeout(() => {
			setIsNavigating(false);
		}, 100);
	};

	const renderNoWalletState = () => (
		<View style={styles.noWalletContainer}>
			<View style={styles.noWalletCard}>
				<Icon source="wallet-outline" size={48} color={styles.colors.onSurfaceVariant} />
				<Text style={styles.noWalletTitle}>No Wallet</Text>
				<Text style={styles.noWalletSubtitle}>Connect wallet to continue</Text>
			</View>
		</View>
	);

	const renderNoTokenState = () => (
		<View style={styles.noWalletContainer}>
			<View style={styles.noWalletCard}>
				<Icon source="currency-usd-off" size={64} color={styles.colors.primary} />
				<Text style={styles.noWalletTitle}>No Tokens</Text>
				<Text style={styles.noWalletSubtitle}>Add tokens to portfolio</Text>
			</View>
		</View>
	);

	const renderTokenCard = () => {
		if (!selectedToken) return null;

		return (
			<View style={styles.tokenCard}>
				<TokenSelector
					selectedToken={selectedToken.coin}
					onSelectToken={onTokenSelect}
					label=""
					amountValue={amount}
					onAmountChange={handleAmountChange}
					isAmountEditable={true}
					showOnlyPortfolioTokens={true}
					testID="token-selector"
				/>
			</View>
		);
	};

	const renderAmountCard = () => {
		if (!selectedToken) return null;

		return (
			<View style={styles.amountCard}>
				<AmountPercentageButtons
					key={selectedToken.mintAddress}
					balance={selectedToken.amount}
					onSelectAmount={handleAmountChange}
				/>
			</View>
		);
	};

	const renderRecipientCard = () => (
		<View style={styles.recipientCard}>
			<View style={styles.recipientHeader}>
				<Icon source="account" size={20} color={styles.colors.onTertiaryContainer} />
				<Text style={styles.recipientTitle}>To</Text>
			</View>
			<View style={styles.inputContainer}>
				<TextInput
					testID="recipient-address-input"
					style={styles.input}
					value={recipientAddress}
					onChangeText={handleRecipientChange}
					placeholder="Wallet address"
					placeholderTextColor={styles.colors.onSurfaceVariant}
					multiline={true}
					numberOfLines={2}
				/>
				{isValidatingAddress && (
					<View style={styles.validationLoadingContainer}>
						<Icon source="loading" size={16} color={styles.colors.primary} />
					</View>
				)}
			</View>
		</View>
	);

	const mapVerificationCodeToStatus = (code?: string): VerificationStatus => {
		switch (code) {
			case "ADDRESS_HAS_BALANCE":
				return 'valid';
			case "ADDRESS_NO_BALANCE":
				return 'warning';
			case "ADDRESS_BALANCE_CHECK_FAILED":
				return 'invalid';
			default:
				return 'idle';
		}
	};

	// renderVerificationCard is now replaced by using VerificationCard directly below

	const renderErrorMessage = () => {
		if (!validationError) return null;

		return (
			<View style={styles.errorContainer} testID="validation-error-container">
				<Icon source="alert-circle" size={16} color={styles.colors.error} />
				<Text style={styles.errorText} testID="validation-error-text">
					{validationError}
				</Text>
			</View>
		);
	};


	const renderSendButton = () => (
		<TouchableOpacity
			onPress={handleSubmit}
			disabled={isLoading}
			style={styles.getSendButtonStyle(isLoading)}
			testID="send-button"
		>
			<Icon source="send" size={20} color={styles.colors.onPrimary} />
			<Text style={styles.sendButtonText}>
				{isLoading ? 'Sending...' : 'Send'}
			</Text>
		</TouchableOpacity>
	);

	if (!wallet) {
		return renderNoWalletState();
	}

	if (tokens.length === 0 || !selectedToken) {
		return renderNoTokenState();
	}

	return (
		<View style={styles.container}>
			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={styles.content}
				showsVerticalScrollIndicator={false}
			>
				{/* Token Selection Card */}
				{renderTokenCard()}

				{/* Amount Selection Card */}
				{renderAmountCard()}

				{/* Recipient Card */}
				{renderRecipientCard()}

				{/* Verification Info Card */}
				{verificationInfo && (
					<View style={styles.verificationContainer}>
						<VerificationCard
							status={mapVerificationCodeToStatus(verificationInfo.code)}
							title="Address Verification"
							message={verificationInfo.message}
							onDismiss={handleCancelVerification}
						/>
					</View>
				)}

				{/* Error Message */}
				{renderErrorMessage()}

				{/* Send Button */}
				{renderSendButton()}
			</ScrollView>

			{/* Confirmation Modal */}
			<TradeConfirmation
				isVisible={isConfirmationVisible}
				onClose={() => {
					logger.breadcrumb({ category: 'ui', message: 'Send confirmation modal closed' });
					setIsConfirmationVisible(false);
					setVerificationInfo(null); // Clear verification info when closing confirmation
				}}
				onConfirm={handleConfirmSubmit}
				fromToken={selectedToken?.coin}
				fromAmount={amount}
				toAmount="0"
				operationType="send"
				recipientAddress={recipientAddress}
				fees={staticTradeConfirmationFees}
			/>

			{/* Status Modal */}
			<TradeStatusModal
				isVisible={isStatusModalVisible}
				onClose={handleCloseStatusModal}
				status={currentPollingStatus as HookPollingStatus}
				confirmations={currentPollingConfirmations}
				error={currentPollingError}
				txHash={polledTxHash}
			/>
		</View>
	);
};

export default Send; 
