import { TokenTransferFormData } from './types';
import { Wallet, Coin } from '@/types';
import { grpcApi } from '@/services/grpcApi';
import { PortfolioToken } from '@store/portfolio';
import { validateSolanaAddress } from '@/services/solana';
import { buildAndSignTransferTransaction } from '@/services/solana';
import { SOLANA_ADDRESS } from '@/utils/constants';
import { PollingStatus } from '@components/Trade/TradeStatusModal/types';
import { ToastProps } from '@components/Common/Toast/toast_types';
import { usePortfolioStore } from '@/store/portfolio';

export const handleTokenSelect = (
	coin: Coin,
	tokens: PortfolioToken[]
): PortfolioToken | undefined => {
	return tokens.find(t => t.coin.mintAddress === coin.mintAddress);
};

export const validateForm = async (
	formData: TokenTransferFormData,
	selectedToken?: PortfolioToken
): Promise<string | null> => {
	if (!formData.toAddress) {
		return 'Recipient address is required';
	}

	const isValidAddress = await validateSolanaAddress(formData.toAddress);
	if (!isValidAddress) {
		return 'Invalid Solana address';
	}

	if (!formData.amount || parseFloat(formData.amount) <= 0) {
		return 'Please enter a valid amount';
	}

	if (!formData.selectedTokenMint) {
		return 'Please select a token';
	}

	if (selectedToken) {
		const amount = parseFloat(formData.amount);
		if (amount > selectedToken.amount) {
			return `Insufficient balance. Maximum available: ${formatTokenBalance(selectedToken.amount)} ${selectedToken.coin.symbol}`;
		}
	}

	return null;
};

export const handleTokenTransfer = async (
	formData: TokenTransferFormData
): Promise<string> => {
	try {
		// Prepare and sign the transfer transaction
		const signedTransaction = await buildAndSignTransferTransaction(
			formData.toAddress,
			formData.selectedTokenMint,
			parseFloat(formData.amount)
		);

		// Submit the signed transaction
		const submitResponse = await grpcApi.submitCoinTransfer({
			signedTransaction
		});

		return submitResponse.transactionHash;
	} catch (error) {
		console.error('Token transfer failed:', error);

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
		console.log('Polling stopped.');
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
			showToast({ type: 'success', message: 'Transfer finalized successfully!' });
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
