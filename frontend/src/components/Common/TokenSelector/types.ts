import { Coin } from '@/types';
import type { InputUnit } from '@/screens/Trade/types'; // Import InputUnit
import type { StyleProp, ViewStyle, TextInputProps } from 'react-native'; // Import standard RN types

export interface TokenSelectorProps {
	selectedToken?: Coin;
	onSelectToken: (token: Coin) => void;
	label?: string;
	/** Optional custom style for container to override default styles */
	style?: StyleProp<ViewStyle>; // Changed from unknown to StyleProp<ViewStyle>
	amountValue?: string; // This will be the crypto amount
	onAmountChange?: (amount: string) => void; // This will be for crypto amount changes
	isAmountEditable?: boolean;
	isAmountLoading?: boolean; // For crypto amount loading, e.g. quote fetching
	showOnlyPortfolioTokens?: boolean;
	/** Optional testID for testing */
	testID?: string;

	// New props for USD toggle functionality
	enableUsdToggle?: boolean; // Will default to true in component
	// onUsdAmountChange prop removed as component now manages its USD display internally
	initialInputUnit?: InputUnit; // To set the initial unit from parent

	// Props for customizing the TextInput appearance and behavior
	textInputProps?: TextInputProps; // Allow passing props to the underlying TextInput
	// inputStyle?: StyleProp<ViewStyle>; // If a separate style for input field itself is needed
	helperText?: string; // To display helper text below the input
}

export interface TokenSearchModalProps {
	visible: boolean;
	onDismiss: () => void;
	selectedToken?: Coin;
	onSelectToken: (token: Coin) => void;
	showOnlyPortfolioTokens?: boolean;
	/** Optional testID for testing */
	testID?: string;
} 
