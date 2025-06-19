import { Coin, Wallet } from '@/types';
import { logger } from '@/utils/logger';
import { grpcApi } from '@/services/grpcApi';
import { prepareSwapRequest, signSwapTransaction } from '@/services/solana';
import { toRawAmount } from '../../utils/numberFormat';
import { usePortfolioStore, getActiveWalletKeys } from '@/store/portfolio';
import type { ToastProps } from '@/components/Common/Toast/toast_types';
import { PollingStatus } from '@components/Trade/TradeStatusModal/types';
import { REFRESH_INTERVALS } from '@/utils/constants';
import { RefObject } from 'react';

export const QUOTE_DEBOUNCE_MS = 1000;

// Validate SOL balance for transaction fees after quote is received
export const validateSolBalanceForQuote = (
	solPortfolioToken: { amount: number } | undefined,
	totalSolRequired: string,
	showToast: (params: ToastProps) => void,
	setHasSufficientSolBalance: (sufficient: boolean) => void,
	solFeeBreakdown?: { tradingFee: string; transactionFee: string; accountCreationFee: string; priorityFee: string; total: string; accountsToCreate: number }
): boolean => {
	const solBalance = solPortfolioToken?.amount ?? 0;
	const requiredSol = parseFloat(totalSolRequired) || 0;
	
	// Only validate SOL fees if we have a comprehensive fee estimate or if SOL balance is critically low
	if (requiredSol > 0) {
		// Use comprehensive SOL requirement from quote
		if (solBalance < requiredSol) {
			const shortfall = requiredSol - solBalance;
			let message = `Insufficient SOL for transaction.\n\nRequired: ${requiredSol.toFixed(6)} SOL\nBalance: ${solBalance.toFixed(6)} SOL\nNeed: ${shortfall.toFixed(6)} more SOL`;
			
			// Add simplified breakdown if available
			if (solFeeBreakdown) {
				const breakdown = [];
				
				if (parseFloat(solFeeBreakdown.tradingFee) > 0) {
					breakdown.push(`Trading: ${parseFloat(solFeeBreakdown.tradingFee).toFixed(6)} SOL`);
				}
				if (parseFloat(solFeeBreakdown.accountCreationFee) > 0) {
					const accounts = solFeeBreakdown.accountsToCreate > 0 ? ` (${solFeeBreakdown.accountsToCreate} account${solFeeBreakdown.accountsToCreate > 1 ? 's' : ''})` : '';
					breakdown.push(`Account creation: ${parseFloat(solFeeBreakdown.accountCreationFee).toFixed(6)} SOL${accounts}`);
				}
				if (parseFloat(solFeeBreakdown.transactionFee) > 0) {
					breakdown.push(`Transaction: ${parseFloat(solFeeBreakdown.transactionFee).toFixed(6)} SOL`);
				}
				if (parseFloat(solFeeBreakdown.priorityFee) > 0) {
					breakdown.push(`Priority: ${parseFloat(solFeeBreakdown.priorityFee).toFixed(6)} SOL`);
				}
				
				if (breakdown.length > 0) {
					message += `\n\nBreakdown:\n${breakdown.map(item => `• ${item}`).join('\n')}`;
				}
			}
			
			showToast({
				type: 'error',
				message
			});
			setHasSufficientSolBalance(false);
			return false;
		}
	} else {
		// Fallback check for minimum SOL balance when no quote available
		const minimumSolRequired = 0.003; // Increased conservative estimate to include ATA creation
		if (solBalance < minimumSolRequired) {
			showToast({
				type: 'error',
				message: `Insufficient SOL for transaction fees. You need at least ${minimumSolRequired} SOL but only have ${solBalance.toFixed(6)} SOL.`
			});
			setHasSufficientSolBalance(false);
			return false;
		}
	}
	
	setHasSufficientSolBalance(true);
	return true; // SOL balance is sufficient
};
export const PRICE_REFRESH_INTERVAL_MS = REFRESH_INTERVALS.TRADE_PRICES;

// getCoinPrices and fetchTradeQuote have been removed from this file.
// Their logic is now centralized in frontend/src/services/grpcApi.ts
// under the getCoinPrices and getFullSwapQuoteOrchestrated methods respectively.
// The TradeScreen component calls these service methods directly (getFullSwapQuoteOrchestrated
// is called via a debounced callback).

// Simplified swap logic
export const handleSwapCoins = (
	currentState: {
		fromCoin: Coin | null;
		toCoin: Coin | null;
		fromAmount: string;
		toAmount: string;
	},
	setters: {
		setFromCoin: (coin: Coin) => void;
		setToCoin: (coin: Coin) => void;
		setFromAmount: (amount: string) => void;
		setToAmount: (amount: string) => void;
	}
): void => {
	const { fromCoin, toCoin, fromAmount, toAmount } = currentState;
	const { setFromCoin, setToCoin, setFromAmount, setToAmount } = setters;

	// Validate we have both coins
	if (!fromCoin || !toCoin) {
		logger.warn('[Trade] Cannot swap with null coins', { fromCoin: fromCoin?.symbol, toCoin: toCoin?.symbol });
		return;
	}
	if (!fromCoin.address || !toCoin.address) { logger.warn('[Trade] Cannot swap coins with invalid addresses', { fromCoin, toCoin }); return; }

	logger.log('[Trade] Swapping tokens', {
		from: `${fromCoin.symbol} (${fromAmount})`,
		to: `${toCoin.symbol} (${toAmount})`
	});

	// Perform the swap
	setFromCoin(toCoin);
	setToCoin(fromCoin);
	setFromAmount(toAmount);
	setToAmount(fromAmount);
};

export const stopPolling = (
	pollingIntervalRef: RefObject<ReturnType<typeof setTimeout> | null>,
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
	stopPollingFn: () => void,
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
	_txHash: string,
	pollFn: () => Promise<void>, // Function that executes one poll
	_stopPollingFn: () => void, // Function to stop polling
	pollingIntervalRef: RefObject<ReturnType<typeof setTimeout> | null>
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
	const unsignedTx = await prepareSwapRequest(fromCoin.address, toCoin.address, rawAmount, slippage, walletAddress);

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
		fromCoinMintAddress: fromCoin.address,
		toCoinMintAddress: toCoin.address,
		amount: rawAmount,
		signedTransaction: signedTx,
		unsignedTransaction: unsignedTx,
	};

	return await grpcApi.submitSwap(tradePayload);
};

// Simplified executeTrade function
// Removed polling-related state setters and startPollingFn from parameters
export const executeTrade = async (
	fromCoin: Coin,
	toCoin: Coin,
	fromAmount: string,
	slippage: number,
	showToast: (params: ToastProps) => void
	// setIsLoadingTrade, setIsConfirmationVisible etc. are handled by the component now
): Promise<string | null> => { // Returns txHash or null
	try {
		// setIsLoadingTrade(true); // Component will handle this
		// setIsConfirmationVisible(false); // Component will handle this
		// setPollingStatus('pending'); // Hook will handle this
		// setPollingError(null); // Hook will handle this
		// setPollingConfirmations(0); // Hook will handle this

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
		// setSubmittedTxHash(result.transactionHash); // Component will get this from the hook via startPolling
		// setIsStatusModalVisible(true); // Component will handle this
		// startPollingFn(result.transactionHash); // Component will call the hook's startPolling

		return result.transactionHash; // Return the hash
	} catch (error: unknown) {
		logger.exception(error, { functionName: 'executeTrade' });
		// setIsLoadingTrade(false); // Component should handle this
		// setIsConfirmationVisible(false); // Component should handle this

		const errorMessage = error instanceof Error ? error.message : 'Failed to execute trade';
		showToast({
			type: 'error',
			message: errorMessage
		});
		return null; // Return null or throw error as preferred
	}
};

// Simplified token selection logic - only pass what's needed
export const handleSelectToken = (
	direction: 'from' | 'to',
	selectedToken: Coin,
	currentToken: Coin | null,
	otherToken: Coin | null,
	setCurrentToken: (coin: Coin) => void,
	clearAmounts: () => void,
	swapCoins: () => void
) => {
	logger.breadcrumb({
		category: 'trade',
		message: `Selected "${direction}" token`,
		data: {
			tokenSymbol: selectedToken.symbol,
			currentTokenSymbol: currentToken?.symbol,
			otherTokenSymbol: otherToken?.symbol
		}
	});

	// More intuitive logic:
	if (selectedToken.address === otherToken?.address) {
		// User selected token that's on the OTHER side → SWAP
		logger.log(`[Trade] Selected "${direction}" token is on opposite side. Swapping tokens: ${selectedToken.symbol}`);
		swapCoins();
	} else if (selectedToken.address === currentToken?.address) {
		// User selected same token that's already here → DO NOTHING
		logger.log(`[Trade] Selected "${direction}" token is already selected. No action needed: ${selectedToken.symbol}`);
		return;
	} else {
		// User selected a completely new token → SET NEW
		logger.log(`[Trade] Setting new "${direction}" token: ${selectedToken.symbol}`);
		setCurrentToken(selectedToken);
		if (currentToken) {
			logger.log(`[Trade] Clearing amounts due to new "${direction}" token selection`);
			clearAmounts();
		}
	}
};

// Handle amount changes with debounced quote fetching (simplified)
// This function is now removed. The debouncing and quote fetching logic
// is handled directly in Trade/index.tsx using useDebouncedCallback,
// which then calls the fetchTradeQuote function from this script.

// Handle trade submission validation
export const handleTradeSubmit = (
	fromAmount: string,
	toAmount: string,
	wallet: Wallet | null,
	fromCoin: Coin | null,
	fromPortfolioToken: { amount: number } | undefined,
	solPortfolioToken: { amount: number } | undefined,
	estimatedTotalFee: string, // Exact fee from quote API
	// pollingIntervalRef: RefObject<ReturnType<typeof setTimeout> | null>, // No longer needed here
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

	// Check if user has enough of the FROM token
	if (numericFromAmount > availableBalance) {
		showToast({
			type: 'error',
			message: `Insufficient ${fromCoin?.symbol ?? 'funds'}. You only have ${availableBalance.toFixed(6)} ${fromCoin?.symbol ?? ''}.`
		});
		return false;
	}

		// Check if user has enough SOL for transaction fees
	const solBalance = solPortfolioToken?.amount ?? 0;
	const requiredSolFee = parseFloat(estimatedTotalFee) || 0;
	
	// Only validate SOL fees if we have a fee estimate or if SOL balance is critically low
	if (requiredSolFee > 0) {
		// Use exact fee from quote
		if (solBalance < requiredSolFee) {
			showToast({
				type: 'error',
				message: `Insufficient SOL for transaction fees. You need ${requiredSolFee.toFixed(6)} SOL but only have ${solBalance.toFixed(6)} SOL.`
			});
			return false;
		}
	} else {
		// Fallback check for minimum SOL balance when no quote available
		const minimumSolRequired = 0.002; // Conservative estimate for any transaction
		if (solBalance < minimumSolRequired) {
			showToast({
				type: 'error',
				message: `Insufficient SOL for transaction fees. You need at least ${minimumSolRequired} SOL but only have ${solBalance.toFixed(6)} SOL.`
			});
			return false;
		}
	}

	logger.info('[Trade] Validation successful, proceeding to confirmation modal.');
	// No need to manage pollingIntervalRef here as it's for TX polling, not price quote polling.
	// Price quote polling (if it were interval-based) would be managed separately.

	logger.breadcrumb({
		category: 'ui',
		message: 'Trade confirmation modal opened',
		data: { fromCoin: fromCoin?.symbol, fromAmount, toAmount }
	});
	setIsConfirmationVisible(true);
	return true;
};
