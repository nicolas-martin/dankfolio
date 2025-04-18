import { Coin } from '@/types';
import { PortfolioToken } from '@store/portfolio';

export interface TokenSelectorProps {
	selectedToken?: PortfolioToken | Coin;
	tokens: PortfolioToken[];
	onSelectToken: (token: PortfolioToken) => void;
	label?: string;
	/** Optional custom style for container to override default styles */
	style?: any;
	amountValue?: string;
	onAmountChange?: (amount: string) => void;
	amountPlaceholder?: string;
	isAmountEditable?: boolean;
	isAmountLoading?: boolean;
}

export interface TokenSearchModalProps extends Omit<TokenSelectorProps, 'amountValue' | 'onAmountChange' | 'amountPlaceholder' | 'isAmountEditable' | 'isAmountLoading'> {
	visible: boolean;
	onDismiss: () => void;
} 