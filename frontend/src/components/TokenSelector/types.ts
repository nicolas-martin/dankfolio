import { Coin } from '@/types';

export interface TokenSelectorProps {
	selectedToken?: Coin;
	onSelectToken: (token: Coin) => void;
	label?: string;
	/** Optional custom style for container to override default styles */
	style?: any;
	amountValue?: string;
	onAmountChange?: (amount: string) => void;
	amountPlaceholder?: string;
	isAmountEditable?: boolean;
	isAmountLoading?: boolean;
}

export interface TokenSearchModalProps {
	visible: boolean;
	onDismiss: () => void;
	selectedToken?: Coin;
	onSelectToken: (token: Coin) => void;
} 