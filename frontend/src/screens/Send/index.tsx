import React, { useEffect, useState, useRef } from 'react';
import { View, TouchableOpacity, TextInput, ScrollView, Linking, Modal } from 'react-native';
import { Text, useTheme, Icon } from 'react-native-paper';
import { usePortfolioStore } from '@store/portfolio';
import { useTransactionsStore } from '@/store/transactions'; // Added
import TokenSelector from 'components/Common/TokenSelector';
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

	// New state variables for confirmation and polling
	const [isConfirmationVisible, setIsConfirmationVisible] = useState(false);
	const [isStatusModalVisible, setIsStatusModalVisible] = useState(false);
	const [submittedTxHash, setSubmittedTxHash] = useState<string | null>(null);
	const [pollingStatus, setPollingStatus] = useState<PollingStatus>('pending');
	const [pollingConfirmations, setPollingConfirmations] = useState<number>(0);
	const [pollingError, setPollingError] = useState<string | null>(null);
	const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

	// State for Solscan Verification Modal
	const [isVerificationModalVisible, setIsVerificationModalVisible] = useState(false);
	const [verificationMessage, setVerificationMessage] = useState('');
	const [solscanLink, setSolscanLink] = useState('');

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
			if (!wallet) {
				showToast({
					type: 'error',
					message: 'No wallet connected'
				});
				return;
			}
			if (!selectedToken) {
				showToast({
					type: 'error',
					message: 'No token selected'
				});
				return;
			}

			const validationError = await validateForm({
				toAddress: recipientAddress,
				amount,
				selectedTokenMint: selectedToken.mintAddress
			}, selectedToken);

			if (validationError) {
				if (validationError.code === "ADDRESS_EXISTS_ON_SOLSCAN") {
					setVerificationMessage(validationError.message);
					setSolscanLink(`https://solscan.io/account/${recipientAddress}`);
					setIsVerificationModalVisible(true);
					logger.breadcrumb({ category: 'ui', message: 'Solscan verification modal opened', data: { toAddress: recipientAddress } });
				} else {
					showToast({
						type: 'error',
						message: validationError.message
					});
				}
				return;
			}

			// If validationResult is null (all checks passed, no Solscan warning)
			logger.breadcrumb({ category: 'ui', message: 'Send confirmation modal opened (skipped Solscan or Solscan passed implicitly)', data: { toAddress: recipientAddress, amount, token: selectedToken.coin.symbol } });
			setIsConfirmationVisible(true);

		} catch (err) {
			showToast({
				type: 'error',
				message: err.message || 'Failed to validate transfer'
			});
		}
	};

	const handleConfirmVerificationAndProceed = () => {
		setIsVerificationModalVisible(false);
		logger.breadcrumb({ category: 'ui', message: 'User proceeded after Solscan verification', data: { toAddress: recipientAddress, amount, token: selectedToken?.coin.symbol } });
		setIsConfirmationVisible(true);
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

		} catch (err) {
			showToast({
				type: 'error',
				message: err.message || 'Failed to send tokens'
			});
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
					onAmountChange={setAmount}
					isAmountEditable={true}
					showOnlyPortfolioTokens={true}
				/>
			</View>
		);
	};

	const renderAmountCard = () => {
		if (!selectedToken) return null;

		return (
			<View style={styles.amountCard}>
				<View style={styles.percentageContainer}>
					{[25, 50, 75, 100].map((percent) => (
						<TouchableOpacity
							key={percent}
							style={styles.percentageButton}
							onPress={() => {
								const calculatedAmount = (selectedToken.amount * percent) / 100;
								let amountStr = calculatedAmount.toFixed(9);
								amountStr = parseFloat(amountStr).toString();
								if (amountStr.length > 12) {
									amountStr = amountStr.substring(0, 12);
									if (amountStr.endsWith('.')) {
										amountStr = amountStr.substring(0, 11);
									}
								}
								setAmount(amountStr);
							}}
						>
							<Text style={styles.percentageButtonText}>{percent}%</Text>
						</TouchableOpacity>
					))}
				</View>
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
				style={styles.input}
				value={recipientAddress}
				onChangeText={(text) => setRecipientAddress(text)}
				placeholder="Wallet address"
				placeholderTextColor={theme.colors.onSurfaceVariant}
				multiline={true}
				numberOfLines={2}
			/>
		</View>
	);

	const renderSendButton = () => (
		<TouchableOpacity
			onPress={handleSubmit}
			disabled={isLoading}
			style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
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

			{/* Verification Modal */}
			<Modal
				animationType="slide"
				transparent={true}
				visible={isVerificationModalVisible}
				onRequestClose={() => {
					setIsVerificationModalVisible(false);
					logger.breadcrumb({ category: 'ui', message: 'Solscan verification modal closed by request' });
				}}
			>
				<View style={styles.centeredView}>
					<View style={styles.modalView}>
						<Text style={styles.modalText}>{verificationMessage}</Text>
						<TouchableOpacity
							style={[styles.verificationModalButton, styles.verificationModalButtonLink]}
							onPress={() => Linking.openURL(solscanLink)}
						>
							<Text style={styles.verificationModalLinkButtonText}>View on Solscan</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.verificationModalButton, styles.verificationModalButtonProceed]}
							onPress={handleConfirmVerificationAndProceed}
						>
							<Text style={styles.verificationModalProceedButtonText}>Proceed</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.verificationModalButton, styles.verificationModalButtonClose]}
							onPress={() => {
								setIsVerificationModalVisible(false);
								logger.breadcrumb({ category: 'ui', message: 'Solscan verification modal cancelled by user' });
							}}
						>
							<Text style={styles.verificationModalButtonText}>Cancel</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>
		</View>
	);
};

export default Send; 
