import React, { useEffect, useState, useRef } from 'react';
import { View, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Text, useTheme, Icon } from 'react-native-paper';
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
	startPolling,
	stopPolling,
	pollTransactionStatus
} from './scripts';
import { createStyles } from './styles';
import { Coin } from '@/types';
import TradeConfirmation from '@components/Trade/TradeConfirmation';
import TradeStatusModal from '@components/Trade/TradeStatusModal';
import { PollingStatus } from '@components/Trade/TradeStatusModal/types';
import { logger } from '@/utils/logger';

const Send: React.FC<SendTokensScreenProps> = ({ navigation }) => {
	const theme = useTheme();
	const styles = createStyles(theme);
	const { wallet, tokens } = usePortfolioStore();
	const { showToast } = useToast();
	const [selectedToken, setSelectedToken] = useState<PortfolioToken | undefined>(undefined);
	const [amount, setAmount] = useState('');
	const [recipientAddress, setRecipientAddress] = useState('');
	const [isLoading, setIsLoading] = useState(false);

	// Error state for validation
	const [validationError, setValidationError] = useState<string | null>(null);

	// New state variables for confirmation and polling
	const [isConfirmationVisible, setIsConfirmationVisible] = useState(false);
	const [isStatusModalVisible, setIsStatusModalVisible] = useState(false);
	const [submittedTxHash, setSubmittedTxHash] = useState<string | null>(null);
	const [pollingStatus, setPollingStatus] = useState<PollingStatus>('pending');
	const [pollingConfirmations, setPollingConfirmations] = useState<number>(0);
	const [pollingError, setPollingError] = useState<string | null>(null);
	const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

	// State for Solscan Verification Modal
	const [verificationInfo, setVerificationInfo] = useState<{
		message: string;
		code?: string;
	} | null>(null);

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
	}, [tokens]);

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

	// Cleanup polling on unmount
	useEffect(() => {
		return () => {
			if (pollingIntervalRef.current) {
				clearInterval(pollingIntervalRef.current);
			}
		};
	}, []);

	const onTokenSelect = (coin: Coin) => {
		logger.breadcrumb({ category: 'ui', message: 'Selected token for sending', data: { tokenSymbol: coin.symbol, tokenMint: coin.mintAddress } });
		const portfolioToken = handleTokenSelect(coin, tokens);
		setSelectedToken(portfolioToken);
	};

	// Wrapped polling functions for component context
	const componentStopPolling = () => {
		stopPolling(pollingIntervalRef, setIsLoading);
	};

	const componentPollStatus = async (txHash: string) => {
		await pollTransactionStatus(
			txHash,
			setPollingConfirmations,
			setPollingStatus,
			setPollingError,
			componentStopPolling,
			showToast,
			wallet
		);
	};

	const componentStartPolling = (txHash: string) => {
		startPolling(
			txHash,
			() => componentPollStatus(txHash),
			componentStopPolling,
			pollingIntervalRef
		);
	};

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

			if (validationResult && validationResult.code === "ADDRESS_HAS_BALANCE") {
				// Address has balance - show verification info card
				setVerificationInfo({
					message: validationResult.balanceInfo || validationResult.message,
					code: validationResult.code
				});
				return;
			}

			if (validationResult && validationResult.code === "ADDRESS_NO_BALANCE") {
				// Address is valid but unused - show warning info card
				setVerificationInfo({
					message: validationResult.balanceInfo || validationResult.message,
					code: validationResult.code
				});
				return;
			}

			if (validationResult && validationResult.code === "ADDRESS_BALANCE_CHECK_FAILED") {
				// Could not check balance - show warning info card
				setVerificationInfo({
					message: validationResult.balanceInfo || validationResult.message,
					code: validationResult.code
				});
				return;
			}

			// If no validation result or validation passed without special codes, proceed directly
			logger.breadcrumb({ category: 'ui', message: 'User proceeded without address verification', data: { toAddress: recipientAddress, amount, token: selectedToken?.coin.symbol } });
			setIsConfirmationVisible(true);

		} catch (error) {
			logger.exception(error, { functionName: 'handleSubmit' });
			setValidationError(error instanceof Error ? error.message : 'Validation failed');
		}
	};

	const handleConfirmVerificationAndProceed = () => {
		setVerificationInfo(null);
		logger.breadcrumb({ category: 'ui', message: 'User proceeded after address verification', data: { toAddress: recipientAddress, amount, token: selectedToken?.coin.symbol } });
		setIsConfirmationVisible(true);
	};

	const handleCancelVerification = () => {
		setVerificationInfo(null);
		logger.breadcrumb({ category: 'ui', message: 'User cancelled address verification', data: { toAddress: recipientAddress } });
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

	const handleRecipientChange = (newAddress: string) => {
		setRecipientAddress(newAddress);
		if (validationError) {
			setValidationError(null);
		}
		if (verificationInfo) {
			setVerificationInfo(null);
		}
	};

	const handleConfirmSubmit = async () => {
		logger.breadcrumb({ category: 'send_tokens', message: 'Send confirmed by user', data: { toAddress: recipientAddress, amount, token: selectedToken?.coin.symbol } });
		try {
			setIsLoading(true);
			setIsConfirmationVisible(false); // Close confirmation modal

			const txHash = await handleTokenTransfer({
				toAddress: recipientAddress,
				amount,
				selectedTokenMint: selectedToken!.mintAddress
			});

			// logger.debug('Transaction submitted:', txHash); // Already logged in handleTokenTransfer if successful
			setSubmittedTxHash(txHash);
			logger.breadcrumb({ category: 'ui', message: 'Send status modal opened', data: { txHash } });
			setIsStatusModalVisible(true);
			componentStartPolling(txHash);

		} catch (error: unknown) {
			if (error instanceof Error) {
				showToast({
					type: 'error',
					message: error.message || 'Failed to send tokens'
				});
			} else {
				showToast({
					type: 'error',
					message: 'An unknown error occurred while sending tokens'
				});
			}
			setIsLoading(false);
		}
	};

	const handleCloseStatusModal = () => {
		logger.breadcrumb({ category: 'ui', message: 'Send status modal closed', data: { txHash: submittedTxHash, finalStatus: pollingStatus } });
		setIsStatusModalVisible(false);
		componentStopPolling(); // Explicitly stop polling to prevent orphaned timers.

		if (pollingStatus === 'finalized' && wallet?.address) {
			logger.info('[Send] Refreshing portfolio and transactions after successful send.');
			usePortfolioStore.getState().fetchPortfolioBalance(wallet.address);
			useTransactionsStore.getState().fetchRecentTransactions(wallet.address);
		}

		setPollingStatus('pending'); // Reset status for next time
		setPollingConfirmations(0);
		setPollingError(null);
		setSubmittedTxHash(null);
		// Reset form fields
		setAmount('');
		setRecipientAddress('');
		// Potentially reset selectedToken to default if desired
		// if (tokens.length > 0) {
		// 	const solToken = getDefaultSolanaToken(tokens);
		// 	if (solToken) setSelectedToken(solToken);
		// }
		navigation.goBack();
	};

	const renderNoWalletState = () => (
		<View style={styles.noWalletContainer}>
			<View style={styles.noWalletCard}>
				<Icon source="wallet-outline" size={48} color={theme.colors.onSurfaceVariant} />
				<Text style={styles.noWalletTitle}>No Wallet</Text>
				<Text style={styles.noWalletSubtitle}>Connect wallet to continue</Text>
			</View>
		</View>
	);

	const renderNoTokenState = () => (
		<View style={styles.noWalletContainer}>
			<View style={styles.noWalletCard}>
				<Icon source="currency-usd-off" size={64} color={theme.colors.primary} />
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
                    balance={selectedToken.amount}
                    onSelectAmount={handleAmountChange}
                />
			</View>
		);
	};

	const renderRecipientCard = () => (
		<View style={styles.recipientCard}>
			<View style={styles.recipientHeader}>
				<Icon source="account" size={20} color={theme.colors.onTertiaryContainer} />
				<Text style={styles.recipientTitle}>To</Text>
			</View>
			<TextInput
				testID="recipient-address-input"
				style={styles.input}
				value={recipientAddress}
				onChangeText={handleRecipientChange}
				placeholder="Wallet address"
				placeholderTextColor={theme.colors.onSurfaceVariant}
				multiline={true}
				numberOfLines={2}
			/>
		</View>
	);

	const renderVerificationCard = () => {
		if (!verificationInfo) return null;

		const getCardStyle = () => {
			switch (verificationInfo.code) {
				case "ADDRESS_HAS_BALANCE":
					return styles.verificationCardSuccess;
				case "ADDRESS_NO_BALANCE":
					return styles.verificationCardWarning;
				case "ADDRESS_BALANCE_CHECK_FAILED":
					return styles.verificationCardError;
				default:
					return styles.verificationCardInfo;
			}
		};

		const getIconName = () => {
			switch (verificationInfo.code) {
				case "ADDRESS_HAS_BALANCE":
					return "check-circle";
				case "ADDRESS_NO_BALANCE":
					return "alert-circle";
				case "ADDRESS_BALANCE_CHECK_FAILED":
					return "help-circle";
				default:
					return "information";
			}
		};

		const getIconColor = () => {
			switch (verificationInfo.code) {
				case "ADDRESS_HAS_BALANCE":
					return theme.colors.primary;
				case "ADDRESS_NO_BALANCE":
					return theme.colors.tertiary;
				case "ADDRESS_BALANCE_CHECK_FAILED":
					return theme.colors.error;
				default:
					return theme.colors.onSurfaceVariant;
			}
		};

		return (
			<View style={[styles.verificationCard, getCardStyle()]} testID="verification-info-card">
				<View style={styles.verificationHeader}>
					<Icon source={getIconName()} size={20} color={getIconColor()} />
					<Text style={styles.verificationTitle}>Address Verification</Text>
				</View>
				<Text style={styles.verificationMessage} testID="verification-message">
					{verificationInfo.message}
				</Text>
				<View style={styles.verificationActions}>
					<TouchableOpacity
						style={[styles.verificationButton, styles.verificationButtonCancel]}
						onPress={handleCancelVerification}
						testID="verification-cancel-button"
					>
						<Text style={styles.verificationButtonCancelText}>Cancel</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={[styles.verificationButton, styles.verificationButtonContinue]}
						onPress={handleConfirmVerificationAndProceed}
						testID="verification-continue-button"
					>
						<Text style={styles.verificationButtonContinueText}>Continue</Text>
					</TouchableOpacity>
				</View>
			</View>
		);
	};

	const renderErrorMessage = () => {
		if (!validationError) return null;

		return (
			<View style={styles.errorContainer} testID="validation-error-container">
				<Icon source="alert-circle" size={16} color={theme.colors.error} />
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
			style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
			testID="send-button"
		>
			<Icon source="send" size={20} color={theme.colors.onPrimary} />
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
				{renderVerificationCard()}

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
				}}
				onConfirm={handleConfirmSubmit}
				fromToken={selectedToken?.coin}
				toToken={selectedToken?.coin}
				fromAmount={amount}
				toAmount="0"
				fees={{
					priceImpactPct: "0",
					totalFee: "0",
					gasFee: "0",
					route: "Direct Transfer"
				}}
			/>

			{/* Status Modal */}
			<TradeStatusModal
				isVisible={isStatusModalVisible}
				onClose={handleCloseStatusModal}
				status={pollingStatus}
				confirmations={pollingConfirmations}
				error={pollingError}
				txHash={submittedTxHash}
			/>
		</View>
	);
};

export default Send; 
