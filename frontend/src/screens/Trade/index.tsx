import React, { useState, useEffect, useMemo, useRef } from 'react'; // Added useRef
import { View, ScrollView } from 'react-native';
import { Text, useTheme, Button } from 'react-native-paper';
import { useRoute, useNavigation, RouteProp, NavigationProp } from '@react-navigation/native';
import { useToast } from '@components/Common/Toast';
import { TradeScreenParams } from './trade_types';
import { createStyles } from './trade_styles';
import { usePortfolioStore } from '@store/portfolio';
import { useCoinStore } from '@store/coins';
import { Coin } from '@/types';
import CoinSelector from '@components/Trade/CoinSelector';
import TradeDetails from '@components/Trade/TradeDetails';
import TradeConfirmation from '@components/Trade/TradeConfirmation';
import TradeStatusModal from '@components/Trade/TradeStatusModal'; // Added Status Modal
import { PollingStatus } from '@components/Trade/TradeStatusModal/types'; // Added Status Type
import { fetchTradeQuote, signTradeTransaction } from './trade_scripts'; // Changed handleTrade to signTradeTransaction
import { TradeDetailsProps } from '@components/Trade/TradeDetails/tradedetails_types';
import api from '@/services/api'; // Added api import
import { openSolscanUrl } from '@/utils/url'; // Added url util
import { SOLANA_ADDRESS } from '@/utils/constants';

type TradeScreenNavigationProp = NavigationProp<Record<string, TradeScreenParams>>;
type TradeScreenRouteProp = RouteProp<Record<string, TradeScreenParams>, string>;

const Trade: React.FC = () => {
	const navigation = useNavigation<TradeScreenNavigationProp>();
	const route = useRoute<TradeScreenRouteProp>();
	const { initialFromCoin, initialToCoin } = route.params;
	const { tokens, wallet } = usePortfolioStore();
	const { getCoinByID } = useCoinStore();
	const [fromCoin, setFromCoin] = useState<Coin | null>(initialFromCoin);
	const [toCoin, setToCoin] = useState<Coin>(initialToCoin);
	const [fromAmount, setFromAmount] = useState<string>('');
	const [toAmount, setToAmount] = useState<string>('');
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [isQuoteLoading, setIsQuoteLoading] = useState<boolean>(false);
	const [tradeDetails, setTradeDetails] = useState<TradeDetailsProps>({
		exchangeRate: '0',
		gasFee: '0',
		priceImpactPct: '0',
		totalFee: '0'
	});
	const { showToast } = useToast();
	const theme = useTheme();
	const styles = createStyles(theme);
	const [isConfirmationVisible, setIsConfirmationVisible] = useState(false); // For initial confirm modal
	const [isLoadingTrade, setIsLoadingTrade] = useState<boolean>(false); // General loading state (signing, submitting)
	const [isStatusModalVisible, setIsStatusModalVisible] = useState(false); // For status/polling modal
	const [submittedTxHash, setSubmittedTxHash] = useState<string | null>(null);
	const [pollingStatus, setPollingStatus] = useState<PollingStatus>('pending');
	const [pollingConfirmations, setPollingConfirmations] = useState<number>(0);
	const [pollingError, setPollingError] = useState<string | null>(null);
	const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null); // Ref to store interval ID

	// Refresh coin prices on screen load
	useEffect(() => {
		let isMounted = true;
		const refreshCoinPrices = async () => {
			try {
				// Determine the ID for the 'from' coin, defaulting to Solana if initialFromCoin is null
				const fromCoinId = initialFromCoin?.id ?? SOLANA_ADDRESS; // Default to Solana address if initialFromCoin is null/undefined

				const [updatedFromCoin, updatedToCoin] = await Promise.all([
					getCoinByID(fromCoinId, true),         // Use the determined ID, force refresh
					getCoinByID(toCoin.id, true)           // Force refresh for the 'to' coin
				]);
				if (!isMounted) return;

				// Set the state based on fetched data
				// Only update if the fetched coin data is valid
				if (updatedFromCoin) {
					setFromCoin(updatedFromCoin);
				}

				if (updatedToCoin) {
					setToCoin(updatedToCoin);
				}

			} catch (error) {
				console.error('Failed to refresh coin prices:', error);
				if (isMounted) {
					showToast({
						type: 'error',
						message: 'Failed to refresh prices. Please try again later.'
					});
				}
			}
		};
		refreshCoinPrices();
		return () => {
			isMounted = false;
		};
	}, [getCoinByID, initialFromCoin, initialToCoin, showToast]); // Dependencies added

	// Get portfolio token data if available
	const fromPortfolioToken = useMemo(() => {
		return tokens.find(token => token.id === fromCoin?.id);
	}, [tokens, fromCoin]);

	const toPortfolioToken = useMemo(() => {
		return tokens.find(token => token.id === toCoin?.id);
	}, [tokens, toCoin]);

	const handleFromAmountChange = async (amount: string) => {
		if (!fromCoin) return;

		setFromAmount(amount);
		if (!amount || isNaN(parseFloat(amount))) {
			console.log('❌ Invalid amount, clearing toAmount');
			setToAmount('');
			return;
		}

		await fetchTradeQuote(
			amount,
			fromCoin,
			toCoin,
			setIsQuoteLoading,
			setToAmount,
			setTradeDetails
		);
	};

	const handleToAmountChange = async (amount: string) => {
		if (!fromCoin) return;
		console.log('🔄 To Amount Change:', {
			amount,
			fromCoin: fromCoin?.symbol,
			toCoin: toCoin?.symbol
		});

		setToAmount(amount);
		if (!amount || isNaN(parseFloat(amount))) {
			console.log('❌ Invalid amount, clearing fromAmount');
			setFromAmount('');
			return;
		}

		await fetchTradeQuote(
			amount,
			toCoin,
			fromCoin,
			setIsQuoteLoading,
			setFromAmount,
			setTradeDetails
		);
	};

	const handleTradeSubmit = async () => {
		if (!fromAmount || !toAmount || !wallet) {
			showToast({ type: 'error', message: !wallet ? 'Please connect your wallet' : 'Please enter valid amounts' });
			return;
		}

		// Check if the user has sufficient balance
		const numericFromAmount = parseFloat(fromAmount); // User input is a string, needs parsing
		const availableBalance = fromPortfolioToken?.amount ?? 0; // Use optional chaining and nullish coalescing

		if (numericFromAmount > availableBalance) {
			showToast({
				type: 'error',
				// Use the numeric availableBalance directly, formatted
				message: `Insufficient ${fromCoin?.symbol ?? 'funds'}. You only have ${availableBalance.toFixed(6)} ${fromCoin?.symbol ?? ''}.`
			});
			return;
		}

		setIsConfirmationVisible(true);
	};

	// Clear interval on unmount
	useEffect(() => {
		return () => {
			if (pollingIntervalRef.current) {
				clearInterval(pollingIntervalRef.current);
			}
		};
	}, []);

	const stopPolling = () => {
		if (pollingIntervalRef.current) {
			clearInterval(pollingIntervalRef.current);
			pollingIntervalRef.current = null;
			console.log('Polling stopped.');
		}
		setIsLoadingTrade(false); // Also signifies polling has stopped
	};

	const pollTransactionStatus = async (txHash: string) => {
		console.log(`Polling status for ${txHash}...`);
		try {
			const statusResult = await api.getTradeStatus(txHash);

			if (!statusResult) {
				console.log('Transaction status not found yet, continuing poll...');
				// Keep status as 'polling'
				return;
			}

			setPollingConfirmations(statusResult.confirmations);

			if (statusResult.error) {
				console.error('Transaction failed:', statusResult.error);
				setPollingStatus('failed');
				setPollingError(typeof statusResult.error === 'string' ? statusResult.error : JSON.stringify(statusResult.error));
				stopPolling();
			} else if (statusResult.finalized) {
				console.log('Transaction finalized!');
				setPollingStatus('finalized');
				stopPolling();
				// Refresh portfolio balance after successful finalization
				usePortfolioStore.getState().fetchPortfolioBalance(wallet!.address);
				showToast({ type: 'success', message: 'Trade finalized successfully!' });
				// Consider navigating home after modal close?
			} else if (statusResult.status === 'confirmed' || statusResult.status === 'processed') { // Check backend status strings
				console.log(`Transaction confirmed with ${statusResult.confirmations} confirmations.`);
				setPollingStatus('confirmed');
				// Continue polling until finalized
			} else {
				console.log(`Current status: ${statusResult.status}, continuing poll...`);
				setPollingStatus('polling'); // Explicitly set back to polling if not confirmed/finalized/failed
			}

		} catch (error: any) {
			console.error('Error polling transaction status:', error);
			setPollingStatus('failed');
			setPollingError(error?.message || 'Failed to fetch transaction status');
			stopPolling();
		}
	};


	const handleTradeConfirm = async () => {
		if (!wallet || !fromCoin) {
			showToast({ type: 'error', message: !wallet ? 'Wallet not connected' : 'From coin missing' });
			return;
		}

		setIsLoadingTrade(true);
		setIsConfirmationVisible(false); // Close confirmation modal
		setPollingStatus('pending'); // Initial status for the new modal
		setSubmittedTxHash(null); // Reset hash
		setPollingError(null); // Reset error
		setPollingConfirmations(0); // Reset confirmations
		setIsStatusModalVisible(true); // Show status modal

		try {
			// 1. Sign Transaction
			console.log('Attempting to sign transaction...');
			const signedTransaction = await signTradeTransaction(
				fromCoin,
				toCoin,
				fromAmount,
				0.5, // TODO: Make slippage configurable
				wallet
			);
			console.log('Transaction signed successfully.');

			// 2. Submit Transaction
			console.log('Attempting to submit transaction...');
			const submitResponse = await api.submitTrade({
				from_coin_id: fromCoin.id,
				to_coin_id: toCoin.id,
				amount: parseFloat(fromAmount), // Ensure amount is number if required by API
				signed_transaction: signedTransaction,
			});
			console.log('Transaction submitted:', submitResponse);

			if (submitResponse.transaction_hash) {
				setSubmittedTxHash(submitResponse.transaction_hash);
				setPollingStatus('polling'); // Move to polling state

				// 3. Start Polling
				stopPolling(); // Clear any previous interval
				pollingIntervalRef.current = setInterval(() => {
					pollTransactionStatus(submitResponse.transaction_hash);
				}, 5000); // Poll every 5 seconds
				// Initial poll immediately
				pollTransactionStatus(submitResponse.transaction_hash);

			} else {
				throw new Error('Submission did not return a transaction hash.');
			}

		} catch (error: any) {
			console.error('Error during trade signing or submission:', error);
			const errorMessage = error?.message || 'Failed to sign or submit trade';
			showToast({ type: 'error', message: errorMessage });
			setPollingStatus('failed');
			setPollingError(errorMessage);
			// Don't stopPolling() here, let the modal show the failure
			setIsLoadingTrade(false); // Stop general loading indicator if needed
		}
		// Note: setIsLoadingTrade(false) is handled within stopPolling or on error
	};

	const handleCloseStatusModal = () => {
		setIsStatusModalVisible(false);
		stopPolling(); // Ensure polling stops when modal is manually closed
		// Optionally navigate home or reset state further
		// navigation.navigate('Home');
	};

	const handleSwapCoins = () => {
		const tempCoin = fromCoin;
		const tempAmount = fromAmount;
		if (!tempCoin) {
			console.warn('Cannot swap with null fromCoin');
			return;
		}
		setFromCoin(toCoin);
		setToCoin(tempCoin);
		setFromAmount(toAmount);
		setToAmount(tempAmount);
	};

	if (!wallet) {
		return (
			<View style={styles.noWalletContainer}>
				<Text style={{ color: theme.colors.onSurface }}>Please connect your wallet to trade</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<ScrollView style={styles.scrollView}>
				<View style={styles.padding}>
					{fromCoin && (
						<View style={styles.valueInfoContainer}>
							<CoinSelector
								label="From"
								coinData={{
									coin: fromCoin,
									balance: fromPortfolioToken ? {
										amount: fromPortfolioToken.amount,
										value: fromPortfolioToken.value
									} : undefined
								}}
								amount={{
									value: fromAmount,
									onChange: handleFromAmountChange,
								}}
								isInput
							/>
						</View>
					)}

					<Button
						mode="text"
						onPress={handleSwapCoins}
						style={styles.valueInfoContainer}
					>
						Swap
					</Button>

					<View style={styles.valueInfoContainer}>
						<CoinSelector
							label="To"
							coinData={{
								coin: toCoin,
								balance: toPortfolioToken ? {
									amount: toPortfolioToken.amount,
									value: toPortfolioToken.value
								} : undefined
							}}
							amount={{
								value: toAmount,
								onChange: handleToAmountChange,
								isLoading: isQuoteLoading
							}}
							isInput
						/>
					</View>

					{fromAmount && toAmount && (
						<TradeDetails
							exchangeRate={tradeDetails.exchangeRate}
							gasFee={tradeDetails.gasFee}
							priceImpactPct={tradeDetails.priceImpactPct}
							totalFee={tradeDetails.totalFee}
							route={tradeDetails.route}
						/>
					)}
				</View>
			</ScrollView>

			<View style={styles.padding}>
				<Button
					mode="contained"
					onPress={handleTradeSubmit}
					disabled={!fromAmount || !toAmount}
					style={{ width: '100%' }}
				>
					Trade
				</Button>
			</View>

			{fromCoin && toCoin && (
				<TradeConfirmation
					isVisible={isConfirmationVisible}
					onClose={() => setIsConfirmationVisible(false)}
					onConfirm={handleTradeConfirm}
					fromAmount={fromAmount}
					toAmount={toAmount}
					toCoin={toCoin}
					fromCoin={fromCoin}
					fees={tradeDetails}
					isLoading={isLoadingTrade} // Keep using this for the confirm button loading state
				/>
			)}

			{/* New Status Modal */}
			<TradeStatusModal
				isVisible={isStatusModalVisible}
				onClose={handleCloseStatusModal}
				txHash={submittedTxHash}
				status={pollingStatus}
				confirmations={pollingConfirmations}
				error={pollingError}
			/>
		</View>
	);
};

export default Trade;
