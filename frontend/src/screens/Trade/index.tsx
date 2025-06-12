import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { Text, Button, Icon, Card } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useToast } from '@components/Common/Toast';
import { useStyles } from './styles';
import { usePortfolioStore } from '@store/portfolio';
// Added
import { useCoinStore } from '@store/coins';
import { Coin } from '@/types';
import TokenSelector from '@components/Common/TokenSelector';
import AmountPercentageButtons from '@components/Common/AmountPercentageButtons';
import TradeConfirmation from '@components/Trade/TradeConfirmation';
import TradeStatusModal from '@components/Trade/TradeStatusModal';
import { TradeScreenNavigationProp, TradeScreenRouteProp } from './types';

import { PollingStatus } from '@components/Trade/TradeStatusModal/types';
import {
	executeTrade,
	pollTradeStatus,
	startPolling,
	stopPolling,
	handleSwapCoins as swapCoinsUtil,
	handleSelectToken,
	handleAmountChange,
	handleTradeSubmit,
} from './scripts';
import { SOLANA_ADDRESS } from '@/utils/constants';
import { TradeDetailsProps } from '@components/Trade/TradeDetails/tradedetails_types';
import { logger } from '@/utils/logger';


const Trade: React.FC = () => {
	const navigation = useNavigation<TradeScreenNavigationProp>();
	const route = useRoute<TradeScreenRouteProp>();
	const [fromCoin, setFromCoin] = useState<Coin | null>(route.params.initialFromCoin || null)
	const [toCoin, setToCoin] = useState<Coin | null>(route.params.initialToCoin || null)
	const { tokens, wallet } = usePortfolioStore();
	const { getCoinByID } = useCoinStore();
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
	const styles = useStyles();
	const [isConfirmationVisible, setIsConfirmationVisible] = useState(false);
	const [isLoadingTrade, setIsLoadingTrade] = useState<boolean>(false);
	const [isStatusModalVisible, setIsStatusModalVisible] = useState(false);
	const [submittedTxHash, setSubmittedTxHash] = useState<string | null>(null);
	const [pollingStatus, setPollingStatus] = useState<PollingStatus>('pending');
	const [pollingConfirmations, setPollingConfirmations] = useState<number>(0);
	const [pollingError, setPollingError] = useState<string | null>(null);
	const pollingIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const quoteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const componentStopPolling = useCallback(() => {
		stopPolling(pollingIntervalRef, setIsLoadingTrade);
	}, [pollingIntervalRef, setIsLoadingTrade]);

	const componentPollTradeStatus = async (txHash: string) => {
		await pollTradeStatus(txHash, setPollingConfirmations, setPollingStatus, setPollingError, componentStopPolling);
	};

	const componentStartPolling = (txHash: string) => {
		startPolling(txHash, () => componentPollTradeStatus(txHash), componentStopPolling, pollingIntervalRef);
	};

	// Initialize with SOL if no fromCoin provided
	useEffect(() => {
		logger.breadcrumb({ category: 'navigation', message: 'Viewed TradeScreen' });
		logger.log(`[Trade] Initialized with fromCoin: ${fromCoin?.symbol}, toCoin: ${toCoin?.symbol}`);

		if (!fromCoin) {
			getCoinByID(SOLANA_ADDRESS, false).then(solCoin => {
				if (solCoin) setFromCoin(solCoin);
			});
		}
	}, [fromCoin, getCoinByID]);

	// Memoized portfolio tokens
	const fromPortfolioToken = useMemo(() => tokens.find(token => token.mintAddress === fromCoin?.mintAddress), [tokens, fromCoin]);

	// Cleanup intervals on unmount
	useEffect(() => {
		return () => {
			logger.info('[Trade] Component unmounting - cleaning up all intervals and timeouts');
			componentStopPolling();
			if (quoteTimeoutRef.current) {
				clearTimeout(quoteTimeoutRef.current);
				quoteTimeoutRef.current = null;
			}
			if (pollingIntervalRef.current) {
				clearInterval(pollingIntervalRef.current);
				pollingIntervalRef.current = null;
			}
		};
	}, [componentStopPolling]);

	const handleSelectFromToken = (token: Coin) => {
		handleSelectToken(
			'from',
			token,
			fromCoin,
			toCoin,
			setFromCoin,
			setToCoin,
			setFromAmount,
			setToAmount,
			handleSwapCoins
		);
	};

	const handleSelectToToken = (token: Coin) => {
		handleSelectToken(
			'to',
			token,
			fromCoin,
			toCoin,
			setFromCoin,
			setToCoin,
			setFromAmount,
			setToAmount,
			handleSwapCoins
		);
	};

	const handleFromAmountChange = useCallback(
		(amount: string) => {
			handleAmountChange(
				'from',
				amount,
				fromCoin,
				toCoin,
				quoteTimeoutRef,
				setIsQuoteLoading,
				setFromAmount,
				setToAmount,
				setTradeDetails,
				showToast
			);
		},
		[fromCoin, toCoin, quoteTimeoutRef, setIsQuoteLoading, setFromAmount, setToAmount, setTradeDetails, showToast]
	);

	const handleToAmountChange = useCallback(
		(amount: string) => {
			handleAmountChange(
				'to',
				amount,
				fromCoin,
				toCoin,
				quoteTimeoutRef,
				setIsQuoteLoading,
				setFromAmount,
				setToAmount,
				setTradeDetails,
				showToast
			);
		},
		[fromCoin, toCoin, quoteTimeoutRef, setIsQuoteLoading, setFromAmount, setToAmount, setTradeDetails, showToast]
	);

	const handleTradeSubmitClick = () => {
		handleTradeSubmit(
			fromAmount,
			toAmount,
			wallet,
			fromCoin,
			fromPortfolioToken,
			pollingIntervalRef,
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

		// Stop all intervals to prevent infinite loops
		if (pollingIntervalRef.current) {
			clearInterval(pollingIntervalRef.current);
			pollingIntervalRef.current = null;
			logger.info('[Trade] Price polling stopped.');
		}

		await executeTrade(fromCoin, toCoin, fromAmount, 1, showToast, setIsLoadingTrade, setIsConfirmationVisible, setPollingStatus, setSubmittedTxHash, setPollingError, setPollingConfirmations, setIsStatusModalVisible, componentStartPolling);
	};

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
							<Text style={[styles.detailLabel, styles.exchangeRateLabelText]}>Exchange Rate</Text>
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
								<TouchableOpacity
									style={styles.swapButton}
									onPress={handleSwapCoins}
									disabled={!fromCoin || !toCoin}
									testID="swap-coins-button"
								>
									<Icon
										source="swap-vertical"
										size={20}
										color={styles.colors.onPrimary}
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
				onClose={() => {
					setIsStatusModalVisible(false);
					setPollingStatus('pending');
					setPollingConfirmations(0);
					setPollingError(null);
					setSubmittedTxHash(null);
					componentStopPolling();
					navigation.reset({ index: 0, routes: [{ name: 'MainTabs', params: { screen: 'Home' } }] });
				}}
				isVisible={isStatusModalVisible}
				txHash={submittedTxHash}
				status={pollingStatus}
				confirmations={pollingConfirmations}
				error={pollingError}
			/>
		</SafeAreaView>
	);
};

export default Trade;
