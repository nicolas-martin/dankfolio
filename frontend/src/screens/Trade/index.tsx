import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { Text, useTheme, Button, Icon, Card } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useToast } from '@components/Common/Toast';
import { createStyles } from './trade_styles';
import { usePortfolioStore } from '@store/portfolio';
import { useTransactionsStore } from '@/store/transactions'; // Added
import { useCoinStore } from '@store/coins';
import { Coin } from '@/types';
import TokenSelector from '@components/Common/TokenSelector';
import AmountPercentageButtons from '@components/Common/AmountPercentageButtons';
import TradeConfirmation from '@components/Trade/TradeConfirmation';
import TradeStatusModal from '@components/Trade/TradeStatusModal';
import { TradeScreenNavigationProp, TradeScreenRouteProp } from './trade_types';

import { PollingStatus } from '@components/Trade/TradeStatusModal/types';
import {
	fetchTradeQuote,
	executeTrade,
	pollTradeStatus,
	startPolling,
	stopPolling,
	handleSwapCoins as swapCoinsUtil,
	QUOTE_DEBOUNCE_MS
} from './trade_scripts';
import { TradeDetailsProps } from '@components/Trade/TradeDetails/tradedetails_types';
import { SOLANA_ADDRESS } from '@/utils/constants';
import { logger } from '@/utils/logger';


const Trade: React.FC = () => {
	const navigation = useNavigation<TradeScreenNavigationProp>();
	const route = useRoute<TradeScreenRouteProp>();
	const { inputCoin = null, outputCoin = null, initialFromCoin = null, initialToCoin = null } = route.params || {};
	const { tokens, wallet } = usePortfolioStore();
	const { getCoinByID } = useCoinStore();
	const [fromCoin, setFromCoin] = useState<Coin | null>(inputCoin || initialFromCoin);
	const [toCoin, setToCoin] = useState<Coin | null>(outputCoin || initialToCoin || null);
	const [fromAmount, setFromAmount] = useState<string>('');
	const [toAmount, setToAmount] = useState<string>('');
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
	const [isConfirmationVisible, setIsConfirmationVisible] = useState(false);
	const [isLoadingTrade, setIsLoadingTrade] = useState<boolean>(false);
	const [isStatusModalVisible, setIsStatusModalVisible] = useState(false);
	const [submittedTxHash, setSubmittedTxHash] = useState<string | null>(null);
	const [pollingStatus, setPollingStatus] = useState<PollingStatus>('pending');
	const [pollingConfirmations, setPollingConfirmations] = useState<number>(0);
	const [pollingError, setPollingError] = useState<string | null>(null);
	const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const quoteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	// DISABLED: Refresh progress state variables - were causing excessive callbacks
	// const [refreshProgress, setRefreshProgress] = useState<number>(0);
	// const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
	// const refreshStartTimeRef = useRef<number>(0);

	const componentStopPolling = () => {
		stopPolling(pollingIntervalRef, setIsLoadingTrade);
	};

	const componentPollTradeStatus = async (txHash: string) => {
		await pollTradeStatus(txHash, setPollingConfirmations, setPollingStatus, setPollingError, componentStopPolling, showToast, wallet);
	};

	const componentStartPolling = (txHash: string) => {
		startPolling(txHash, () => componentPollTradeStatus(txHash), componentStopPolling, pollingIntervalRef);
	};

	useEffect(() => {
		logger.breadcrumb({ category: 'navigation', message: 'Viewed TradeScreen' });
		logger.log(`[Trade] Initializing with inputCoin: ${(inputCoin || initialFromCoin)?.symbol}, outputCoin: ${(outputCoin || initialToCoin)?.symbol}`);
		const initializeCoins = async () => {
			// Handle initialFromCoin
			if (inputCoin || initialFromCoin) {
				const coinToUse = inputCoin || initialFromCoin;
				const coinFromMap = await getCoinByID(coinToUse!.mintAddress, false);
				if (coinFromMap) {
					setFromCoin(coinFromMap);
				}
			} else if (!fromCoin) {
				const solCoin = await getCoinByID(SOLANA_ADDRESS, false);
				if (solCoin) {
					setFromCoin(solCoin);
				} else {
					const solCoinFromApi = await getCoinByID(SOLANA_ADDRESS, true);
					if (solCoinFromApi) {
						setFromCoin(solCoinFromApi);
					}
				}
			}

			// Handle initialToCoin
			if (outputCoin || initialToCoin) {
				const coinToUse = outputCoin || initialToCoin;
				const coinFromMap = await getCoinByID(coinToUse!.mintAddress, false);
				if (coinFromMap) {
					setToCoin(coinFromMap);
				}
			}
		};
		initializeCoins();
	}, [inputCoin, outputCoin, initialFromCoin, initialToCoin, getCoinByID]);

	// DISABLED: refreshPrices function - was causing excessive callbacks
	// const refreshPrices = useCallback(async () => { ... }, []);



	// Memoize mint addresses to prevent unnecessary re-renders
	const fromMintAddress = useMemo(() => fromCoin?.mintAddress, [fromCoin?.mintAddress]);
	const toMintAddress = useMemo(() => toCoin?.mintAddress, [toCoin?.mintAddress]);

	// DISABLED: Setup polling interval when coins or amounts change
	// This was causing excessive callbacks and infinite loops
	// TODO: Re-implement with better debouncing and cleanup logic
	useEffect(() => {
		logger.log('[Trade] Price polling DISABLED to prevent excessive callbacks');
		
		// Clear any existing intervals
		if (pollingIntervalRef.current) {
			clearInterval(pollingIntervalRef.current);
			pollingIntervalRef.current = null;
		}

		return () => {
			logger.log('[Trade] Cleaning up any remaining intervals');
			if (pollingIntervalRef.current) {
				clearInterval(pollingIntervalRef.current);
				pollingIntervalRef.current = null;
			}
		};
	}, []);



	useEffect(() => {
		logger.log('[Trade] Trade screen mounted (second useEffect, consider merging if appropriate)');
		return () => {
			logger.log('[Trade] Trade screen unmounted (second useEffect, consider merging if appropriate)');
		};
	}, []);

	const fromPortfolioToken = useMemo(() => tokens.find(token => token.mintAddress === fromCoin?.mintAddress), [tokens, fromCoin]);
	const toPortfolioToken = useMemo(() => tokens.find(token => token.mintAddress === toCoin?.mintAddress), [tokens, toCoin]);

	const handleSelectFromToken = (token: Coin) => {
		logger.breadcrumb({ category: 'trade', message: 'Selected "from" token', data: { tokenSymbol: token.symbol, fromAmount, currentToTokenSymbol: toCoin?.symbol } });
		logger.log('[Trade] handleSelectFromToken called', { newTokenSymbol: token.symbol, currentFromAmount: fromAmount, currentToTokenSymbol: toCoin?.symbol, isSameAsCurrent: token.mintAddress === fromCoin?.mintAddress });
		if (token.mintAddress === fromCoin?.mintAddress) {
			logger.log('[Trade] Skipping "from" token selection - same token already selected');
			return;
		}
		if (token.mintAddress === toCoin?.mintAddress) {
			logger.log('[Trade] Selected "from" token is the same as current "to" token. Swapping tokens.');
			handleSwapCoins();
		} else {
			setFromCoin(token);
			if (fromCoin && token.mintAddress !== fromCoin.mintAddress) {
				logger.log('[Trade] Clearing amounts due to new "from" token selection');
				setFromAmount('');
				setToAmount('');
			}
		}
	};

	const handleSelectToToken = (token: Coin) => {
		logger.breadcrumb({ category: 'trade', message: 'Selected "to" token', data: { tokenSymbol: token.symbol, currentToAmount: toAmount, currentFromTokenSymbol: fromCoin?.symbol } });
		logger.log('[Trade] handleSelectToToken called', { newTokenSymbol: token.symbol, currentToAmount: toAmount, currentFromTokenSymbol: fromCoin?.symbol, isSameAsCurrent: token.mintAddress === toCoin?.mintAddress });
		if (token.mintAddress === toCoin?.mintAddress) {
			logger.log('[Trade] Skipping "to" token selection - same token already selected');
			return;
		}
		if (token.mintAddress === fromCoin?.mintAddress) {
			logger.log('[Trade] Selected "to" token is the same as current "from" token. Swapping tokens.');
			handleSwapCoins();
		} else {
			setToCoin(token);
			if (toCoin && token.mintAddress !== toCoin.mintAddress) {
				logger.log('[Trade] Clearing amounts due to new "to" token selection');
				setFromAmount('');
				setToAmount('');
			}
		}
	};

	const handleFromAmountChange = useCallback((amount: string) => {
		logger.log('[Trade] handleFromAmountChange START', { amount, fromCoinSymbol: fromCoin?.symbol, toCoinSymbol: toCoin?.symbol });
		setFromAmount(amount);
		logger.log('[Trade] Setting fromAmount in state', { amount });
		if (!amount || amount === '.' || amount.endsWith('.')) {
			logger.log('[Trade] Skipping quote fetch: incomplete number input for fromAmount', { amount });
			return;
		}
		if (!fromCoin || !toCoin) {
			logger.log('[Trade] Skipping quote fetch: missing fromCoin or toCoin in fromAmountChange');
			return;
		}
		logger.log('[Trade] Preparing to fetch trade quote due to fromAmount change', { amount, fromCoinSymbol: fromCoin?.symbol, toCoinSymbol: toCoin?.symbol });
		if (quoteTimeoutRef.current) {
			logger.log('[Trade] Clearing existing quote fetch timeout (fromAmountChange)');
			clearTimeout(quoteTimeoutRef.current);
		}
		setIsQuoteLoading(true);
		quoteTimeoutRef.current = setTimeout(async () => {
			logger.breadcrumb({ category: 'trade', message: "Fetching quote for 'from' amount change", data: { amount, fromCoin: fromCoin?.symbol, toCoin: toCoin?.symbol } });
			logger.log('[Trade] Quote fetch timeout triggered (fromAmountChange)', { amount });
			try {
				await fetchTradeQuote(amount, fromCoin, toCoin, setIsQuoteLoading, setToAmount, setTradeDetails);
			} catch (error: any) {
				logger.error('[Trade] Error fetching trade quote (fromAmountChange)', { errorMessage: error?.message, amount, fromCoinSymbol: fromCoin?.symbol, toCoinSymbol: toCoin?.symbol });
				showToast({ type: 'error', message: error?.message || 'Failed to fetch trade quote' });
			}
			quoteTimeoutRef.current = null;
		}, QUOTE_DEBOUNCE_MS);
	}, [fromCoin, toCoin, fetchTradeQuote, setIsQuoteLoading, setToAmount, setTradeDetails, showToast]);

	const handleToAmountChange = useCallback((amount: string) => {
		logger.log('[Trade] handleToAmountChange START', { amount, fromCoinSymbol: fromCoin?.symbol, toCoinSymbol: toCoin?.symbol });
		setToAmount(amount);
		logger.log('[Trade] Setting toAmount in state', { amount });
		if (!amount || amount === '.' || amount.endsWith('.')) {
			logger.log('[Trade] Skipping quote fetch: incomplete number input for toAmount', { amount });
			return;
		}
		if (!fromCoin || !toCoin) {
			logger.log('[Trade] Skipping quote fetch: missing fromCoin or toCoin in toAmountChange');
			return;
		}
		logger.log('[Trade] Preparing to fetch trade quote due to toAmount change (solving for fromAmount)', { amount, fromCoinSymbol: fromCoin?.symbol, toCoinSymbol: toCoin?.symbol });
		if (quoteTimeoutRef.current) {
			logger.log('[Trade] Clearing existing quote fetch timeout (toAmountChange)');
			clearTimeout(quoteTimeoutRef.current);
		}
		setIsQuoteLoading(true);
		quoteTimeoutRef.current = setTimeout(async () => {
			logger.breadcrumb({ category: 'trade', message: "Fetching quote for 'to' amount change", data: { amount, fromCoin: fromCoin?.symbol, toCoin: toCoin?.symbol } });
			logger.log('[Trade] Quote fetch timeout triggered (toAmountChange)', { amount });
			try {
				await fetchTradeQuote(amount, toCoin, fromCoin, setIsQuoteLoading, setFromAmount, setTradeDetails);
			} catch (error: any) {
				logger.error('[Trade] Error fetching trade quote (toAmountChange)', { errorMessage: error?.message, amount, fromCoinSymbol: fromCoin?.symbol, toCoinSymbol: toCoin?.symbol });
				showToast({ type: 'error', message: error?.message || 'Failed to fetch trade quote' });
			}
			quoteTimeoutRef.current = null;
		}, QUOTE_DEBOUNCE_MS);
	}, [fromCoin, toCoin, fetchTradeQuote, setIsQuoteLoading, setFromAmount, setTradeDetails, showToast]);

	const handleTradeSubmitClick = () => {
		logger.breadcrumb({ category: 'trade', message: 'Trade button pressed, validating trade', data: { fromCoin: fromCoin?.symbol, toCoin: toCoin?.symbol, fromAmount, toAmount } });
		if (!fromAmount || !toAmount || !wallet) {
			showToast({ type: 'error', message: !wallet ? 'Please connect your wallet' : 'Please enter valid amounts' });
			return;
		}
		const numericFromAmount = parseFloat(fromAmount);
		const availableBalance = fromPortfolioToken?.amount ?? 0;
		if (numericFromAmount > availableBalance) {
			showToast({ type: 'error', message: `Insufficient ${fromCoin?.symbol ?? 'funds'}. You only have ${availableBalance.toFixed(6)} ${fromCoin?.symbol ?? ''}.` });
			return;
		}

		logger.info('[Trade] Stopping refresh timers before opening confirmation modal');
		// Stop refresh timers when opening confirmation modal
		if (pollingIntervalRef.current) {
			clearInterval(pollingIntervalRef.current);
			pollingIntervalRef.current = null;
		}

		logger.breadcrumb({ category: 'ui', message: 'Trade confirmation modal opened', data: { fromCoin: fromCoin?.symbol, toCoin: toCoin?.symbol, fromAmount, toAmount } });
		setIsConfirmationVisible(true);
	};

	useEffect(() => {
		return () => {
			logger.info('[Trade] Component unmounting - cleaning up all intervals and timeouts');
			componentStopPolling();
			if (quoteTimeoutRef.current) {
				clearTimeout(quoteTimeoutRef.current);
				quoteTimeoutRef.current = null;
			}
			// Clean up price refresh intervals
			if (pollingIntervalRef.current) {
				clearInterval(pollingIntervalRef.current);
				pollingIntervalRef.current = null;
			}
		};
	}, []);

	const handleTradeConfirmClick = async () => {
		logger.breadcrumb({ category: 'trade', message: 'Trade confirmed by user', data: { fromCoin: fromCoin?.symbol, toCoin: toCoin?.symbol, fromAmount } });
		if (!fromCoin || !toCoin || !fromAmount) {
			showToast({ type: 'error', message: 'Missing required trade parameters' });
			return;
		}
		logger.info('[Trade] Stopping price polling and progress tracking before trade execution.');

		// Stop all intervals to prevent infinite loops
		if (pollingIntervalRef.current) {
			clearInterval(pollingIntervalRef.current);
			pollingIntervalRef.current = null;
			logger.info('[Trade] Price polling stopped.');
		}

		await executeTrade(fromCoin, toCoin, fromAmount, 1, showToast, setIsLoadingTrade, setIsConfirmationVisible, setPollingStatus, setSubmittedTxHash, setPollingError, setPollingConfirmations, setIsStatusModalVisible, componentStartPolling);
	};

	const handleCloseStatusModal = useCallback(() => {
		logger.breadcrumb({ category: 'ui', message: 'Trade status modal closed', data: { submittedTxHash, pollingStatus } });
		logger.info('[Trade] Cleaning up trade screen and resetting state after status modal close.');
		setIsStatusModalVisible(false);
		componentStopPolling();

		if (pollingStatus === 'finalized' && wallet?.address) {
			logger.info('[Trade] Refreshing portfolio and transactions after successful trade.');
			usePortfolioStore.getState().fetchPortfolioBalance(wallet.address);
			useTransactionsStore.getState().fetchRecentTransactions(wallet.address);
		}

		setFromAmount('');
		setToAmount('');
		setTradeDetails({ exchangeRate: '0', gasFee: '0', priceImpactPct: '0', totalFee: '0' });
		navigation.reset({ index: 0, routes: [{ name: 'MainTabs', params: { screen: 'Home' } }] });
	}, [navigation, componentStopPolling, submittedTxHash, pollingStatus, wallet]);

	const handleTryAgain = useCallback(() => {
		logger.breadcrumb({ category: 'trade', message: 'User clicked Try Again after failed transaction' });
		logger.info('[Trade] Resetting trade state for retry attempt.');
		
		// Close the status modal
		setIsStatusModalVisible(false);
		componentStopPolling();
		
		// Reset trade state but keep the coin selection and amounts
		setSubmittedTxHash(null);
		setPollingStatus('pending');
		setPollingConfirmations(0);
		setPollingError(null);
		setIsLoadingTrade(false);
		
		// Show the confirmation modal again to retry
		setIsConfirmationVisible(true);
	}, [componentStopPolling]);

	const handleSwapCoins = () => {
		logger.breadcrumb({ category: 'trade', message: 'Pressed swap tokens button', data: { fromCoin: fromCoin?.symbol, toCoin: toCoin?.symbol } });
		logger.log('[Trade] handleSwapCoins START', { fromCoinSymbol: fromCoin?.symbol, toCoinSymbol: toCoin?.symbol, fromAmount, toAmount });
		if (!fromCoin || !toCoin) {
			logger.warn('[Trade] Cannot swap with null coins', { fromCoinSymbol: fromCoin?.symbol, toCoinSymbol: toCoin?.symbol });
			return;
		}
		swapCoinsUtil(fromCoin, toCoin, setFromCoin, setToCoin, fromAmount, setFromAmount, toAmount, setToAmount);
		logger.log('[Trade] Swap completed successfully via utility');
	};

	const handleCloseConfirmationModal = () => {
		logger.breadcrumb({ category: 'ui', message: 'Trade confirmation modal closed' });
		setIsConfirmationVisible(false);
		
		// DISABLED: Restart refresh timers - this was causing infinite loops
		logger.info('[Trade] Confirmation modal closed - refresh timers remain disabled');
	};

	if (!toCoin) return (
		<View style={styles.noWalletContainer}>
			<Text style={styles.noWalletText}>
				Invalid trade pair. Please select coins to trade.
			</Text>
		</View>
	);

	if (!wallet) return (
		<View style={styles.noWalletContainer}>
			<Text style={styles.noWalletText}>
				Please connect your wallet to trade
			</Text>
		</View>
	);

	if (!fromCoin) return (
		<View style={styles.noWalletContainer}>
			<Text style={styles.noWalletText}>
				Please select a coin to trade from
			</Text>
		</View>
	);

	const renderTradeCard = (
		label: string,
		coin: Coin | null,
		amount: string,
		onSelectToken: (token: Coin) => void,
		onAmountChange: (amount: string) => void,
		showOnlyPortfolioTokens: boolean,
		testID: string,
		portfolioBalance?: number // Optional: balance for the percentage buttons
	) => (
		<View 
			style={styles.tradeCard}
		>
			<Text style={styles.cardLabel}>{label}</Text>
			<TokenSelector
				selectedToken={coin!}
				onSelectToken={onSelectToken}
				label="Select Token"
				amountValue={amount}
				onAmountChange={onAmountChange}
				isAmountEditable={true}
				showOnlyPortfolioTokens={showOnlyPortfolioTokens}
				testID={testID}
			/>
			{label === 'From' && coin && portfolioBalance !== undefined && (
				<AmountPercentageButtons
					balance={portfolioBalance}
					onSelectAmount={(selectedAmount) => {
						onAmountChange(selectedAmount);
					}}
				/>
			)}
		</View>
	);

	const renderTradeDetails = () => {
		if (!fromAmount || !toAmount || !tradeDetails.exchangeRate || tradeDetails.exchangeRate === '0') {
			return null;
		}

		const priceImpact = parseFloat(tradeDetails.priceImpactPct);

		return (
			<Card style={styles.detailsCard} testID="trade-details-card">
				<Card.Title
					title="Trade Details"
					left={(props) => (
						<View style={styles.detailsIcon}>
							<Icon source="information" size={14} color={theme.colors.onPrimary} />
						</View>
					)}
					titleStyle={styles.detailsTitle}
				/>
				<Card.Content style={styles.detailsContent}>
					<View style={styles.detailRow}>
						<Text style={styles.detailLabel}>Price Impact</Text>
						<Text testID="trade-details-price-impact" style={styles.detailValue}>
							{priceImpact.toFixed(2)}%
						</Text>
					</View>

					<View style={styles.detailRow}>
						<Text style={styles.detailLabel}>Network Fee</Text>
						<Text testID="trade-details-network-fee" style={styles.detailValue}>{tradeDetails.totalFee} SOL</Text>
					</View>

					{tradeDetails.route && (
						<View style={styles.detailRow}>
							<Text style={styles.detailLabel}>Route</Text>
							<Text testID="trade-details-route" style={styles.detailValue}>{tradeDetails.route}</Text>
						</View>
					)}

					<View style={styles.exchangeRateRow}>
						<View style={styles.exchangeRateLabel}>
							<Icon source="swap-horizontal" size={16} color={theme.colors.onSurfaceVariant} />
							<Text style={[styles.detailLabel, { marginLeft: 4 }]}>Exchange Rate</Text>
						</View>
						<Text testID="trade-details-exchange-rate" style={styles.exchangeRateValue}>
							1 {fromCoin?.symbol} = {(parseFloat(tradeDetails.exchangeRate) || 0).toFixed(6)} {toCoin?.symbol}
						</Text>
					</View>
				</Card.Content>
			</Card>
		);
	};

	return (
		<SafeAreaView style={styles.container} testID="trade-screen">
			<ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
				<View style={styles.content}>

					{/* Trade Cards with Swap Button */}
					<View style={styles.tradeContainer}>
						{/* From Card */}
						{renderTradeCard(
							'From',
							fromCoin,
							fromAmount,
							handleSelectFromToken,
							handleFromAmountChange,
							true,
							'from-token-selector',
							fromPortfolioToken?.amount // Pass the balance from portfolio
						)}

						{/* To Card with Swap Button */}
						<View style={{ position: 'relative', marginTop: -8 }}>
							{/* Swap Button positioned relative to the To card */}
							<View style={styles.swapButtonContainer}>
								<TouchableOpacity
									style={styles.swapButton}
									onPress={handleSwapCoins}
									disabled={!fromCoin || !toCoin}
									testID="swap-coins-button"
								>
									<Icon
										source="swap-vertical"
										size={20}
										color={theme.colors.onPrimary}
									/>
								</TouchableOpacity>
							</View>
							
							{renderTradeCard(
								'To',
								toCoin,
								toAmount,
								handleSelectToToken,
								handleToAmountChange,
								false,
								'to-token-selector'
							)}
						</View>
					</View>

					{/* DISABLED: Refresh Progress Bar - was causing excessive callbacks */}

					{/* Trade Details */}
					{renderTradeDetails()}


				</View>
			</ScrollView>

			{/* Action Button */}
			<View style={styles.actionContainer}>
				<Button
					mode="contained"
					onPress={handleTradeSubmitClick}
					disabled={!fromAmount || !toAmount || isQuoteLoading}
					loading={isQuoteLoading}
					style={styles.tradeButton}
					contentStyle={styles.tradeButtonContent}
					labelStyle={styles.tradeButtonLabel}
					testID="trade-button"
				>
					{isQuoteLoading ? 'Fetching Quote...' : 'Trade'}
				</Button>
			</View>

			{/* Modals */}
			{fromCoin && toCoin && (
				<TradeConfirmation
					isVisible={isConfirmationVisible}
					onClose={handleCloseConfirmationModal}
					onConfirm={handleTradeConfirmClick}
					fromAmount={fromAmount}
					toAmount={toAmount}
					fromToken={fromCoin}
					toToken={toCoin}
					fees={tradeDetails}
					isLoading={isLoadingTrade}
				/>
			)}
			<TradeStatusModal
				isVisible={isStatusModalVisible}
				onClose={handleCloseStatusModal}
				onTryAgain={handleTryAgain}
				txHash={submittedTxHash}
				status={pollingStatus}
				confirmations={pollingConfirmations}
				error={pollingError}
			/>
		</SafeAreaView>
	);
};

export default Trade;
