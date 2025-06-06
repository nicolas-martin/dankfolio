import { Coin, Wallet } from '@/types';
import { TradeDetailsProps } from '@components/Trade/TradeDetails/tradedetails_types';
import { logger } from '@/utils/logger';
import { grpcApi } from '@/services/grpcApi';
import { prepareSwapRequest, signSwapTransaction } from '@/services/solana';
import { toRawAmount } from '../../utils/numberFormat';
import { usePortfolioStore, getActiveWalletKeys } from '@/store/portfolio';
import type { ToastProps } from '@/components/Common/Toast/toast_types';
import { PollingStatus } from '@components/Trade/TradeStatusModal/types';
import { REFRESH_INTERVALS } from '@/utils/constants';
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
	} catch (error) {
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
	showToast: (params: ToastProps) => void, // Use ToastProps
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
			showToast({ type: 'success', message: 'Trade finalized successfully!' });
		} else if (statusResult.status === 'confirmed' || statusResult.status === 'processed') {
			logger.info(`Transaction confirmed with ${statusResult.confirmations} confirmations, waiting for finalization...`, { txHash });
			setPollingStatus('confirmed');
		} else {
			logger.info(`Current status: ${statusResult.status}, continuing poll...`, { txHash, status: statusResult.status });
			setPollingStatus('polling');
		}
	} catch (error) {
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

export const executeTrade = async (
	fromCoin: Coin,
	toCoin: Coin,
	fromAmount: string,
	slippage: number,
	showToast: (params: ToastProps) => void,
	setIsLoadingTrade: (loading: boolean) => void,
	setIsConfirmationVisible: (visible: boolean) => void,
	setPollingStatus: (status: PollingStatus) => void,
	setSubmittedTxHash: (hash: string | null) => void,
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
		setIsStatusModalVisible(true);

		logger.info('Signing trade transaction:', {
			fromCoin: fromCoin.symbol,
			toCoin: toCoin.symbol,
			fromAmount,
			slippage
		});

		// Convert amount to raw units (lamports)
		const rawAmount = Number(toRawAmount(fromAmount, fromCoin.decimals));

		// Get userPublicKey for prepareSwapRequest
		const walletAddress = usePortfolioStore.getState().wallet?.address;
		if (!walletAddress) {
			logger.error('[executeTrade] No wallet address found in store.');
			setIsLoadingTrade(false);
			showToast({ type: 'error', message: 'Wallet not connected. Please connect your wallet.' });
			setIsStatusModalVisible(false); // Hide status modal as trade can't proceed
			return;
		}

		// Build the transaction
		const unsignedTx = await prepareSwapRequest(
			fromCoin.mintAddress,
			toCoin.mintAddress,
			rawAmount,
			slippage,
			walletAddress // userPublicKey
		);

		// Get keys for signing
		const keys = await getActiveWalletKeys();
		if (!keys || !keys.privateKey || !keys.publicKey) {
			logger.error('[executeTrade] Failed to get active wallet keys or keys are incomplete.');
			setIsLoadingTrade(false);
			showToast({ type: 'error', message: 'Failed to retrieve wallet keys for signing.' });
			setIsStatusModalVisible(false); // Hide status modal
			return;
		}

		// Verify public key from store matches the one from keychain (optional, but good practice)
		if (keys.publicKey !== walletAddress) {
			logger.error('[executeTrade] Mismatch between store public key and keychain public key.');
			setIsLoadingTrade(false);
			showToast({ type: 'error', message: 'Wallet key mismatch. Please try reconnecting your wallet.' });
			setIsStatusModalVisible(false); // Hide status modal
			return;
		}

		const signedTx = await signSwapTransaction(unsignedTx, keys.publicKey, keys.privateKey);

		logger.info('Transaction signed.', { fromCoin: fromCoin.symbol, toCoin: toCoin.symbol, fromAmount });

		// Submit the signed transaction
		const submitResponse = await grpcApi.submitSwap({
			fromCoinMintAddress: fromCoin.mintAddress,
			toCoinMintAddress: toCoin.mintAddress,
			amount: Number(toRawAmount(fromAmount, fromCoin.decimals)),
			signedTransaction: signedTx,
			unsignedTransaction: unsignedTx,
		});

		if (submitResponse.transactionHash) {
			setSubmittedTxHash(submitResponse.transactionHash);
			// Start polling using the passed function
			startPollingFn(submitResponse.transactionHash);
		} else {
			throw new Error('No transaction hash received');
		}
	} catch (error) {
		logger.exception(error, { functionName: 'executeTrade', params: { fromCoinSc: fromCoin.symbol, toCoinSc: toCoin.symbol, fromAmount, slippage } });
		setPollingStatus('failed');
		// Safely extract the error message with proper type handling
		const errorMessage = error instanceof Error ? error.message : 'Failed to execute trade';
		setPollingError(errorMessage);
		setIsLoadingTrade(false);
		showToast({
			type: 'error',
			message: errorMessage
		});
	}
};
