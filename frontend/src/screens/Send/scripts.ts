import { TokenTransferFormData } from './types';
import { Wallet, Coin } from '@/types';
import { grpcApi } from '@/services/grpcApi';
import { PortfolioToken } from '@store/portfolio';
import { validateSolanaAddress } from '@/services/solana';
import { prepareCoinTransfer, signTransferTransaction } from '@/services/solana';
import { PollingStatus } from '@components/Trade/TradeStatusModal/types';
import { ToastProps } from '@components/Common/Toast/toast_types';
import { usePortfolioStore } from '@/store/portfolio';
import { logger } from '@/utils/logger';

export const handleTokenSelect = (
	coin: Coin,
	tokens: PortfolioToken[]
): PortfolioToken | undefined => {
	return tokens.find(t => t.coin.mintAddress === coin.mintAddress);
};

export const validateForm = async (
	formData: TokenTransferFormData,
	selectedToken?: PortfolioToken
): Promise<{ isValid: boolean; code?: string; message: string } | null> => {
	if (!formData.toAddress) {
		return { isValid: false, message: 'Recipient address is required' };
	}

	const isValidSolanaAddress = await validateSolanaAddress(formData.toAddress);
	if (!isValidSolanaAddress) {
		return { isValid: false, message: 'Invalid Solana address' };
	}

	if (!formData.amount || parseFloat(formData.amount) <= 0) {
		return { isValid: false, message: 'Please enter a valid amount' };
	}

	if (!formData.selectedTokenMint) {
		return { isValid: false, message: 'Please select a token' };
	}

	if (selectedToken) {
		const amount = parseFloat(formData.amount);
		if (amount > selectedToken.amount) {
			return { isValid: false, message: `Insufficient balance. Maximum available: ${formatTokenBalance(selectedToken.amount)} ${selectedToken.coin.symbol}` };
		}
	}

	try {
		const response = await fetch(`https://public-api.solscan.io/account/${formData.toAddress}`);

		if (response.ok) { // status in the range 200-299
			// Solscan might return 200 even for not found, but with an empty object or specific field.
			// However, the prompt implies 200 means found, and 404 means not found.
			// Assuming Solscan API strictly uses 200 for found and 404 for not found.
			return { isValid: true, code: "ADDRESS_EXISTS_ON_SOLSCAN", message: "Address found on Solscan. Please verify this is the correct address before proceeding." };
		} else if (response.status === 404) {
			return { isValid: false, message: 'Invalid Solana address or address not found on Solscan' };
		} else {
			// For other non-successful status codes (e.g., 500, 400, 401, 403)
			logger.error('Error verifying address with Solscan - Non-OK response:', { status: response.status, statusText: response.statusText });
			return { isValid: false, message: 'Error verifying address with Solscan. Please try again.' };
		}
	} catch (error) {
		// This catches network errors (e.g., DNS resolution failure, server unreachable)
		logger.error('Error verifying address with Solscan - Network or fetch error:', error);
		return { isValid: false, message: 'Error verifying address with Solscan. Please try again.' };
	}
};

export const handleTokenTransfer = async (formData: TokenTransferFormData): Promise<string> => {
	try {
		const unsignedTransaction = await prepareCoinTransfer(formData.toAddress, formData.selectedTokenMint, parseFloat(formData.amount));
		const signedTransaction = await signTransferTransaction(unsignedTransaction);

		const submitResponse = await grpcApi.submitCoinTransfer({
			signedTransaction,
			unsignedTransaction
		});

		logger.breadcrumb({ category: 'send_tokens', message: 'Token transfer submitted to backend', data: { txHash: submitResponse.transactionHash } });
		return submitResponse.transactionHash;
	} catch (error) {
		logger.exception(error, { functionName: 'handleTokenTransfer', params: { toAddress: formData.toAddress, mint: formData.selectedTokenMint, amount: formData.amount } });

		// Handle specific error cases
		if (error.message?.includes('Blockhash not found') ||
			error.message?.includes('Transaction expired')) {
			throw new Error('Transaction expired. Please try submitting again.');
		}

		if (error.message?.includes('insufficient funds')) {
			throw new Error('Insufficient funds for this transaction. Please check your balance and try again.');
		}

		// For network or RPC errors, suggest retry
		if (error.message?.includes('network') || error.message?.includes('timeout')) {
			throw new Error('Network error. Please check your connection and try again.');
		}

		// For other errors, pass through the error message but clean it up
		const errorMessage = error.message || 'Failed to send tokens';
		throw new Error(errorMessage.replace(/\(.*?\)/g, '').trim());
	}
};

export const formatTokenBalance = (balance: number): string => {
	return balance.toLocaleString(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 6
	});
};

export const getDefaultSolanaToken = (tokens: PortfolioToken[]): PortfolioToken | undefined => {
	return tokens.find(t => t.coin.symbol === 'SOL');
};

// --- Polling Functions ---
export const stopPolling = (
	pollingIntervalRef: React.MutableRefObject<NodeJS.Timeout | null>,
	setIsLoadingTrade: (loading: boolean) => void
) => {
	if (pollingIntervalRef.current) {
		clearInterval(pollingIntervalRef.current);
		pollingIntervalRef.current = null;
		logger.info('Polling stopped.');
	}
	setIsLoadingTrade(false);
};

export const pollTransactionStatus = async (
	txHash: string,
	setPollingConfirmations: (confirmations: number) => void,
	setPollingStatus: (status: PollingStatus) => void,
	setPollingError: (error: string | null) => void,
	stopPollingFn: () => void,
	showToast: (params: ToastProps) => void,
	wallet: Wallet | null
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
			logger.error('Transaction failed during polling (Send Screen):', { error: statusResult.error, txHash });
			logger.breadcrumb({ category: 'send_tokens', level: 'error', message: 'Token transfer failed on backend (Send Screen)', data: { txHash, error: statusResult.error } });
			setPollingStatus('failed');
			setPollingError(typeof statusResult.error === 'string' ? statusResult.error : JSON.stringify(statusResult.error));
			stopPollingFn();
		} else if (statusResult.finalized) {
			logger.info('Transaction finalized (Send Screen)!', { txHash });
			logger.breadcrumb({ category: 'send_tokens', message: 'Token transfer finalized (Send Screen)', data: { txHash } });
			setPollingStatus('finalized');
			stopPollingFn();
			if (wallet) {
				usePortfolioStore.getState().fetchPortfolioBalance(wallet.address);
			}
			showToast({ type: 'success', message: 'Transfer finalized successfully!' });
		} else if (statusResult.status === 'confirmed' || statusResult.status === 'processed') {
			logger.info(`Transaction confirmed with ${statusResult.confirmations} confirmations, waiting for finalization (Send Screen)...`, { txHash });
			setPollingStatus('confirmed');
		} else {
			logger.info(`Current status: ${statusResult.status}, continuing poll (Send Screen)...`, { txHash, status: statusResult.status });
			setPollingStatus('polling');
		}
	} catch (error: any) {
		logger.exception(error, { functionName: 'pollTransactionStatus', context: 'SendScreen', params: { txHash } });
		setPollingStatus('failed');
		setPollingError(error?.message || 'Failed to fetch transaction status');
		stopPollingFn();
	}
};

export const startPolling = (
	txHash: string,
	pollFn: () => Promise<void>,
	stopPollingFn: () => void,
	pollingIntervalRef: React.MutableRefObject<NodeJS.Timeout | null>
) => {
	// Execute first poll immediately
	pollFn();

	// Set up interval for subsequent polls
	pollingIntervalRef.current = setInterval(pollFn, 2000);

	// Safety timeout after 5 minutes
	setTimeout(() => {
		if (pollingIntervalRef.current) {
			stopPollingFn();
		}
	}, 5 * 60 * 1000);
}; 
