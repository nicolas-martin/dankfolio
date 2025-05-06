import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, ScrollView, SafeAreaView } from 'react-native';
import { Text, useTheme, Button } from 'react-native-paper';
import { useRoute, useNavigation, RouteProp, NavigationProp } from '@react-navigation/native';
import { useToast } from '@components/Common/Toast';
import { createStyles } from './trade_styles';
import { usePortfolioStore } from '@store/portfolio';
import { useCoinStore } from '@store/coins';
import { Coin } from '@/types';
import { SwapIcon } from '@components/Common/Icons';
import { RootStackParamList } from '@/types';
import TokenSelector from '@components/Common/TokenSelector';
import TradeDetails from '@components/Trade/TradeDetails';
import TradeConfirmation from '@components/Trade/TradeConfirmation';
import TradeStatusModal from '@components/Trade/TradeStatusModal'; // Added Status Modal
import { PollingStatus } from '@components/Trade/TradeStatusModal/types'; // Added Status Type
import {
	fetchTradeQuote,
	executeTrade, // Added
	pollTradeStatus, // Added
	startPolling, // Added
	stopPolling, // Added
	handleSwapCoins as swapCoinsUtil, // Renamed import
	QUOTE_DEBOUNCE_MS
} from './trade_scripts';
import { TradeDetailsProps } from '@components/Trade/TradeDetails/tradedetails_types';
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
	const quoteTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

	// Refresh coin prices on screen load
	useEffect(() => {
		let isMounted = true;
		const refreshCoinPrices = async () => {
			try {
				// Determine the ID for the 'from' coin, defaulting to Solana if initialFromCoin is null
				const fromCoinMintAddress = initialFromCoin?.mintAddress ?? SOLANA_ADDRESS; // Default to Solana address if initialFromCoin is null/undefined

				const [updatedFromCoin, updatedToCoin] = await Promise.all([
					getCoinByID(fromCoinMintAddress, true),         // Use the determined ID, force refresh
					getCoinByID(toCoin?.mintAddress ?? SOLANA_ADDRESS, true)           // Force refresh for the 'to' coin
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
		return tokens.find(token => token.mintAddress === fromCoin?.mintAddress);
	}, [tokens, fromCoin]);

	const toPortfolioToken = useMemo(() => {
		return tokens.find(token => token.mintAddress === toCoin?.mintAddress);
	}, [tokens, toCoin]);

	// Handler for the 'From' TokenSelector
	const handleSelectFromToken = (token: Coin) => {
		console.log('🎯 handleSelectFromToken:', {
			newToken: token.symbol,
			currentFromAmount: fromAmount,
			currentToToken: toCoin?.symbol,
			isSameAsCurrent: token.mintAddress === fromCoin?.mintAddress
		});

		// Skip if selecting the same token that's already selected
		if (token.mintAddress === fromCoin?.mintAddress) {
			console.log('⏭️ Skipping selection - same token already selected');
			return;
		}

		if (token.mintAddress === toCoin?.mintAddress) {
			console.log('🔄 Swapping tokens due to same selection');
			handleSwapCoins();
		} else {
			setFromCoin(token);
			// Only clear amounts if we're actually changing to a different token
			if (fromCoin && token.mintAddress !== fromCoin.mintAddress) {
				console.log('🧹 Clearing amounts on new token selection');
				setFromAmount('');
				setToAmount('');
			}
		}
	};

	// Handler for the 'To' TokenSelector
	const handleSelectToToken = (token: Coin) => {
		console.log('🎯 handleSelectToToken:', {
			newToken: token.symbol,
			currentToAmount: toAmount,
			currentFromToken: fromCoin?.symbol,
			isSameAsCurrent: token.mintAddress === toCoin?.mintAddress
		});

		// Skip if selecting the same token that's already selected
		if (token.mintAddress === toCoin?.mintAddress) {
			console.log('⏭️ Skipping selection - same token already selected');
			return;
		}

		if (token.mintAddress === fromCoin?.mintAddress) {
			console.log('🔄 Swapping tokens due to same selection');
			handleSwapCoins();
		} else {
			setToCoin(token);
			// Only clear amounts if we're actually changing to a different token
			if (toCoin && token.mintAddress !== toCoin.mintAddress) {
				console.log('🧹 Clearing amounts on new token selection');
				setFromAmount('');
				setToAmount('');
			}
		}
	};

	const handleFromAmountChange = useCallback((amount: string) => {
		console.log('🎯 handleFromAmountChange START:', { amount, fromCoin: fromCoin?.symbol, toCoin: toCoin?.symbol });
		setFromAmount(amount);
		console.log('💾 Setting fromAmount:', amount);

		// Skip quote fetch for incomplete numbers
		if (!amount || amount === '.' || amount.endsWith('.')) {
			console.log('⏭️ Skipping quote fetch for incomplete number:', amount);
			return;
		}

		if (!fromCoin || !toCoin) {
			console.log('❌ Skipping quote fetch - missing coins');
			return;
		}

		console.log('🔄 Preparing quote fetch:', { amount, fromCoin: fromCoin?.symbol, toCoin: toCoin?.symbol });

		if (quoteTimeoutRef.current) {
			console.log('🗑️ Clearing existing timeout');
			clearTimeout(quoteTimeoutRef.current);
		}

		setIsQuoteLoading(true);

		quoteTimeoutRef.current = setTimeout(async () => {
			console.log('⏰ Quote timeout triggered:', { amount });
			try {
				await fetchTradeQuote(
					amount,
					fromCoin,
					toCoin,
					setIsQuoteLoading,
					setToAmount,
					setTradeDetails
				);
			} catch (error: any) {
				console.error('❌ Quote fetch error:', error);
				showToast({
					type: 'error',
					message: error?.message || 'Failed to fetch trade quote'
				});
			}
			quoteTimeoutRef.current = null;
		}, QUOTE_DEBOUNCE_MS);
	}, [fromCoin, toCoin, fetchTradeQuote, setIsQuoteLoading, setToAmount, setTradeDetails, showToast]);

	const handleToAmountChange = useCallback((amount: string) => {
		console.log('🎯 handleToAmountChange START:', { amount, fromCoin: fromCoin?.symbol, toCoin: toCoin?.symbol });
		setToAmount(amount);
		console.log('💾 Setting toAmount:', amount);

		// Skip quote fetch for incomplete numbers
		if (!amount || amount === '.' || amount.endsWith('.')) {
			console.log('⏭️ Skipping quote fetch for incomplete number:', amount);
			return;
		}

		if (!fromCoin || !toCoin) {
			console.log('❌ Skipping quote fetch - missing coins');
			return;
		}

		console.log('🔄 Preparing quote fetch:', { amount, fromCoin: fromCoin?.symbol, toCoin: toCoin?.symbol });

		if (quoteTimeoutRef.current) {
			console.log('🗑️ Clearing existing timeout');
			clearTimeout(quoteTimeoutRef.current);
		}

		quoteTimeoutRef.current = setTimeout(async () => {
			console.log('⏰ Quote timeout triggered:', { amount });
			setIsQuoteLoading(true);
			try {
				await fetchTradeQuote(
					amount,
					toCoin,
					fromCoin,
					setIsQuoteLoading,
					setFromAmount,
					setTradeDetails
				);
			} catch (error: any) {
				console.error('❌ Quote fetch error:', error);
				showToast({
					type: 'error',
					message: error?.message || 'Failed to fetch trade quote'
				});
			}
			quoteTimeoutRef.current = null;
		}, QUOTE_DEBOUNCE_MS);
	}, [fromCoin, toCoin, fetchTradeQuote, setIsQuoteLoading, setFromAmount, setTradeDetails, showToast]);

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
			if (quoteTimeoutRef.current) {
				clearTimeout(quoteTimeoutRef.current);
			}
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
		console.log('🔄 handleSwapCoins START:', {
			fromCoin: fromCoin?.symbol,
			toCoin: toCoin?.symbol,
			fromAmount,
			toAmount
		});

		if (!fromCoin || !toCoin) {
			console.warn('❌ Cannot swap with null coins');
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

		console.log('✅ Swap completed');
	};

	// Early return if toCoin is null
	if (!toCoin) {
		return (
			<View style={styles.noWalletContainer}>
				<Text style={{ color: theme.colors.onSurface }}>Invalid trade pair. Please select coins to trade.</Text>
			</View>
		);
	}

	if (!wallet) {
		return (
			<View style={styles.noWalletContainer}>
				<Text style={{ color: theme.colors.onSurface }}>Please connect your wallet to trade</Text>
			</View>
		);
	}

	if (!fromCoin) {
		return (
			<View style={styles.noWalletContainer}>
				<Text style={{ color: theme.colors.onSurface }}>Please select a coin to trade from</Text>
			</View>
		);
	}

	return (
		<SafeAreaView style={styles.container}>
			<ScrollView style={styles.scrollView}>
				<View style={styles.padding}>
					{/* From Coin Section */}
					<Text variant="labelLarge" style={{ marginBottom: 4 }}>From</Text>
					<TokenSelector
						style={styles.valueInfoContainer}
						selectedToken={fromCoin}
						onSelectToken={handleSelectFromToken}
						label={'Select Token'}
						amountValue={fromAmount || '0.00'}
						onAmountChange={handleFromAmountChange}
						isAmountEditable={true}
						showOnlyPortfolioTokens={true}
						testID="from-token-selector"
					/>

					<Button
						mode="elevated"
						icon={({ size, color }) => <SwapIcon size={size} color={color} />}
						onPress={handleSwapCoins}
						style={styles.valueInfoContainer}
					>
						Swap
					</Button>

					{/* To Coin Section */}
					<Text variant="labelLarge" style={{ marginBottom: 4 }}>To</Text>
					<TokenSelector
						style={styles.valueInfoContainer}
						selectedToken={toCoin ?? undefined}
						onSelectToken={handleSelectToToken}
						label={toCoin ? undefined : 'Select Token'}
						amountValue={toAmount}
						onAmountChange={handleToAmountChange}
						isAmountEditable={true}
						showOnlyPortfolioTokens={false}
						testID="to-token-selector"
					/>

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
					onPress={handleTradeSubmitClick}
					disabled={!fromAmount || !toAmount || isQuoteLoading}
					loading={isQuoteLoading}
					testID="trade-button"
				>
					{isQuoteLoading ? 'Fetching Quote...' : 'Trade'}
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
		</SafeAreaView>
	);
};

export default Trade;
