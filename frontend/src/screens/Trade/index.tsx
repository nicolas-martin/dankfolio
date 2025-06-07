import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { Text, useTheme, Button, Icon, ProgressBar } from 'react-native-paper';
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
	QUOTE_DEBOUNCE_MS,
	PRICE_REFRESH_INTERVAL_MS,
	getCoinPrices
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
	const [refreshProgress, setRefreshProgress] = useState<number>(0);
	const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const refreshStartTimeRef = useRef<number>(0);

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
			if (fromCoin) {
				const coinFromMap = await getCoinByID(fromCoin.mintAddress, false);
				if (coinFromMap) {
					setFromCoin(coinFromMap);
				}
			} else {
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
			if (toCoin) {
				const coinFromMap = await getCoinByID(toCoin.mintAddress, false);
				if (coinFromMap) {
					setToCoin(coinFromMap);
				}
			}
		};
		initializeCoins();
	}, [inputCoin, outputCoin, initialFromCoin, initialToCoin, getCoinByID, fromCoin, toCoin]);

	const refreshPrices = async () => {
		logger.log('[Trade] Refreshing coin prices', { fromCoin: fromCoin?.symbol, toCoin: toCoin?.symbol, fromMint: fromCoin?.mintAddress, toMint: toCoin?.mintAddress });
		if (!fromCoin || !toCoin) {
			logger.log('[Trade] Skipping price refresh - missing coins');
			return;
		}

		// Only refresh if we have valid amounts
		const fromAmountNum = parseFloat(fromAmount || '0');
		const toAmountNum = parseFloat(toAmount || '0');
		if (fromAmountNum <= 0 && toAmountNum <= 0) {
			logger.log('[Trade] Skipping price refresh - no valid amounts entered');
			return;
		}

		try {
			logger.log('[Trade] Fetching fresh coin data for price refresh...');
			const prices = await getCoinPrices([fromCoin.mintAddress, toCoin.mintAddress]);
			if (prices) {
				setFromCoin(prevCoin => prevCoin ? ({ ...prevCoin, price: prices[prevCoin.mintAddress] ?? prevCoin.price }) : null);
				setToCoin(prevCoin => prevCoin ? ({ ...prevCoin, price: prices[prevCoin.mintAddress] ?? prevCoin.price }) : null);
				logger.log('[Trade] Successfully updated coin data from price refresh');
			} else {
				logger.warn('[Trade] getCoinPrices returned no prices.');
			}
		} catch (error: any) {
			logger.error('[Trade] Failed to refresh coin prices', { errorMessage: error?.message, fromCoinSymbol: fromCoin?.symbol, toCoinSymbol: toCoin?.symbol });
		}
	};



	// Setup polling interval when coins or amounts change
	useEffect(() => {
		logger.log('[Trade] Setting up coin price polling interval', { fromCoin: fromCoin?.symbol, toCoin: toCoin?.symbol, fromAmount, toAmount });

		// Clear any existing intervals
		if (pollingIntervalRef.current) {
			clearInterval(pollingIntervalRef.current);
			pollingIntervalRef.current = null;
		}
		if (progressIntervalRef.current) {
			clearInterval(progressIntervalRef.current);
			progressIntervalRef.current = null;
		}

		// Reset progress
		setRefreshProgress(0);

		// Only setup polling if we have both coins and valid amounts
		const hasValidAmounts = (parseFloat(fromAmount || '0') > 0) || (parseFloat(toAmount || '0') > 0);

		if (fromCoin && toCoin && hasValidAmounts) {
			logger.log('[Trade] Starting price polling with valid amounts', { fromAmount, toAmount });

			// Reset progress and start time
			refreshStartTimeRef.current = Date.now();

			// Setup price refresh interval
			pollingIntervalRef.current = setInterval(() => {
				refreshPrices();
				// Reset progress when refresh happens
				setRefreshProgress(0);
				refreshStartTimeRef.current = Date.now();
			}, PRICE_REFRESH_INTERVAL_MS);

			// Setup progress tracking interval (every 100ms)
			progressIntervalRef.current = setInterval(() => {
				const elapsed = Date.now() - refreshStartTimeRef.current;
				const progress = Math.min(elapsed / PRICE_REFRESH_INTERVAL_MS, 1);
				setRefreshProgress(progress);
			}, 100);
		} else {
			logger.log('[Trade] Not starting price polling - missing coins or amounts', {
				hasFromCoin: !!fromCoin,
				hasToCoin: !!toCoin,
				hasValidAmounts,
				fromAmount,
				toAmount
			});
		}

		return () => {
			logger.log('[Trade] Cleaning up price polling interval', { fromCoin: fromCoin?.symbol, toCoin: toCoin?.symbol });
			if (pollingIntervalRef.current) {
				clearInterval(pollingIntervalRef.current);
				pollingIntervalRef.current = null;
				logger.log('[Trade] Price polling interval cleared successfully');
			}
			if (progressIntervalRef.current) {
				clearInterval(progressIntervalRef.current);
				progressIntervalRef.current = null;
			}
		};
	}, [fromCoin?.mintAddress, toCoin?.mintAddress, fromAmount, toAmount]);



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
		if (progressIntervalRef.current) {
			clearInterval(progressIntervalRef.current);
			progressIntervalRef.current = null;
		}
		setRefreshProgress(0);

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
			// Clean up price refresh and progress intervals
			if (pollingIntervalRef.current) {
				clearInterval(pollingIntervalRef.current);
				pollingIntervalRef.current = null;
			}
			if (progressIntervalRef.current) {
				clearInterval(progressIntervalRef.current);
				progressIntervalRef.current = null;
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
		if (progressIntervalRef.current) {
			clearInterval(progressIntervalRef.current);
			progressIntervalRef.current = null;
			logger.info('[Trade] Progress tracking stopped.');
		}

		// Reset progress to prevent UI issues
		setRefreshProgress(0);

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
	}, [navigation, componentStopPolling, submittedTxHash, pollingStatus, wallet]); // Added wallet to dependencies

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

		// Restart refresh timers if we have valid amounts and coins
		const hasValidAmounts = (parseFloat(fromAmount || '0') > 0) || (parseFloat(toAmount || '0') > 0);
		if (fromCoin && toCoin && hasValidAmounts) {
			logger.info('[Trade] Restarting refresh timers after confirmation modal close');

			// Reset progress and start time
			setRefreshProgress(0);
			refreshStartTimeRef.current = Date.now();

			// Setup price refresh interval
			pollingIntervalRef.current = setInterval(() => {
				refreshPrices();
				// Reset progress when refresh happens
				setRefreshProgress(0);
				refreshStartTimeRef.current = Date.now();
			}, PRICE_REFRESH_INTERVAL_MS);

			// Setup progress tracking interval (every 100ms)
			progressIntervalRef.current = setInterval(() => {
				const elapsed = Date.now() - refreshStartTimeRef.current;
				const progress = Math.min(elapsed / PRICE_REFRESH_INTERVAL_MS, 1);
				setRefreshProgress(progress);
			}, 100);
		}
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
			<>
				<View style={styles.detailsContainer}>
					<View style={styles.detailsHeader}>
						<View style={styles.detailsIcon}>
							<Icon source="information" size={14} color={theme.colors.onPrimary} />
						</View>
						<Text style={styles.detailsTitle}>Trade Details</Text>
					</View>

					<View style={styles.detailRow}>
						<Text style={styles.detailLabel}>Price Impact</Text>
						<Text style={styles.detailValue}>
							{priceImpact.toFixed(2)}%
						</Text>
					</View>

					<View style={styles.detailRow}>
						<Text style={styles.detailLabel}>Network Fee</Text>
						<Text style={styles.detailValue}>{tradeDetails.totalFee} SOL</Text>
					</View>

					{tradeDetails.route && (
						<View style={styles.detailRow}>
							<Text style={styles.detailLabel}>Route</Text>
							<Text style={styles.detailValue}>{tradeDetails.route}</Text>
						</View>
					)}

					<View style={styles.exchangeRateRow}>
						<View style={styles.exchangeRateLabel}>
							<Icon source="swap-horizontal" size={16} color={theme.colors.onSurfaceVariant} />
							<Text style={[styles.detailLabel, { marginLeft: 4 }]}>Exchange Rate</Text>
						</View>
						<Text style={styles.exchangeRateValue}>
							1 {fromCoin?.symbol} = {(parseFloat(tradeDetails.exchangeRate) || 0).toFixed(6)} {toCoin?.symbol}
						</Text>
					</View>
				</View>
			</>
		);
	};

	return (
		<SafeAreaView style={styles.container}>
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
						<View style={{ position: 'relative' }}>
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

					{/* Refresh Progress Bar */}
					{fromCoin && toCoin && ((parseFloat(fromAmount || '0') > 0) || (parseFloat(toAmount || '0') > 0)) && (
						<View style={styles.refreshProgressContainer}>
							<View style={styles.refreshProgressHeader}>
								<View style={styles.refreshProgressIcon}>
									<Icon
										source="refresh"
										size={16}
										color={theme.colors.onSurfaceVariant}
									/>
								</View>
								<Text style={styles.refreshProgressText}>
									Price Refresh Timer
								</Text>
							</View>
							<ProgressBar
								progress={refreshProgress}
								color={theme.colors.primary}
								style={styles.refreshProgressBar}
								testID="refresh-progress-bar"
							/>
							<Text style={styles.refreshProgressLabel}>
								{refreshProgress >= 1 ? 'Refreshing...' : `Next refresh in ${Math.ceil((1 - refreshProgress) * (PRICE_REFRESH_INTERVAL_MS / 1000))}s`}
							</Text>
						</View>
					)}

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
				txHash={submittedTxHash}
				status={pollingStatus}
				confirmations={pollingConfirmations}
				error={pollingError}
			/>
		</SafeAreaView>
	);
};

export default Trade;
