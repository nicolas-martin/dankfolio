// import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Coin, Wallet } from '@/types';
import { TradeDetailsProps } from '@components/Trade/TradeDetails/tradedetails_types';

import { grpcApi } from '@/services/grpcApi';
import { prepareSwapRequest, signSwapTransaction } from '@/services/solana';
import { toRawAmount } from '../../utils/numberFormat';
import { usePortfolioStore } from '@/store/portfolio'; // Import portfolio store for balance refresh
import type { ToastProps } from '@/components/Common/Toast/toast_types'; // Use ToastProps
import { PollingStatus } from '@components/Trade/TradeStatusModal/types';
import { SOLANA_ADDRESS } from '@/utils/constants';

export const DEFAULT_AMOUNT = "0.0001";
export const QUOTE_DEBOUNCE_MS = 1000

// Function to get prices for multiple tokens in a single API call
// NOTE: Should we use the store instead?
export const getCoinPrices = async (mintAddresses: string[]): Promise<Record<string, number>> => {
	try {
		console.log('i????s it me??');
		const prices = await grpcApi.getCoinPrices(mintAddresses);
		console.log('i????s it me??');
		return prices;
	} catch (error) {
		console.error('❌ Error fetching token prices:', error);
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
		console.log('📊 Trade Quote Request:', {
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
		console.log('📬 Trade Quote Response:', response);

		setToAmount(response.estimatedAmount);

		setTradeDetails({
			exchangeRate: response.exchangeRate,
			gasFee: response.fee,
			priceImpactPct: response.priceImpact,
			totalFee: response.fee,
			route: response.routePlan.join(' → ')
		});
	} catch (error: any) {
		console.error('❌ Error fetching trade quote:', error);
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
	pollingIntervalRef: React.MutableRefObject<NodeJS.Timeout | null>,
	setIsLoadingTrade: (loading: boolean) => void
) => {
	if (pollingIntervalRef.current) {
		clearInterval(pollingIntervalRef.current);
		pollingIntervalRef.current = null;
		console.log('Polling stopped.');
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
	console.log(`Polling status for ${txHash}...`);
	try {
		const statusResult = await grpcApi.getSwapStatus(txHash);

		if (!statusResult) {
			console.log('Transaction status not found yet, continuing poll...');
			return;
		}

		setPollingConfirmations(statusResult.confirmations);

		if (statusResult.error) {
			console.error('Transaction failed:', statusResult.error);
			setPollingStatus('failed');
			setPollingError(typeof statusResult.error === 'string' ? statusResult.error : JSON.stringify(statusResult.error));
			stopPollingFn();
		} else if (statusResult.finalized) {
			console.log('Transaction finalized!');
			setPollingStatus('finalized');
			stopPollingFn();
			if (wallet) {
				usePortfolioStore.getState().fetchPortfolioBalance(wallet.address);
			}
			showToast({ type: 'success', message: 'Trade finalized successfully!' });
		} else if (statusResult.status === 'confirmed' || statusResult.status === 'processed') {
			console.log(`Transaction confirmed with ${statusResult.confirmations} confirmations, waiting for finalization...`);
			setPollingStatus('confirmed');
		} else {
			console.log(`Current status: ${statusResult.status}, continuing poll...`);
			setPollingStatus('polling');
		}
	} catch (error: any) {
		console.error('Error polling transaction status:', error);
		setPollingStatus('failed');
		setPollingError(error?.message || 'Failed to fetch transaction status');
		stopPollingFn();
	}
};

export const startPolling = (
	txHash: string,
	pollFn: () => Promise<void>, // Function that executes one poll
	stopPollingFn: () => void, // Function to stop polling
	pollingIntervalRef: React.MutableRefObject<NodeJS.Timeout | null>
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

		console.log('🔑 Signing trade transaction:', {
			fromCoin: fromCoin.symbol,
			toCoin: toCoin.symbol,
			fromAmount,
			slippage
		});

		// Convert amount to raw units (lamports)
		const rawAmount = Number(toRawAmount(fromAmount, fromCoin.decimals));

		// Build and sign the transaction
		const unsignedTx = await prepareSwapRequest(
			fromCoin.mintAddress,
			toCoin.mintAddress,
			rawAmount,
			slippage
		);

		const signedTx = await signSwapTransaction(unsignedTx);

		console.log('✅ Transaction signed.');

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
	} catch (error: any) {
		console.error('❌ Error executing trade:', error);
		setPollingStatus('failed');
		setPollingError(error?.message || 'Failed to execute trade');
		setIsLoadingTrade(false);
		showToast({
			type: 'error',
			message: error?.message || 'Failed to execute trade'
		});
	}
};
