import { TokenTransferFormData } from './types';
import { Wallet } from '@/types';
import grpcApi from '@/services/grpcApi';
import { PortfolioToken } from '@store/portfolio';
import { validateSolanaAddress } from '@/services/solana';

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

	if (!formData.selectedToken) {
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
	formData: TokenTransferFormData,
	wallet: Wallet
): Promise<string> => {
	try {
		// Prepare the transfer transaction
		const prepareResponse = await grpcApi.prepareTokenTransfer({
			fromAddress: wallet.address,
			toAddress: formData.toAddress,
			tokenMint: formData.selectedToken === 'SOL' ? '' : formData.selectedToken,
			amount: parseFloat(formData.amount)
		});

		// TODO: Sign the transaction using wallet
		const signedTransaction = ''; // This needs to be implemented

		// Submit the signed transaction
		const submitResponse = await grpcApi.submitTokenTransfer({
			signedTransaction
		});

		return submitResponse.transactionHash;
	} catch (error) {
		console.error('Token transfer failed:', error);
		throw error;
	}
};

export const formatTokenBalance = (balance: number): string => {
	return balance.toLocaleString(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 6
	});
}; 