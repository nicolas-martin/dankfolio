import { TokenTransferFormData } from './types';
import { Coin } from '@/types';
import { grpcApi } from '@/services/grpcApi';
import { PortfolioToken } from '@store/portfolio';
import { validateSolanaAddress } from '@/services/solana';
import { prepareCoinTransfer, signTransferTransaction } from '@/services/solana';
import { usePortfolioStore, getActiveWalletKeys } from '@/store/portfolio';
import { logger } from '@/utils/logger';
// formatBalance import from numberFormat is already present and used as 'formatBalance'
// No change needed here, just ensure the local formatTokenBalance function is removed later.
import { formatTokenBalance as formatBalance } from '@/utils/numberFormat';


export const handleTokenSelect = (
	coin: Coin,
	tokens: PortfolioToken[]
): PortfolioToken | undefined => {
	return tokens.find(t => t.coin.address === coin.address);
};

export interface AddressValidationResult {
	isValid: boolean;
	code?: string;
	message: string;
	hasBalance?: boolean;
	balanceInfo?: string;
}

export const validateAddressRealTime = async (
	address: string,
	selectedToken?: PortfolioToken,
	setIsValidatingAddress?: (loading: boolean) => void,
	setVerificationInfo?: (info: { message: string; code?: string } | null) => void,
	setValidationError?: (error: string | null) => void
): Promise<void> => {
	if (!address || address.length < 32 || address.length > 44) {
		return; // Skip validation for addresses that are too short or too long
	}

	try {
		setIsValidatingAddress?.(true);
		setValidationError?.(null);
		setVerificationInfo?.(null);

		// First check if it's a valid Solana address format
		const isValidSolanaAddress = await validateSolanaAddress(address);
		if (!isValidSolanaAddress) {
			setValidationError?.('Invalid Solana address');
			return;
		}

		// Check recipient address balance and provide helpful feedback
		const recipientBalance = await grpcApi.getWalletBalance(address);
		const hasAnyBalance = recipientBalance.balances.length > 0 && recipientBalance.balances.some(b => b.amount > 0);

		if (hasAnyBalance) {
			// Address has balance - show confirmation with balance info
			const totalBalances = recipientBalance.balances.length;
			setVerificationInfo?.({
				message: `Recipient address is active with ${totalBalances} token${totalBalances > 1 ? 's' : ''}`,
				code: "ADDRESS_HAS_BALANCE"
			});
		} else {
			// Address is valid but has no balance - show warning
			setVerificationInfo?.({
				message: "Recipient address is valid but appears to be unused",
				code: "ADDRESS_NO_BALANCE"
			});
		}
	} catch (error) {
		// Handle specific error types from the backend
		if (error instanceof Error) {
			const errorMessage = error.message.toLowerCase();

			// Handle invalid address errors
			if (errorMessage.includes('invalid wallet address') || errorMessage.includes('invalid argument')) {
				setValidationError?.('Invalid Solana address format');
				return;
			}

			// Handle network errors
			if (errorMessage.includes('network error') || errorMessage.includes('unavailable')) {
				logger.warn('[validateAddressRealTime] Network error checking recipient balance:', error);
				setVerificationInfo?.({
					message: "Unable to verify recipient address status",
					code: "ADDRESS_BALANCE_CHECK_FAILED"
				});
				return;
			}
		}

		// For other errors, log and show generic message
		logger.warn('[validateAddressRealTime] Failed to check recipient balance:', error);
		setVerificationInfo?.({
			message: "Unable to verify recipient address status",
			code: "ADDRESS_BALANCE_CHECK_FAILED"
		});
	} finally {
		setIsValidatingAddress?.(false);
	}
};

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

		// Log transaction details for debugging (no sensitive data)
		if (__DEV__) {
			console.log('🔍 Transaction signed successfully');
			console.log('📋 Transaction Length:', signedTransaction.length);
			console.log('📋 Public Key:', keys.publicKey);
		}

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

// Removed local formatTokenBalance. The import aliasing 'formatTokenBalance as formatBalance'
// from '@/utils/numberFormat' is already in use by validateForm.

export const getDefaultSolanaToken = (tokens: PortfolioToken[]): PortfolioToken | undefined => {
	return tokens.find(t => t.coin.symbol === 'SOL');
};

// --- Polling Functions (stopPolling, pollTransactionStatus, startPolling) ---
// These functions have been removed as their logic is now encapsulated within
// the useTransactionPolling hook (frontend/src/hooks/useTransactionPolling.ts).
// The SendScreen component (frontend/src/screens/Send/index.tsx) now utilizes
// this hook for managing transaction polling state and lifecycle.
