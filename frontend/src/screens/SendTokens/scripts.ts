import { TokenTransferFormData } from './types';
import { Wallet } from '@/types';
import grpcApi from '@/services/grpcApi';

export const validateForm = (formData: TokenTransferFormData): string | null => {
	if (!formData.toAddress) {
		return 'Recipient address is required';
	}
	if (!formData.amount || parseFloat(formData.amount) <= 0) {
		return 'Please enter a valid amount';
	}
	if (!formData.selectedToken) {
		return 'Please select a token';
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