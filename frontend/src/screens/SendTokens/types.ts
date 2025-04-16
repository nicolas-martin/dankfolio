export interface SendTokensScreenProps {
	navigation: any; // We'll properly type this if needed
}

export interface TokenTransferFormData {
	toAddress: string;
	amount: string;
	selectedToken: string;
}

export interface TokenOption {
	value: string;
	label: string;
	balance: number;
} 