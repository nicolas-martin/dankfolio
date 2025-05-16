import React, { useEffect, useState, useRef } from 'react';
import { View, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { usePortfolioStore } from '@store/portfolio';
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

		if (tokens.length === 0) {
			showToast({
				type: 'error',
				message: 'No tokens in portfolio'
			});
			return;
		}
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
				showToast({
					type: 'error',
					message: validationError
				});
				return;
			}

			// Show confirmation modal
			setIsConfirmationVisible(true);
		} catch (err) {
			showToast({
				type: 'error',
				message: err.message || 'Failed to validate transfer'
			});
		}
	};

	const handleConfirmSubmit = async () => {
		try {
			setIsLoading(true);
			setIsConfirmationVisible(false);

			const txHash = await handleTokenTransfer({
				toAddress: recipientAddress,
				amount,
				selectedTokenMint: selectedToken!.mintAddress
			});

			console.log('Transaction submitted:', txHash);
			setSubmittedTxHash(txHash);
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
		setIsStatusModalVisible(false);
		setPollingStatus('pending');
		setPollingConfirmations(0);
		setPollingError(null);
		setSubmittedTxHash(null);
		navigation.goBack();
	};

	if (!wallet) {
		return (
			<View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
				<Text style={styles.title}>No Wallet Connected</Text>
			</View>
		);
	}
	if (!selectedToken) {
		return (
			<View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
				<Text style={styles.title}>No token selected</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<ScrollView contentContainerStyle={styles.contentPadding}>
				<Text style={styles.title}>Send Tokens</Text>

				<TokenSelector
					style={styles.inputContainer}
					selectedToken={selectedToken.coin}
					onSelectToken={onTokenSelect}
					label="Select token to send"
					amountValue={amount}
					onAmountChange={setAmount}
					isAmountEditable={true}
					showOnlyPortfolioTokens={true}
				/>

				{selectedToken && (
					<View style={styles.percentageContainer}>
						{[10, 25, 50, 75, 100].map((percent) => (
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
				)}

				<View style={styles.inputContainer}>
					<Text style={styles.label}>Recipient Address</Text>
					<TextInput
						style={styles.input}
						value={recipientAddress}
						onChangeText={(text) => setRecipientAddress(text)}
						placeholder="Enter recipient's address"
						placeholderTextColor={theme.colors.onSurfaceVariant}
					/>
				</View>

				<TouchableOpacity
					onPress={handleSubmit}
					disabled={isLoading}
					style={[styles.button, isLoading && styles.buttonDisabled]}
				>
					<Text style={styles.buttonText}>
						{isLoading ? 'Sending...' : 'Send Tokens'}
					</Text>
				</TouchableOpacity>
			</ScrollView>

			{/* Confirmation Modal */}
			<TradeConfirmation
				isVisible={isConfirmationVisible}
				onClose={() => setIsConfirmationVisible(false)}
				onConfirm={handleConfirmSubmit}
				fromCoin={selectedToken?.coin}
				toCoin={selectedToken?.coin}
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
