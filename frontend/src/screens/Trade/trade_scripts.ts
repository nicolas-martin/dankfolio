// import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Coin, Wallet } from '@/types';
import { TradeDetailsProps } from '@components/Trade/TradeDetails/tradedetails_types';

import api from '@/services/api';
import { buildAndSignSwapTransaction } from '@/services/solana';
import { toRawAmount } from '../../utils/numberFormat';
import { usePortfolioStore } from '@/store/portfolio'; // Import portfolio store for balance refresh
import type { ToastProps } from '@/components/Common/Toast/toast_types'; // Use ToastProps
import { PollingStatus } from '@components/Trade/TradeStatusModal/types';

export const DEFAULT_AMOUNT = "0.0001";
export const QUOTE_DEBOUNCE_MS = 500;

// Function to get prices for multiple tokens in a single API call
export const getTokenPrices = async (tokenIds: string[]): Promise<Record<string, number>> => {
	try {
		return await api.getTokenPrices(tokenIds);
	} catch (error) {
		console.error('❌ Error fetching token prices:', error);
		return Object.fromEntries(tokenIds.map(id => [id, 0]));
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
		const prices = await getTokenPrices([fromCoin.id, toCoin.id]);
		fromCoin.price = prices[fromCoin.id];
		toCoin.price = prices[toCoin.id];

		const rawAmount = toRawAmount(amount, fromCoin.decimals);
		console.log('📊 Trade Quote Request:', {
			amount,
			rawAmount,
			fromCoin: {
				symbol: fromCoin.symbol,
				decimals: fromCoin.decimals,
				price: fromCoin.price
			},
			toCoin: {
				symbol: toCoin.symbol,
				decimals: toCoin.decimals,
				price: toCoin.price
			}
		});

		const response = await api.getTradeQuote(fromCoin.id, toCoin.id, rawAmount);
		console.log('📬 Trade Quote Response:', response);

		setToAmount(response.estimatedAmount);

		setTradeDetails({
			exchangeRate: response.exchangeRate,
			gasFee: response.fee,
			priceImpactPct: response.priceImpact,
			totalFee: response.fee,
			route: response.routePlan.join(' → ')
		});
	} catch (error) {
		console.error('❌ Error fetching trade quote:', error);
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

// New function to handle only the signing part
export const signTradeTransaction = async (
	fromCoin: Coin,
	toCoin: Coin,
	amount: string,
	slippage: number,
	wallet: Wallet
): Promise<string> => {
	console.log('🔑 Signing trade transaction:', {
		fromCoin: fromCoin.symbol,
		toCoin: toCoin.symbol,
		amount,
		slippage,
		walletAddress: wallet.address,
	});

	// Convert amount to raw units (lamports)
	const rawAmount = Number(toRawAmount(amount, fromCoin.decimals));

	// Build and sign the transaction
	const signedTransaction = await buildAndSignSwapTransaction(
		fromCoin.id,
		toCoin.id,
		rawAmount,
		slippage,
		wallet
	);

	console.log('✅ Transaction signed.');
	return signedTransaction;
};

// Removed handleTrade function as its logic is moved to the screen component

// --- New Trade Execution and Polling Functions ---

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
		const statusResult = await api.getTradeStatus(txHash);

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
			console.log(`Transaction confirmed with ${statusResult.confirmations} confirmations.`);
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
	stopPollingFn(); // Clear any previous interval

	// Initial poll after 1 second delay
	setTimeout(async () => {
		await pollFn();

		// Start regular polling every 3 seconds if not already stopped
		if (pollingIntervalRef.current === null) { // Check if stopPolling was called during the initial poll
			pollingIntervalRef.current = setInterval(pollFn, 3000);
		}
	}, 1000);
};

export const executeTrade = async (
	wallet: Wallet,
	fromCoin: Coin,
	toCoin: Coin,
	fromAmount: string,
	slippage: number,
	showToast: (params: ToastProps) => void, // Use ToastProps
	setIsLoadingTrade: (loading: boolean) => void,
	setIsConfirmationVisible: (visible: boolean) => void,
	setPollingStatus: (status: PollingStatus) => void,
	setSubmittedTxHash: (hash: string | null) => void,
	setPollingError: (error: string | null) => void,
	setPollingConfirmations: (confirmations: number) => void,
	setIsStatusModalVisible: (visible: boolean) => void,
	startPollingFn: (txHash: string) => void // Pass the startPolling function reference
) => {
	setIsLoadingTrade(true);
	setIsConfirmationVisible(false); // Close confirmation modal
	setPollingStatus('pending'); // Initial status for the new modal
	setSubmittedTxHash(null); // Reset hash
	setPollingError(null); // Reset error
	setPollingConfirmations(0); // Reset confirmations
	setIsStatusModalVisible(true); // Show status modal

	try {
		// 1. Sign Transaction
		console.log('Attempting to sign transaction...');
		const signedTransaction = await signTradeTransaction(
			fromCoin,
			toCoin,
			fromAmount,
			slippage,
			wallet
		);
		console.log('Transaction signed successfully.');

		// 2. Submit Transaction
		console.log('Attempting to submit transaction...');
		const submitResponse = await api.submitTrade({
			from_coin_id: fromCoin.id,
			to_coin_id: toCoin.id,
			amount: parseFloat(fromAmount),
			signed_transaction: signedTransaction,
		});
		console.log('Transaction submitted:', submitResponse);

		if (submitResponse.transaction_hash) {
			setSubmittedTxHash(submitResponse.transaction_hash);
			setPollingStatus('polling'); // Move to polling state
			startPollingFn(submitResponse.transaction_hash); // Start polling using the passed function
		} else {
			throw new Error('Submission did not return a transaction hash.');
		}
	} catch (error: any) {
		console.error('Error during trade signing or submission:', error);
		const errorMessage = error?.message || 'Failed to sign or submit trade';
		showToast({ type: 'error', message: errorMessage });
		setPollingStatus('failed');
		setPollingError(errorMessage);
		setIsLoadingTrade(false); // Stop general loading indicator if needed
	}
};
