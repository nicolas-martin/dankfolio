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
import TradeStatusModal from '@components/Trade/TradeStatusModal';
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
		logger.debug(`[Trade] Initializing with initialFromCoin: ${initialFromCoin?.symbol}, initialToCoin: ${initialToCoin?.symbol}`);
		const initializeCoins = async () => {
			const promises = [];
			if (initialFromCoin) {
				promises.push(getCoinByID(initialFromCoin.mintAddress, true).then(coin => { if (coin) setFromCoin(coin); }));
			} else {
				promises.push(getCoinByID(SOLANA_ADDRESS, true).then(coin => { if (coin) setFromCoin(coin); }));
			}
			if (initialToCoin) {
				promises.push(getCoinByID(initialToCoin.mintAddress, true).then(coin => { if (coin) setToCoin(coin); }));
			}
			await Promise.all(promises);
		};
		initializeCoins();
	}, [initialFromCoin, initialToCoin, getCoinByID]);

	useEffect(() => {
		logger.debug('[Trade] Component mounted, setting up coin price polling interval', { fromCoin: fromCoin?.symbol, toCoin: toCoin?.symbol, fromMint: fromCoin?.mintAddress, toMint: toCoin?.mintAddress });
		pollingIntervalRef.current = setInterval(async () => {
			logger.debug('[Trade] Polling interval triggered for coin prices', { fromCoin: fromCoin?.symbol, toCoin: toCoin?.symbol, fromMint: fromCoin?.mintAddress, toMint: toCoin?.mintAddress });
			if (!fromCoin || !toCoin) {
				logger.debug('[Trade] Skipping price poll - missing coins');
				return;
			}
			try {
				logger.debug('[Trade] Fetching fresh coin data for price polling...');
				const [updatedFromCoin, updatedToCoin] = await Promise.all([
					getCoinByID(fromCoin.mintAddress, true),
					getCoinByID(toCoin.mintAddress, true)
				]);
				if (updatedFromCoin) setFromCoin(updatedFromCoin);
				if (updatedToCoin) setToCoin(updatedToCoin);
				logger.debug('[Trade] Successfully updated coin data from price polling');
			} catch (error: any) {
				logger.error('[Trade] Failed to refresh coin prices during polling', { errorMessage: error?.message, fromCoinSymbol: fromCoin?.symbol, toCoinSymbol: toCoin?.symbol });
			}
		}, 10000);
		return () => {
			logger.debug('[Trade] Component unmounting - cleaning up price polling interval', { fromCoin: fromCoin?.symbol, toCoin: toCoin?.symbol, fromMint: fromCoin?.mintAddress, toMint: toCoin?.mintAddress });
			if (pollingIntervalRef.current) {
				clearInterval(pollingIntervalRef.current);
				pollingIntervalRef.current = null;
				logger.debug('[Trade] Price polling interval cleared successfully');
			}
		};
	}, [fromCoin?.mintAddress, toCoin?.mintAddress, getCoinByID]);

	useEffect(() => {
		logger.debug('[Trade] Trade screen mounted (second useEffect, consider merging if appropriate)');
		return () => {
			logger.debug('[Trade] Trade screen unmounted (second useEffect, consider merging if appropriate)');
		};
	}, []);

	const fromPortfolioToken = useMemo(() => tokens.find(token => token.mintAddress === fromCoin?.mintAddress), [tokens, fromCoin]);
	const toPortfolioToken = useMemo(() => tokens.find(token => token.mintAddress === toCoin?.mintAddress), [tokens, toCoin]);

	const handleSelectFromToken = (token: Coin) => {
		logger.breadcrumb({ category: 'trade', message: 'Selected "from" token', data: { tokenSymbol: token.symbol, currentFromAmount, currentToTokenSymbol: toCoin?.symbol } });
		logger.debug('[Trade] handleSelectFromToken called', { newTokenSymbol: token.symbol, currentFromAmount: fromAmount, currentToTokenSymbol: toCoin?.symbol, isSameAsCurrent: token.mintAddress === fromCoin?.mintAddress });
		if (token.mintAddress === fromCoin?.mintAddress) {
			logger.debug('[Trade] Skipping "from" token selection - same token already selected');
			return;
		}
		if (token.mintAddress === toCoin?.mintAddress) {
			logger.debug('[Trade] Selected "from" token is the same as current "to" token. Swapping tokens.');
			handleSwapCoins();
		} else {
			setFromCoin(token);
			if (fromCoin && token.mintAddress !== fromCoin.mintAddress) {
				logger.debug('[Trade] Clearing amounts due to new "from" token selection');
				setFromAmount('');
				setToAmount('');
			}
		}
	};

	const handleSelectToToken = (token: Coin) => {
		logger.breadcrumb({ category: 'trade', message: 'Selected "to" token', data: { tokenSymbol: token.symbol, currentToAmount: toAmount, currentFromTokenSymbol: fromCoin?.symbol } });
		logger.debug('[Trade] handleSelectToToken called', { newTokenSymbol: token.symbol, currentToAmount: toAmount, currentFromTokenSymbol: fromCoin?.symbol, isSameAsCurrent: token.mintAddress === toCoin?.mintAddress });
		if (token.mintAddress === toCoin?.mintAddress) {
			logger.debug('[Trade] Skipping "to" token selection - same token already selected');
			return;
		}
		if (token.mintAddress === fromCoin?.mintAddress) {
			logger.debug('[Trade] Selected "to" token is the same as current "from" token. Swapping tokens.');
			handleSwapCoins();
		} else {
			setToCoin(token);
			if (toCoin && token.mintAddress !== toCoin.mintAddress) {
				logger.debug('[Trade] Clearing amounts due to new "to" token selection');
				setFromAmount('');
				setToAmount('');
			}
		}
	};

	const handleFromAmountChange = useCallback((amount: string) => {
		logger.debug('[Trade] handleFromAmountChange START', { amount, fromCoinSymbol: fromCoin?.symbol, toCoinSymbol: toCoin?.symbol });
		setFromAmount(amount);
		logger.debug('[Trade] Setting fromAmount in state', { amount });
		if (!amount || amount === '.' || amount.endsWith('.')) {
			logger.debug('[Trade] Skipping quote fetch: incomplete number input for fromAmount', { amount });
			return;
		}
		if (!fromCoin || !toCoin) {
			logger.debug('[Trade] Skipping quote fetch: missing fromCoin or toCoin in fromAmountChange');
			return;
		}
		logger.debug('[Trade] Preparing to fetch trade quote due to fromAmount change', { amount, fromCoinSymbol: fromCoin?.symbol, toCoinSymbol: toCoin?.symbol });
		if (quoteTimeoutRef.current) {
			logger.debug('[Trade] Clearing existing quote fetch timeout (fromAmountChange)');
			clearTimeout(quoteTimeoutRef.current);
		}
		setIsQuoteLoading(true);
		quoteTimeoutRef.current = setTimeout(async () => {
			logger.breadcrumb({ category: 'trade', message: "Fetching quote for 'from' amount change", data: { amount, fromCoin: fromCoin?.symbol, toCoin: toCoin?.symbol } });
			logger.debug('[Trade] Quote fetch timeout triggered (fromAmountChange)', { amount });
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
		logger.debug('[Trade] handleToAmountChange START', { amount, fromCoinSymbol: fromCoin?.symbol, toCoinSymbol: toCoin?.symbol });
		setToAmount(amount);
		logger.debug('[Trade] Setting toAmount in state', { amount });
		if (!amount || amount === '.' || amount.endsWith('.')) {
			logger.debug('[Trade] Skipping quote fetch: incomplete number input for toAmount', { amount });
			return;
		}
		if (!fromCoin || !toCoin) {
			logger.debug('[Trade] Skipping quote fetch: missing fromCoin or toCoin in toAmountChange');
			return;
		}
		logger.debug('[Trade] Preparing to fetch trade quote due to toAmount change (solving for fromAmount)', { amount, fromCoinSymbol: fromCoin?.symbol, toCoinSymbol: toCoin?.symbol });
		if (quoteTimeoutRef.current) {
			logger.debug('[Trade] Clearing existing quote fetch timeout (toAmountChange)');
			clearTimeout(quoteTimeoutRef.current);
		}
		setIsQuoteLoading(true);
		quoteTimeoutRef.current = setTimeout(async () => {
			logger.breadcrumb({ category: 'trade', message: "Fetching quote for 'to' amount change", data: { amount, fromCoin: fromCoin?.symbol, toCoin: toCoin?.symbol } });
			logger.debug('[Trade] Quote fetch timeout triggered (toAmountChange)', { amount });
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
		logger.breadcrumb({ category: 'ui', message: 'Trade confirmation modal opened', data: { fromCoin: fromCoin?.symbol, toCoin: toCoin?.symbol, fromAmount, toAmount } });
		setIsConfirmationVisible(true);
	};

	useEffect(() => {
		return () => {
			componentStopPolling();
			if (quoteTimeoutRef.current) clearTimeout(quoteTimeoutRef.current);
		};
	}, []);

	const handleTradeConfirmClick = async () => {
		logger.breadcrumb({ category: 'trade', message: 'Trade confirmed by user', data: { fromCoin: fromCoin?.symbol, toCoin: toCoin?.symbol, fromAmount } });
		if (!fromCoin || !toCoin || !fromAmount) {
			showToast({ type: 'error', message: 'Missing required trade parameters' });
			return;
		}
		logger.info('[Trade] Stopping price polling before trade execution.');
		if (pollingIntervalRef.current) {
			clearInterval(pollingIntervalRef.current);
			pollingIntervalRef.current = null;
			logger.info('[Trade] Price polling stopped.');
		}
		// Breadcrumb for status modal opening will be in executeTrade or here if it's set directly.
		// For now, assuming executeTrade handles its own breadcrumbs for submission/status modal.
		await executeTrade(fromCoin, toCoin, fromAmount, 1, showToast, setIsLoadingTrade, setIsConfirmationVisible, setPollingStatus, setSubmittedTxHash, setPollingError, setPollingConfirmations, setIsStatusModalVisible, componentStartPolling);
	};

	const handleCloseStatusModal = useCallback(() => {
		logger.breadcrumb({ category: 'ui', message: 'Trade status modal closed', data: { submittedTxHash, pollingStatus } });
		logger.info('[Trade] Cleaning up trade screen and resetting state after status modal close.');
		setIsStatusModalVisible(false);
		componentStopPolling();
		setFromAmount('');
		setToAmount('');
		setTradeDetails({ exchangeRate: '0', gasFee: '0', priceImpactPct: '0', totalFee: '0' });
		navigation.reset({ index: 0, routes: [{ name: 'MainTabs', params: { screen: 'Home' } }] });
	}, [navigation, componentStopPolling, submittedTxHash, pollingStatus]);

	const handleSwapCoins = () => {
		logger.breadcrumb({ category: 'trade', message: 'Pressed swap tokens button', data: { fromCoin: fromCoin?.symbol, toCoin: toCoin?.symbol } });
		logger.debug('[Trade] handleSwapCoins START', { fromCoinSymbol: fromCoin?.symbol, toCoinSymbol: toCoin?.symbol, fromAmount, toAmount });
		if (!fromCoin || !toCoin) {
			logger.warn('[Trade] Cannot swap with null coins', { fromCoinSymbol: fromCoin?.symbol, toCoinSymbol: toCoin?.symbol });
			return;
		}
		swapCoinsUtil(fromCoin, toCoin, setFromCoin, setToCoin, fromAmount, setFromAmount, toAmount, setToAmount);
		logger.debug('[Trade] Swap completed successfully via utility');
	};
	
	const handleCloseConfirmationModal = () => {
		logger.breadcrumb({ category: 'ui', message: 'Trade confirmation modal closed' });
		setIsConfirmationVisible(false);
	};

	if (!toCoin) return <View style={styles.noWalletContainer}><Text style={{ color: theme.colors.onSurface }}>Invalid trade pair. Please select coins to trade.</Text></View>;
	if (!wallet) return <View style={styles.noWalletContainer}><Text style={{ color: theme.colors.onSurface }}>Please connect your wallet to trade</Text></View>;
	if (!fromCoin) return <View style={styles.noWalletContainer}><Text style={{ color: theme.colors.onSurface }}>Please select a coin to trade from</Text></View>;

	return (
		<SafeAreaView style={styles.container}>
			<ScrollView style={styles.scrollView}>
				<View style={styles.padding}>
					<Text variant="labelLarge" style={{ marginBottom: 4 }}>From</Text>
					<TokenSelector style={styles.valueInfoContainer} selectedToken={fromCoin} onSelectToken={handleSelectFromToken} label={'Select Token'} amountValue={fromAmount || '0.00'} onAmountChange={handleFromAmountChange} isAmountEditable={true} showOnlyPortfolioTokens={true} testID="from-token-selector" />
					<Button mode="elevated" icon={({ size, color }) => <SwapIcon size={size} color={color} />} onPress={handleSwapCoins} style={styles.valueInfoContainer}>Swap</Button>
					<Text variant="labelLarge" style={{ marginBottom: 4 }}>To</Text>
					<TokenSelector style={styles.valueInfoContainer} selectedToken={toCoin ?? undefined} onSelectToken={handleSelectToToken} label={toCoin ? undefined : 'Select Token'} amountValue={toAmount} onAmountChange={handleToAmountChange} isAmountEditable={true} showOnlyPortfolioTokens={false} testID="to-token-selector" />
					{fromAmount && toAmount && <TradeDetails exchangeRate={tradeDetails.exchangeRate} gasFee={tradeDetails.gasFee} priceImpactPct={tradeDetails.priceImpactPct} totalFee={tradeDetails.totalFee} route={tradeDetails.route} />}
				</View>
			</ScrollView>
			<View style={styles.padding}>
				<Button mode="contained" onPress={handleTradeSubmitClick} disabled={!fromAmount || !toAmount || isQuoteLoading} loading={isQuoteLoading} testID="trade-button">
					{isQuoteLoading ? 'Fetching Quote...' : 'Trade'}
				</Button>
			</View>
			{fromCoin && toCoin && (
				<TradeConfirmation isVisible={isConfirmationVisible} onClose={handleCloseConfirmationModal} onConfirm={handleTradeConfirmClick} fromAmount={fromAmount} toAmount={toAmount} toCoin={toCoin} fromCoin={fromCoin} fees={tradeDetails} isLoading={isLoadingTrade} />
			)}
			<TradeStatusModal isVisible={isStatusModalVisible} onClose={handleCloseStatusModal} txHash={submittedTxHash} status={pollingStatus} confirmations={pollingConfirmations} error={pollingError} />
		</SafeAreaView>
	);
};

export default Trade;
