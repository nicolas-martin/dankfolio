import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, ScrollView, SafeAreaView } from 'react-native';
import { Text, Button, IconButton, Icon, Card } from 'react-native-paper'; // Removed Switch
import { useRoute, useNavigation } from '@react-navigation/native';
import { useToast } from '@components/Common/Toast';
import { useStyles } from './styles';
import { usePortfolioStore } from '@store/portfolio';
import { useCoinStore } from '@store/coins';
import { Coin } from '@/types';
import TokenSelector from '@components/Common/TokenSelector';
import AmountPercentageButtons from '@components/Common/AmountPercentageButtons';
import TradeConfirmation from '@components/Trade/TradeConfirmation';
import TradeStatusModal from '@components/Trade/TradeStatusModal';
// InputUnit import removed, TradeScreenRouteProp might also not need InputUnit if it was only for state
import { TradeScreenNavigationProp, TradeScreenRouteProp } from './types';

import {
	executeTrade,
	handleSwapCoins as swapCoinsUtil,
	handleSelectToken,
	handleTradeSubmit,
} from './scripts';
import { SOLANA_ADDRESS } from '@/utils/constants';
import { TradeDetailsProps } from '@components/Trade/TradeDetails/tradedetails_types';
import { logger } from '@/utils/logger';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { useTransactionsStore } from '@/store/transactions';
import { grpcApi } from '@/services/grpcApi';
import { useTransactionPolling, PollingStatus } from '@/hooks/useTransactionPolling';
import InfoState from '@/components/Common/InfoState';


const QUOTE_DEBOUNCE_MS = 1000;

const Trade: React.FC = () => {
	const navigation = useNavigation<TradeScreenNavigationProp>();
	const route = useRoute<TradeScreenRouteProp>();
	const [fromCoin, setFromCoin] = useState<Coin | null>(route.params.initialFromCoin || null);
	const [toCoin, setToCoin] = useState<Coin | null>(route.params.initialToCoin || null)
	const { tokens, wallet } = usePortfolioStore();
	const { getCoinByID } = useCoinStore();
	const [fromAmount, setFromAmount] = useState<string>('');
	const [toAmount, setToAmount] = useState<string>('');
	// inputUnit, usdAmount, and exchangeRate states are removed
	const [isQuoteLoading, setIsQuoteLoading] = useState<boolean>(false);
	const [tradeDetails, setTradeDetails] = useState<TradeDetailsProps>({
		exchangeRate: '0',
		gasFee: '0',
		priceImpactPct: '0',
		totalFee: '0'
	});
	const { showToast } = useToast();
	const styles = useStyles();
	const [isConfirmationVisible, setIsConfirmationVisible] = useState(false);
	const [isLoadingTrade, setIsLoadingTrade] = useState<boolean>(false);
	const [isStatusModalVisible, setIsStatusModalVisible] = useState(false);
	// const [submittedTxHash, setSubmittedTxHash] = useState<string | null>(null); // Removed as unused (polledTxHash from hook is used)
	// const [pollingStatus, setPollingStatus] = useState<PollingStatus>('pending'); // Removed as unused (currentPollingStatus from hook is used)
	// const [pollingConfirmations, setPollingConfirmations] = useState<number>(0); // Removed as unused (currentPollingConfirmations from hook is used)
	const [pollingError, setPollingError] = useState<string | null>(null); // This one IS used by TradeStatusModal
	// const quoteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null); // Will be managed by useDebouncedCallback

	// handleUnitToggle is removed

	const {
		txHash: polledTxHash,
		status: currentPollingStatus,
		// data: pollingData, // Not explicitly used here
		error: currentPollingErrorFromHook,
		confirmations: currentPollingConfirmationsFromHook, // Renamed to avoid conflict with local state if it existed
		startPolling: startTxPolling,
		// stopPolling: stopTxPollingHook, // Removed as unused
		resetPolling: resetTxPolling
	} = useTransactionPolling(
		grpcApi.getSwapStatus, // Pass the actual polling function
		undefined, // onSuccess
		(errorMsg) => showToast({ type: 'error', message: errorMsg || 'Transaction polling failed' }), // onError
		(finalData) => { // onFinalized
			if (wallet?.address && finalData && !finalData.error) {
				logger.info('[Trade] Transaction finalized successfully, refreshing portfolio.');
				usePortfolioStore.getState().fetchPortfolioBalance(wallet.address);
				useTransactionsStore.getState().fetchRecentTransactions(wallet.address); // Also refresh transactions
			}
		}
	);

	// useEffect to update local pollingError state if currentPollingErrorFromHook changes
	useEffect(() => {
		setPollingError(currentPollingErrorFromHook);
	}, [currentPollingErrorFromHook]);

	// Use currentPollingConfirmationsFromHook directly if pollingConfirmations state is removed
	const currentPollingConfirmations = currentPollingConfirmationsFromHook;


	// componentStopPolling, componentPollTradeStatus, componentStartPolling are removed

	// Initialize with SOL if no fromCoin provided
	useEffect(() => {
		logger.breadcrumb({ category: 'navigation', message: 'Viewed TradeScreen' });
		logger.log(`[Trade] Initialized with fromCoin: ${fromCoin?.symbol}, toCoin: ${toCoin?.symbol}`);

		if (!fromCoin) {
			getCoinByID(SOLANA_ADDRESS, false).then(solCoin => {
				if (solCoin) setFromCoin(solCoin);
			});
		}
	}, [fromCoin, getCoinByID, toCoin?.symbol]); // Added missing dependencies

	// useEffect for fetching USD exchangeRate is removed. TokenSelector handles its own rate.

	// Memoized portfolio tokens
	const fromPortfolioToken = useMemo(() => tokens.find(token => token.mintAddress === fromCoin?.mintAddress), [tokens, fromCoin]);

	// Cleanup intervals on unmount
	useEffect(() => {
		// Cleanup for quote fetching timeouts is handled by useDebouncedCallback's internal useEffect
		// Polling cleanup is handled by the useTransactionPolling hook's internal useEffect
		return () => {
			logger.info('[Trade] Component unmounting');
			// Any other non-hook related cleanup could go here
		};
	}, []);

	// Debounced function for fetching trade quotes
	const debouncedFetchQuote = useDebouncedCallback(
		async (currentAmount: string, currentFromCoin: Coin, currentToCoin: Coin, direction: 'from' | 'to') => {
			if (!currentFromCoin || !currentToCoin || !currentAmount || parseFloat(currentAmount) <= 0) {
				setIsQuoteLoading(false); // Ensure loading is stopped
				return;
			}

			setIsQuoteLoading(true);
			// Determine which amount to set based on direction
			const setTargetAmount = direction === 'from' ? setToAmount : setFromAmount;
			try {
				const quoteData = await grpcApi.getFullSwapQuoteOrchestrated(
					currentAmount,
					direction === 'from' ? currentFromCoin : currentToCoin, // actual fromCoin for API
					direction === 'from' ? currentToCoin : currentFromCoin  // actual toCoin for API
				);

				setTargetAmount(quoteData.estimatedAmount);
				setTradeDetails({
					exchangeRate: quoteData.exchangeRate,
					gasFee: quoteData.fee,
					priceImpactPct: quoteData.priceImpactPct,
					totalFee: quoteData.totalFee,
					route: quoteData.route
				});

			} catch (error) {
				showToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to fetch quote' });
				// Reset relevant states on error
				setTargetAmount('');
				setTradeDetails({ exchangeRate: '0', gasFee: '0', priceImpactPct: '0', totalFee: '0', route: '' });
			} finally {
				setIsQuoteLoading(false);
			}
		},
		QUOTE_DEBOUNCE_MS
	);

	const handleSelectFromToken = (token: Coin) => {
		handleSelectToken(
			'from', token, fromCoin, toCoin, setFromCoin,
			() => { setFromAmount(''); setToAmount(''); setTradeDetails({ exchangeRate: '0', gasFee: '0', priceImpactPct: '0', totalFee: '0', route: '' }); },
			handleSwapCoins
		);
	};

	const handleSelectToToken = (token: Coin) => {
		handleSelectToken(
			'to', token, toCoin, fromCoin, setToCoin,
			() => { setFromAmount(''); setToAmount(''); setTradeDetails({ exchangeRate: '0', gasFee: '0', priceImpactPct: '0', totalFee: '0', route: '' }); },
			handleSwapCoins
		);
	};

	const handleFromAmountChange = useCallback(
		// This 'amount' is now always the crypto amount, directly from TokenSelector's onAmountChange
		(amount: string) => {
			setFromAmount(amount); // Update the crypto fromAmount state

			if (fromCoin && toCoin) {
				if (!amount || amount === '.' || amount.endsWith('.') || parseFloat(amount) <= 0) {
					setToAmount('');
					setTradeDetails({ exchangeRate: '0', gasFee: '0', priceImpactPct: '0', totalFee: '0', route: '' });
					setIsQuoteLoading(false);
					return;
				}
				setIsQuoteLoading(true);
				debouncedFetchQuote(amount, fromCoin, toCoin, 'from');
			} else {
				setIsQuoteLoading(false);
				setToAmount('');
				setTradeDetails({ exchangeRate: '0', gasFee: '0', priceImpactPct: '0', totalFee: '0', route: '' });
			}
		},
		// Dependencies no longer include inputUnit, exchangeRate, setUsdAmount
		[fromCoin, toCoin, debouncedFetchQuote, setFromAmount, setToAmount, setTradeDetails, setIsQuoteLoading]
	);

	const handleToAmountChange = useCallback(
		(amount: string) => {
			setToAmount(amount);
			if (fromCoin && toCoin) {
				if (!amount || amount === '.' || amount.endsWith('.')) {
					setFromAmount('');
					setTradeDetails({ exchangeRate: '0', gasFee: '0', priceImpactPct: '0', totalFee: '0', route: '' });
					setIsQuoteLoading(false);
					return;
				}
				// Set loading immediately when amount changes
				setIsQuoteLoading(true);
				// For "to" amount changes, the API expects the changed amount to be the "fromAmount"
				// and the original "fromCoin" becomes the "toCoin" for the quote.
				debouncedFetchQuote(amount, toCoin, fromCoin, 'to');
			}
		},
		[fromCoin, toCoin, debouncedFetchQuote, setFromAmount, setToAmount, setTradeDetails, setIsQuoteLoading] // Added setters (setToAmount is already there but good to be explicit)
	);

	const handleTradeSubmitClick = () => {
		// pollingIntervalRef removed from args as it's managed by the hook now
		handleTradeSubmit(
			fromAmount,
			toAmount,
			wallet,
			fromCoin,
			fromPortfolioToken,
			// pollingIntervalRef,
			setIsConfirmationVisible,
			showToast
		);
	};

	const handleTradeConfirmClick = async () => {
		logger.breadcrumb({ category: 'trade', message: 'Trade confirmed by user', data: { fromCoin: fromCoin?.symbol, toCoin: toCoin?.symbol, fromAmount } });
		if (!fromCoin || !toCoin || !fromAmount) {
			showToast({ type: 'error', message: 'Missing required trade parameters' });
			return;
		}
		logger.info('[Trade] Stopping price polling and progress tracking before trade execution.');

		// Stop polling related to price quotes if any was active, before starting trade execution polling
		// This was previously clearing pollingIntervalRef, which is now managed by the hook for TX polling.
		// If there was a separate interval for price quotes, that would be cleared here.
		// For now, assuming quote fetching is timeout-based, not interval.
		// The main transaction polling is handled by useTransactionPolling.

		try {
			setIsLoadingTrade(true); // Indicate trade execution is starting
			setIsConfirmationVisible(false);

			const txHash = await executeTrade(fromCoin, toCoin, fromAmount, 1, showToast); // Modified executeTrade

			if (txHash) {
				// setSubmittedTxHash(txHash); // Not needed, txHash set via startTxPolling
				setIsStatusModalVisible(true);
				startTxPolling(txHash);
			} else {
				// Handle case where executeTrade didn't return a hash (e.g., pre-flight error)
				setIsLoadingTrade(false);
			}
		} catch (error) {
			// executeTrade should ideally handle its own errors and show toasts
			// If it re-throws, catch here
			logger.error('[Trade] Error during executeTrade or starting polling:', error);
			setIsLoadingTrade(false);
			showToast({ type: 'error', message: error instanceof Error ? error.message : 'Trade execution failed' });
		}
	};

	const handleSwapCoins = () => {
		logger.breadcrumb({ category: 'trade', message: 'Pressed swap tokens button', data: { fromCoin: fromCoin?.symbol, toCoin: toCoin?.symbol } });

		swapCoinsUtil(
			{ fromCoin, toCoin, fromAmount, toAmount },
			{ setFromCoin, setToCoin, setFromAmount, setToAmount }
		);
	};

	const handleCloseConfirmationModal = () => {
		logger.breadcrumb({ category: 'ui', message: 'Trade confirmation modal closed' });
		setIsConfirmationVisible(false);

		// DISABLED: Restart refresh timers - this was causing infinite loops
		logger.info('[Trade] Confirmation modal closed - refresh timers remain disabled');
	};

	// All hooks must be at top level before any conditional returns
	const exchangeRateLabelTextStyle = useMemo(() => [
		styles.detailLabel,
		styles.exchangeRateLabelText
	], [styles.detailLabel, styles.exchangeRateLabelText]);

	if (!wallet) {
		return (
			<SafeAreaView style={styles.container}>
				<InfoState
					title="Wallet Not Connected"
					emptyMessage="Please connect your wallet to trade."
					iconName="wallet-outline"
				/>
			</SafeAreaView>
		);
	}

	if (!fromCoin && !toCoin) { // Initial state, or both cleared
		return (
			<SafeAreaView style={styles.container}>
				<InfoState
					title="Select Tokens"
					emptyMessage="Please select the tokens you'd like to trade."
					iconName="swap-horizontal-bold"
				/>
			</SafeAreaView>
		);
	}

	// If one is selected but not the other (e.g. after initial param load for one coin)
	// This could be a more nuanced message or allow selection. For now, a generic message if one is missing.
	if (!fromCoin || !toCoin) {
		return (
			<SafeAreaView style={styles.container}>
				<InfoState
					title="Complete Pair"
					emptyMessage={!fromCoin ? "Please select the token to trade from." : "Please select the token to trade to."}
					iconName="help-circle-outline"
				/>
			</SafeAreaView>
		);
	}

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
			{/* USD Toggle Switch and related UI removed from here, will be inside TokenSelector for 'From' card */}
			<TokenSelector
				selectedToken={coin!}
				onSelectToken={onSelectToken}
				label="Select Token" // This label might be redundant if TokenSelector has its own internal label/placeholder logic
				amountValue={amount} // This is always crypto amount for both 'From' and 'To' cards
				onAmountChange={onAmountChange} // For 'From' card, this is simplified handleFromAmountChange
				isAmountEditable={true}
				showOnlyPortfolioTokens={showOnlyPortfolioTokens}
				testID={testID}
				// enableUsdToggle is now defaulted to true in TokenSelector, so no need to pass it for 'From' card.
				// For 'To' card, if we want to explicitly disable it (though default is true), we'd pass enableUsdToggle={false}.
				// However, since 'To' card should not have this feature, explicitly setting it to false is safer.
				enableUsdToggle={label === 'From'} // Keep this for explicitness: true for 'From', false for 'To'
				// textInputProps and helperText for 'From' card are managed by TokenSelector.
				// For 'To' card, which won't use USD toggle, we can pass basic placeholder/helper.
				textInputProps={label === 'To' ? { placeholder: `0.0000 ${toCoin?.symbol || 'Crypto'}` } : undefined}
				helperText={label === 'To' ? (coin ? `Estimated ${coin.symbol} amount` : 'Estimated amount') : undefined}
			/>
			{label === 'From' && coin && (
				<AmountPercentageButtons
					// key no longer needs inputUnit as it's managed inside TokenSelector
					key={`${coin.mintAddress}-${toCoin?.mintAddress || 'none'}`}
					balance={portfolioBalance || 0}
					onSelectAmount={(selectedAmount) => {
						// AmountPercentageButtons always provide crypto amount.
						// So, this should directly call onAmountChange which is handleFromAmountChange.
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
					left={(_props) => ( // Renamed props to _props
						<View style={styles.detailsIcon}>
							<Icon source="information" size={14} color={styles.colors.onPrimary} />
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
							<Icon source="swap-horizontal" size={16} color={styles.colors.onSurfaceVariant} />
							<Text style={exchangeRateLabelTextStyle}>Exchange Rate</Text>
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
						<View style={styles.toCardContainerStyle}>
							{/* Swap Button positioned relative to the To card */}
							<View style={styles.swapButtonContainer}>
								<IconButton
									icon="swap-vertical"
									size={20}
									iconColor={styles.colors.onPrimary}
									containerColor={styles.colors.primary}
									onPress={handleSwapCoins}
									disabled={!fromCoin || !toCoin}
									testID="swap-coins-button"
									style={styles.swapButton}
								/>
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
				onClose={() => {
					setIsStatusModalVisible(false);
					resetTxPolling(); // Reset hook state
					// componentStopPolling(); // Replaced by resetTxPolling or hook's internal stop
					navigation.reset({ index: 0, routes: [{ name: 'MainTabs', params: { screen: 'Home' } }] });
				}}
				isVisible={isStatusModalVisible}
				txHash={polledTxHash} // Use txHash from hook
				status={currentPollingStatus as PollingStatus} // Use status from hook
				confirmations={currentPollingConfirmations} // Use confirmations from hook
				error={pollingError} // Still using local pollingError, or switch to currentPollingErrorFromHook
			/>
		</SafeAreaView>
	);
};

export default Trade;
