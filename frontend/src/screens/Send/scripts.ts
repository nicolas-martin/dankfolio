import React from 'react';
import { TokenTransferFormData } from './types';
import { Wallet, Coin } from '@/types';
import { grpcApi } from '@/services/grpcApi';
import { PortfolioToken } from '@store/portfolio';
import { validateSolanaAddress } from '@/services/solana';
import { prepareCoinTransfer, signTransferTransaction } from '@/services/solana';
import { PollingStatus } from '@components/Trade/TradeStatusModal/types';
import { ToastProps } from '@components/Common/Toast/toast_types';
import { usePortfolioStore, getActiveWalletKeys } from '@/store/portfolio';
import { logger } from '@/utils/logger';
import { formatTokenBalance as formatBalance } from '@/utils/numberFormat';

export const handleTokenSelect = (
	coin: Coin,
	tokens: PortfolioToken[]
): PortfolioToken | undefined => {
	return tokens.find(t => t.coin.mintAddress === coin.mintAddress);
};

export interface AddressValidationResult {
	isValid: boolean;
	code?: string;
	message: string;
	hasBalance?: boolean;
	balanceInfo?: string;
}

export const validateForm = async (
	formData: TokenTransferFormData,
	selectedToken?: PortfolioToken
): Promise<AddressValidationResult | null> => {
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
			return { isValid: false, message: `Insufficient balance. Maximum available: ${formatBalance(selectedToken.amount)} ${selectedToken.coin.symbol}` };
		}
	}

	// Check recipient address balance and provide helpful feedback
	try {
		const recipientBalance = await grpcApi.getWalletBalance(formData.toAddress);
		const hasAnyBalance = recipientBalance.balances.length > 0 && recipientBalance.balances.some(b => b.amount > 0);
		
		if (hasAnyBalance) {
			// Address has balance - show confirmation with balance info
			const totalBalances = recipientBalance.balances.length;
			return { 
				isValid: true, 
				code: "ADDRESS_HAS_BALANCE", 
				message: `Recipient address is active with ${totalBalances} token${totalBalances > 1 ? 's' : ''}`,
				hasBalance: true,
				balanceInfo: `This address has ${totalBalances} token${totalBalances > 1 ? 's' : ''} in their wallet`
			};
		} else {
			// Address is valid but has no balance - show warning
			return { 
				isValid: true, 
				code: "ADDRESS_NO_BALANCE", 
				message: "Recipient address is valid but appears to be unused",
				hasBalance: false,
				balanceInfo: "This address has no transaction history. Please verify the address is correct."
			};
		}
	} catch (error) {
		// Handle specific error types from the backend
		if (error instanceof Error) {
			const errorMessage = error.message.toLowerCase();
			
			// Handle invalid address errors
			if (errorMessage.includes('invalid wallet address') || errorMessage.includes('invalid argument')) {
				return { isValid: false, message: 'Invalid Solana address format' };
			}
			
			// Handle network errors
			if (errorMessage.includes('network error') || errorMessage.includes('unavailable')) {
				logger.warn('[validateForm] Network error checking recipient balance:', error);
				return { 
					isValid: true, 
					code: "ADDRESS_BALANCE_CHECK_FAILED", 
					message: "Unable to verify recipient address status",
					balanceInfo: "Network error occurred while checking address. Please verify the address is correct."
				};
			}
		}
		
		// For other errors, log and show generic message
		logger.warn('[validateForm] Failed to check recipient balance:', error);
		return { 
			isValid: true, 
			code: "ADDRESS_BALANCE_CHECK_FAILED", 
			message: "Unable to verify recipient address status",
			balanceInfo: "Could not check address status. Please verify the address is correct."
		};
	}
};

export const handleTokenTransfer = async (formData: TokenTransferFormData): Promise<string> => {
	try {
		const walletAddress = usePortfolioStore.getState().wallet?.address;
		if (!walletAddress) {
			logger.error('[handleTokenTransfer] No wallet address found in store.');
			throw new Error('Wallet not connected. Please connect your wallet.');
		}

		const unsignedTransaction = await prepareCoinTransfer(
			formData.toAddress,
			formData.selectedTokenMint,
			parseFloat(formData.amount),
			walletAddress // userPublicKey
		);

		// 🔍 LOG UNSIGNED TRANSACTION FOR TESTING
		console.log('🔍 UNSIGNED TRANSACTION CAPTURED:');
		console.log('📋 Transaction Base64:', unsignedTransaction);
		console.log('📋 Transaction Length:', unsignedTransaction.length);
		console.log('📋 From Address:', walletAddress);
		console.log('📋 To Address:', formData.toAddress);
		console.log('📋 Token Mint:', formData.selectedTokenMint);
		console.log('📋 Amount:', formData.amount);
		console.log('📋 Copy this for tests: const CAPTURED_UNSIGNED_TX = \'' + unsignedTransaction + '\';');

		const keys = await getActiveWalletKeys();
		if (!keys || !keys.privateKey || !keys.publicKey) {
			logger.error('[handleTokenTransfer] Failed to get active wallet keys or keys are incomplete.');
			throw new Error('Failed to retrieve wallet keys for signing.');
		}

		if (keys.publicKey !== walletAddress) {
			logger.error('[handleTokenTransfer] Mismatch between store public key and keychain public key.');
			throw new Error('Wallet key mismatch. Please try reconnecting your wallet.');
		}

		const signedTransaction = await signTransferTransaction(
			unsignedTransaction,
			keys.publicKey,
			keys.privateKey
		);

		// 🔍 LOG SIGNED TRANSACTION FOR TESTING
		console.log('🔍 SIGNED TRANSACTION CAPTURED:');
		console.log('📋 Signed Transaction Base64:', signedTransaction);
		console.log('📋 Signed Transaction Length:', signedTransaction.length);
		console.log('📋 Public Key Used:', keys.publicKey);
		console.log('📋 Copy this for tests: const CAPTURED_SIGNED_TX = \'' + signedTransaction + '\';');

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
	pollingIntervalRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
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
			// Removed toast notification - status modal already shows finalization
		} else if (statusResult.status === 'confirmed' || statusResult.status === 'processed') {
			logger.info(`Transaction confirmed with ${statusResult.confirmations} confirmations, waiting for finalization (Send Screen)...`, { txHash });
			setPollingStatus('confirmed');
		} else {
			logger.info(`Current status: ${statusResult.status}, continuing poll (Send Screen)...`, { txHash, status: statusResult.status });
			setPollingStatus('polling');
		}
	} catch (error: unknown) {
		logger.exception(error, { functionName: 'pollTransactionStatus', context: 'SendScreen', params: { txHash } });
		setPollingStatus('failed');
		setPollingError(error instanceof Error ? error.message : 'Failed to fetch transaction status');
		stopPollingFn();
	}
};

export const startPolling = (
	txHash: string,
	pollFn: () => Promise<void>,
	stopPollingFn: () => void,
	pollingIntervalRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>
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
