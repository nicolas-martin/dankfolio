import { Coin, Wallet } from '@/types';
import { TradeDetailsProps } from '@components/Trade/TradeDetails/tradedetails_types';
import { logger } from '@/utils/logger';
import { grpcApi } from '@/services/grpcApi';
import { prepareSwapRequest, signSwapTransaction } from '@/services/solana';
import { toRawAmount } from '../../utils/numberFormat';
import { usePortfolioStore, getActiveWalletKeys } from '@/store/portfolio';
import { useTransactionsStore } from '@/store/transactions';
import type { ToastProps } from '@/components/Common/Toast/toast_types';
import { PollingStatus } from '@components/Trade/TradeStatusModal/types';
import { REFRESH_INTERVALS, SOLANA_ADDRESS } from '@/utils/constants';
import { MutableRefObject } from 'react';

export const DEFAULT_AMOUNT = "0.0001";
export const QUOTE_DEBOUNCE_MS = 1000;
export const PRICE_REFRESH_INTERVAL_MS = REFRESH_INTERVALS.TRADE_PRICES;

// Function to get prices for multiple tokens in a single API call
// NOTE: Should we use the store instead?
export const getCoinPrices = async (mintAddresses: string[]): Promise<Record<string, number>> => {
	try {
		const prices = await grpcApi.getCoinPrices(mintAddresses);
		return prices;
	} catch (error: unknown) { // Changed to unknown
		logger.exception(error, { functionName: 'getCoinPrices', params: { mintAddresses } });
		throw error; // Propagate error to caller
	}
};

export const fetchTradeQuote = async (
	amount: string,
	fromCoin: Coin,
	toCoin: Coin,
	setQuoteLoading: (loading: boolean) => void,
	setToAmount: (amount: string) => void,
	setTradeDetails: (details: TradeDetailsProps) => void,
) => {
	if (!fromCoin || !toCoin || !amount || parseFloat(amount) <= 0) {
		return;
	}

	try {
		setQuoteLoading(true);

		// Get latest prices for both coins in a single API call
		const prices = await getCoinPrices([fromCoin.mintAddress, toCoin.mintAddress]);

		// Create new coin objects with updated prices to avoid mutating the original objects
		const updatedFromCoin = { ...fromCoin, price: prices[fromCoin.mintAddress] };
		const updatedToCoin = { ...toCoin, price: prices[toCoin.mintAddress] };

		const rawAmount = toRawAmount(amount, updatedFromCoin.decimals);
		logger.info('Trade Quote Request:', {
			amount,
			rawAmount,
			fromCoin: {
				symbol: updatedFromCoin.symbol,
				decimals: updatedFromCoin.decimals,
				price: updatedFromCoin.price
			},
			toCoin: {
				symbol: updatedToCoin.symbol,
				decimals: updatedToCoin.decimals,
				price: updatedToCoin.price
			}
		});

		const response = await grpcApi.getSwapQuote(updatedFromCoin.mintAddress, updatedToCoin.mintAddress, rawAmount);
		logger.info('Trade Quote Response:', response);

		setToAmount(response.estimatedAmount);

		setTradeDetails({
			exchangeRate: response.exchangeRate,
			gasFee: response.fee,
			priceImpactPct: response.priceImpact,
			totalFee: response.fee,
			route: response.routePlan.join(' → ')
		});
	} catch (error: unknown) {
		logger.exception(error, { functionName: 'fetchTradeQuote', params: { amount, fromCoinSc: fromCoin.symbol, toCoinSc: toCoin.symbol } });
		// Only reset trade details, but keep the amount values
		setTradeDetails({
			exchangeRate: '0',
			gasFee: '0',
			priceImpactPct: '0',
			totalFee: '0',
			route: ''
		});
		// Re-throw error to be handled by the component
		throw error;
	} finally {
		setQuoteLoading(false);
	}
};

export const handleSwapCoins = (
	fromCoin: Coin,
	toCoin: Coin,
	setFromCoin: (coin: Coin) => void,
	setToCoin: (coin: Coin) => void,
	fromAmount: string,
	setFromAmount: (amount: string) => void,
	toAmount: string,
	setToAmount: (amount: string) => void
): void => {
	setFromCoin(toCoin);
	setToCoin(fromCoin);
	setFromAmount(toAmount);
	setToAmount(fromAmount);
};

export const stopPolling = (
	pollingIntervalRef: MutableRefObject<ReturnType<typeof setTimeout> | null>,
	setIsLoadingTrade: (loading: boolean) => void
) => {
	if (pollingIntervalRef.current) {
		clearInterval(pollingIntervalRef.current);
		pollingIntervalRef.current = null;
		logger.info('Polling stopped.');
	}
	setIsLoadingTrade(false); // Also signifies polling has stopped
};

export const pollTradeStatus = async (
	txHash: string,
	setPollingConfirmations: (confirmations: number) => void,
	setPollingStatus: (status: PollingStatus) => void,
	setPollingError: (error: string | null) => void,
	stopPollingFn: () => void, // Pass the stopPolling function reference
	_showToast: (params: ToastProps) => void, // Use ToastProps
	wallet: Wallet | null // Pass wallet for balance refresh
) => {
	logger.info(`Polling status for ${txHash}...`);
	try {
		const statusResult = await grpcApi.getSwapStatus(txHash);

		if (!statusResult) {
			logger.info('Transaction status not found yet, continuing poll...', { txHash });
			return;
		}

		setPollingConfirmations(statusResult.confirmations);

		if (statusResult.error) {
			logger.error('Transaction failed during polling:', { error: statusResult.error, txHash });
			setPollingStatus('failed');
			setPollingError(typeof statusResult.error === 'string' ? statusResult.error : JSON.stringify(statusResult.error));
			stopPollingFn();
		} else if (statusResult.finalized) {
			logger.info('Transaction finalized!', { txHash });
			setPollingStatus('finalized');
			stopPollingFn();
			if (wallet) {
				usePortfolioStore.getState().fetchPortfolioBalance(wallet.address);
			}
			// Removed toast notification - status modal already shows finalization
		} else if (statusResult.status === 'confirmed' || statusResult.status === 'processed') {
			logger.info(`Transaction confirmed with ${statusResult.confirmations} confirmations, waiting for finalization...`, { txHash });
			setPollingStatus('confirmed');
		} else {
			logger.info(`Current status: ${statusResult.status}, continuing poll...`, { txHash, status: statusResult.status });
			setPollingStatus('polling');
		}
	} catch (error: unknown) { // Changed to unknown
		logger.exception(error, { functionName: 'pollTradeStatus', params: { txHash } });
		setPollingStatus('failed');
		// Safely extract the error message with proper type handling
		const errorMessage = error instanceof Error ? error.message : 'Failed to fetch transaction status';
		setPollingError(errorMessage);
		stopPollingFn();
	}
};

export const startPolling = (
	txHash: string,
	pollFn: () => Promise<void>, // Function that executes one poll
	stopPollingFn: () => void, // Function to stop polling
	pollingIntervalRef: MutableRefObject<ReturnType<typeof setTimeout> | null>
) => {
	// Clear any existing interval
	if (pollingIntervalRef.current) {
		clearInterval(pollingIntervalRef.current);
	}

	// Start polling immediately
	pollFn();

	// Set up interval for subsequent polls
	pollingIntervalRef.current = setInterval(pollFn, 3000);
};

// Validation helper
const validateTradeParams = (fromCoin: Coin, toCoin: Coin, fromAmount: string, wallet: Wallet | null) => {
	if (!fromCoin || !toCoin || !fromAmount) {
		throw new Error('Missing required trade parameters');
	}
	if (!wallet?.address) {
		throw new Error('Wallet not connected. Please connect your wallet.');
	}
	return true;
};

// Transaction preparation helper
const prepareTradeTransaction = async (fromCoin: Coin, toCoin: Coin, fromAmount: string, slippage: number, walletAddress: string) => {
	const rawAmount = Number(toRawAmount(fromAmount, fromCoin.decimals));
	const unsignedTx = await prepareSwapRequest(fromCoin.mintAddress, toCoin.mintAddress, rawAmount, slippage, walletAddress);

	const keys = await getActiveWalletKeys();
	if (!keys?.privateKey || !keys?.publicKey) {
		throw new Error('Failed to retrieve wallet keys for signing.');
	}

	const signedTx = await signSwapTransaction(unsignedTx, keys.publicKey, keys.privateKey);
	return { rawAmount, signedTx, unsignedTx };
};

// Transaction submission helper
const submitTradeTransaction = async (fromCoin: Coin, toCoin: Coin, rawAmount: number, signedTx: string, unsignedTx: string) => {
	const tradePayload = {
		fromCoinMintAddress: fromCoin.mintAddress,
		toCoinMintAddress: toCoin.mintAddress,
		amount: rawAmount,
		signedTransaction: signedTx,
		unsignedTransaction: unsignedTx,
	};

	return await grpcApi.submitSwap(tradePayload);
};

// Simplified executeTrade function
export const executeTrade = async (
	fromCoin: Coin,
	toCoin: Coin,
	fromAmount: string,
	slippage: number,
	showToast: (params: ToastProps) => void,
	setIsLoadingTrade: (loading: boolean) => void,
	setIsConfirmationVisible: (visible: boolean) => void,
	setPollingStatus: (status: PollingStatus) => void,
	setSubmittedTxHash: (txHash: string | null) => void,
	setPollingError: (error: string | null) => void,
	setPollingConfirmations: (confirmations: number) => void,
	setIsStatusModalVisible: (visible: boolean) => void,
	startPollingFn: (txHash: string) => void
) => {
	try {
		setIsLoadingTrade(true);
		setIsConfirmationVisible(false);
		setPollingStatus('pending');
		setPollingError(null);
		setPollingConfirmations(0);

		logger.info('Executing trade...', {
			fromCoin: fromCoin.symbol,
			toCoin: toCoin.symbol,
			fromAmount,
			slippage
		});

		const wallet = usePortfolioStore.getState().wallet;
		validateTradeParams(fromCoin, toCoin, fromAmount, wallet);

		const { rawAmount, signedTx, unsignedTx } = await prepareTradeTransaction(
			fromCoin,
			toCoin,
			fromAmount,
			slippage,
			wallet!.address
		);

		const result = await submitTradeTransaction(fromCoin, toCoin, rawAmount, signedTx, unsignedTx);

		logger.info('Trade submitted successfully:', { txHash: result.transactionHash });
		setSubmittedTxHash(result.transactionHash);
		setIsStatusModalVisible(true);
		startPollingFn(result.transactionHash);

		showToast({
			type: 'success',
			message: 'Trade submitted successfully!'
		});
	} catch (error: unknown) {
		logger.exception(error, { functionName: 'executeTrade' });
		setIsLoadingTrade(false);
		setIsConfirmationVisible(false);

		const errorMessage = error instanceof Error ? error.message : 'Failed to execute trade';
		showToast({
			type: 'error',
			message: errorMessage
		});
	}
};

// Handle token selection logic (consolidated from/to)
export const handleSelectToken = (
	direction: 'from' | 'to',
	token: Coin,
	fromCoin: Coin | null,
	toCoin: Coin | null,
	setFromCoin: (coin: Coin) => void,
	setToCoin: (coin: Coin) => void,
	setFromAmount: (amount: string) => void,
	setToAmount: (amount: string) => void,
	handleSwapCoins: () => void
) => {
	const isFromDirection = direction === 'from';
	const currentCoin = isFromDirection ? fromCoin : toCoin;
	const oppositeCoin = isFromDirection ? toCoin : fromCoin;
	const setCoin = isFromDirection ? setFromCoin : setToCoin;

	logger.breadcrumb({
		category: 'trade',
		message: `Selected "${direction}" token`,
		data: {
			tokenSymbol: token.symbol,
			currentCoinSymbol: currentCoin?.symbol,
			oppositeCoinSymbol: oppositeCoin?.symbol
		}
	});

	// Skip if same token already selected
	if (token.mintAddress === currentCoin?.mintAddress) {
		logger.log(`[Trade] Skipping "${direction}" token selection - same token already selected`);
		return;
	}

	// Swap if token matches opposite side
	if (token.mintAddress === oppositeCoin?.mintAddress) {
		logger.log(`[Trade] Selected "${direction}" token matches opposite side. Swapping tokens.`);
		handleSwapCoins();
	} else {
		setCoin(token);
		if (currentCoin && token.mintAddress !== currentCoin.mintAddress) {
			logger.log(`[Trade] Clearing amounts due to new "${direction}" token selection`);
			setFromAmount('');
			setToAmount('');
		}
	}
};

// Handle amount changes with debounced quote fetching (simplified)
export const handleAmountChange = (
	direction: 'from' | 'to',
	amount: string,
	fromCoin: Coin | null,
	toCoin: Coin | null,
	quoteTimeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>,
	setIsQuoteLoading: (loading: boolean) => void,
	setFromAmount: (amount: string) => void,
	setToAmount: (amount: string) => void,
	setTradeDetails: (details: TradeDetailsProps) => void,
	showToast: (params: ToastProps) => void
) => {
	const isFromAmount = direction === 'from';
	const setAmount = isFromAmount ? setFromAmount : setToAmount;
	const setOtherAmount = isFromAmount ? setToAmount : setFromAmount;

	logger.log(`[Trade] handle${isFromAmount ? 'From' : 'To'}AmountChange`, {
		amount,
		fromCoinSymbol: fromCoin?.symbol,
		toCoinSymbol: toCoin?.symbol
	});

	setAmount(amount);

	// Skip quote fetch for incomplete input
	if (!amount || amount === '.' || amount.endsWith('.')) {
		logger.log(`[Trade] Skipping quote fetch: incomplete number input`, { amount });
		return;
	}

	// Skip quote fetch if coins missing
	if (!fromCoin || !toCoin) {
		logger.log(`[Trade] Skipping quote fetch: missing coins`);
		return;
	}

	// Clear existing timeout and set new one
	if (quoteTimeoutRef.current) {
		clearTimeout(quoteTimeoutRef.current);
	}

	setIsQuoteLoading(true);
	quoteTimeoutRef.current = setTimeout(async () => {
		logger.breadcrumb({
			category: 'trade',
			message: `Fetching quote for '${direction}' amount change`,
			data: { amount, fromCoin: fromCoin?.symbol, toCoin: toCoin?.symbol }
		});

		try {
			if (isFromAmount) {
				await fetchTradeQuote(amount, fromCoin, toCoin, setIsQuoteLoading, setOtherAmount, setTradeDetails);
			} else {
				await fetchTradeQuote(amount, toCoin, fromCoin, setIsQuoteLoading, setOtherAmount, setTradeDetails);
			}
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : 'Failed to fetch trade quote';
			logger.error(`[Trade] Error fetching trade quote`, { errorMessage, amount });
			showToast({ type: 'error', message: errorMessage });
		}
		quoteTimeoutRef.current = null;
	}, QUOTE_DEBOUNCE_MS);
};

// Handle trade submission validation
export const handleTradeSubmit = (
	fromAmount: string,
	toAmount: string,
	wallet: Wallet | null,
	fromCoin: Coin | null,
	fromPortfolioToken: { amount: number } | undefined,
	pollingIntervalRef: MutableRefObject<ReturnType<typeof setTimeout> | null>,
	setIsConfirmationVisible: (visible: boolean) => void,
	showToast: (params: ToastProps) => void
) => {
	logger.breadcrumb({
		category: 'trade',
		message: 'Trade button pressed, validating trade',
		data: { fromCoin: fromCoin?.symbol, fromAmount, toAmount }
	});

	if (!fromAmount || !toAmount || !wallet) {
		showToast({
			type: 'error',
			message: !wallet ? 'Please connect your wallet' : 'Please enter valid amounts'
		});
		return false;
	}

	const numericFromAmount = parseFloat(fromAmount);
	const availableBalance = fromPortfolioToken?.amount ?? 0;

	if (numericFromAmount > availableBalance) {
		showToast({
			type: 'error',
			message: `Insufficient ${fromCoin?.symbol ?? 'funds'}. You only have ${availableBalance.toFixed(6)} ${fromCoin?.symbol ?? ''}.`
		});
		return false;
	}

	logger.info('[Trade] Stopping refresh timers before opening confirmation modal');
	// Stop refresh timers when opening confirmation modal
	if (pollingIntervalRef.current) {
		clearInterval(pollingIntervalRef.current);
		pollingIntervalRef.current = null;
	}

	logger.breadcrumb({
		category: 'ui',
		message: 'Trade confirmation modal opened',
		data: { fromCoin: fromCoin?.symbol, fromAmount, toAmount }
	});
	setIsConfirmationVisible(true);
	return true;
};

// Handle status modal close with cleanup
export const handleCloseStatusModal = (
	pollingStatus: PollingStatus,
	wallet: Wallet | null,
	submittedTxHash: string | null,
	setIsStatusModalVisible: (visible: boolean) => void,
	componentStopPolling: () => void,
	setFromAmount: (amount: string) => void,
	setToAmount: (amount: string) => void,
	setTradeDetails: (details: TradeDetailsProps) => void,
	navigation: any
) => {
	logger.breadcrumb({
		category: 'ui',
		message: 'Trade status modal closed',
		data: { submittedTxHash, pollingStatus }
	});
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
};

// Handle try again logic
export const handleTryAgain = (
	setIsStatusModalVisible: (visible: boolean) => void,
	componentStopPolling: () => void,
	setSubmittedTxHash: (txHash: string | null) => void,
	setPollingStatus: (status: PollingStatus) => void,
	setPollingConfirmations: (confirmations: number) => void,
	setPollingError: (error: string | null) => void,
	setIsLoadingTrade: (loading: boolean) => void,
	setIsConfirmationVisible: (visible: boolean) => void
) => {
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
};
