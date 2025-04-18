import { PortfolioToken } from '@store/portfolio';

export interface TokenSelectorProps {
	selectedToken?: PortfolioToken;
	tokens: PortfolioToken[];
	onSelectToken: (token: PortfolioToken) => void;
	label?: string;
	/** Optional custom style for container to override default styles */
	style?: any;
}

export interface TokenSearchModalProps extends TokenSelectorProps {
	visible: boolean;
	onDismiss: () => void;
} 