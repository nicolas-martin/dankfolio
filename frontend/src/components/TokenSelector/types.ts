import { PortfolioToken } from '@store/portfolio';

export interface TokenSelectorProps {
	selectedToken?: PortfolioToken;
	tokens: PortfolioToken[];
	onSelectToken: (token: PortfolioToken) => void;
	label?: string;
}

export interface TokenSearchModalProps extends TokenSelectorProps {
	visible: boolean;
	onDismiss: () => void;
} 