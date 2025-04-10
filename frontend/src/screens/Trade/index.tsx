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
import { RootStackParamList } from '@/types';
import CoinSelector from '@components/Trade/CoinSelector';
import TradeDetails from '@components/Trade/TradeDetails';
import TradeConfirmation from '@components/Trade/TradeConfirmation';
import TradeStatusModal from '@components/Trade/TradeStatusModal'; // Added Status Modal
import { PollingStatus } from '@components/Trade/TradeStatusModal/types'; // Added Status Type
import {
	fetchTradeQuote,
	signTradeTransaction,
	executeTrade, // Added
	pollTradeStatus, // Added
	startPolling, // Added
	stopPolling, // Added
	handleSwapCoins as swapCoinsUtil // Renamed import
} from './trade_scripts';
import { TradeDetailsProps } from '@components/Trade/TradeDetails/tradedetails_types';
import api from '@/services/api'; // Added api import
import { openSolscanUrl } from '@/utils/url'; // Added url util
import { SOLANA_ADDRESS } from '@/utils/constants';

type TradeScreenNavigationProp = NavigationProp<RootStackParamList>;
type TradeScreenRouteProp = RouteProp<RootStackParamList, 'Trade'>;

const Trade: React.FC = () => {
	const navigation = useNavigation<TradeScreenNavigationProp>();
	const route = useRoute<TradeScreenRouteProp>();
	const { initialFromCoin = null, initialToCoin = null } = route.params || {};
	const { tokens, wallet } = usePortfolioStore();
	const { getCoinByID } = useCoinStore();
	const [fromCoin, setFromCoin] = useState<Coin | null>(initialFromCoin);
	const [toCoin, setToCoin] = useState<Coin | null>(initialToCoin);
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

	// --- Wrapped Polling Functions for Component Context ---
	// Wrap stopPolling to automatically pass dependencies
	const componentStopPolling = () => {
		stopPolling(pollingIntervalRef, setIsLoadingTrade);
	};

	// Wrap pollTradeStatus
	const componentPollTradeStatus = async (txHash: string) => {
		await pollTradeStatus(
			txHash,
			setPollingConfirmations,
			setPollingStatus,
			setPollingError,
			componentStopPolling, // Use wrapped stopPolling
			showToast,
			wallet
		);
	};

	// Wrap startPolling
	const componentStartPolling = (txHash: string) => {
		startPolling(
			txHash,
			() => componentPollTradeStatus(txHash), // Pass the actual polling function
			componentStopPolling,
			pollingIntervalRef
		);
	};

	// --- End Wrapped Polling Functions ---

	// Early return if toCoin is null
	if (!toCoin) {
		return (
			<View style={styles.noWalletContainer}>
				<Text style={{ color: theme.colors.onSurface }}>Invalid trade pair. Please select coins to trade.</Text>
			</View>
		);
	}

	// Refresh coin prices on screen load
	useEffect(() => {
		let isMounted = true;
		const refreshCoinPrices = async () => {
			try {
				// Determine the ID for the 'from' coin, defaulting to Solana if initialFromCoin is null
				const fromCoinId = initialFromCoin?.id ?? SOLANA_ADDRESS; // Default to Solana address if initialFromCoin is null/undefined

				const [updatedFromCoin, updatedToCoin] = await Promise.all([
					getCoinByID(fromCoinId, true),         // Use the determined ID, force refresh
					getCoinByID(toCoin?.id ?? SOLANA_ADDRESS, true)           // Force refresh for the 'to' coin
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
		if (!fromCoin || !toCoin) return;

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
		if (!fromCoin || !toCoin) return;
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

	// Use new handleTradeSubmit that calls executeTrade
	const handleTradeSubmitClick = () => {
		if (!fromAmount || !toAmount || !wallet) {
			showToast({ type: 'error', message: !wallet ? 'Please connect your wallet' : 'Please enter valid amounts' });
			return;
		}

		// Check if the user has sufficient balance
		const numericFromAmount = parseFloat(fromAmount);
		const availableBalance = fromPortfolioToken?.amount ?? 0;

		if (numericFromAmount > availableBalance) {
			showToast({
				type: 'error',
				message: `Insufficient ${fromCoin?.symbol ?? 'funds'}. You only have ${availableBalance.toFixed(6)} ${fromCoin?.symbol ?? ''}.`
			});
			return;
		}
		// Only opens the confirmation modal now
		setIsConfirmationVisible(true);
	};

	// Clear interval on unmount
	useEffect(() => {
		return () => {
			// Use componentStopPolling for cleanup
			componentStopPolling();
		};
	}, []); // Empty dependency array ensures this runs only on mount and unmount

	// --- New handleTradeConfirm using executeTrade --- 
	const handleTradeConfirmClick = async () => {
		if (!wallet || !fromCoin || !toCoin || !fromAmount) {
			showToast({ type: 'error', message: 'Missing trade information' });
			return;
		}
		await executeTrade(
			wallet,
			fromCoin,
			toCoin,
			fromAmount,
			0.5, // TODO: Make slippage configurable
			showToast,
			setIsLoadingTrade,
			setIsConfirmationVisible,
			setPollingStatus,
			setSubmittedTxHash,
			setPollingError,
			setPollingConfirmations,
			setIsStatusModalVisible,
			componentStartPolling // Pass wrapped startPolling
		);
	};

	const handleCloseStatusModal = () => {
		setIsStatusModalVisible(false);
		componentStopPolling(); // Use wrapped stopPolling
		// Navigate to home screen
		navigation.navigate('Home');
	};

	// --- Update handleSwapCoins to use imported util --- 
	const handleSwapCoins = () => {
		if (!fromCoin || !toCoin) {
			console.warn('Cannot swap with null coins');
			return;
		}
		swapCoinsUtil(
			fromCoin,
			toCoin,
			setFromCoin,
			setToCoin,
			fromAmount,
			setFromAmount,
			toAmount,
			setToAmount
		);
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
					onPress={handleTradeSubmitClick} // Use new handler
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
					onConfirm={handleTradeConfirmClick} // Use new handler
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
