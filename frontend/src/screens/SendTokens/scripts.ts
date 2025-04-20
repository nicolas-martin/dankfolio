import { TokenTransferFormData } from './types';
import { Wallet, Coin } from '@/types';
import grpcApi from '@/services/grpcApi';
import { PortfolioToken } from '@store/portfolio';
import { validateSolanaAddress } from '@/services/solana';
import { buildAndSignTransferTransaction } from '@/services/solana';

export const handleTokenSelect = (
	coin: Coin,
	tokens: PortfolioToken[]
): PortfolioToken | undefined => {
	return tokens.find(t => t.coin.id === coin.id);
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
	formData: TokenTransferFormData,
	wallet: Wallet
): Promise<string> => {
	try {
		// Prepare the transfer transaction
		const signedTransaction = await buildAndSignTransferTransaction(formData.toAddress,
			formData.selectedTokenMint,
			parseFloat(formData.amount),
			wallet,
		);

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

export const getDefaultSolanaToken = (tokens: PortfolioToken[]): PortfolioToken | undefined => {
	return tokens.find(t => t.coin.symbol === 'SOL');
}; 
