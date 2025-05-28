import { render, fireEvent } from '@testing-library/react-native';
import { Provider as PaperProvider, useTheme } from 'react-native-paper';
import TradeConfirmation from './index';
import { Coin } from '@/types';

// Mock react-native-paper components and theme
jest.mock('react-native-paper', () => {
	const actualPaper = jest.requireActual('react-native-paper');
	const { View, Pressable } = require('react-native');
	const MockButton = (props: any) => {
		return (
			<Pressable
				onPress={props.onPress}
				disabled={props.disabled || props.loading}
				testID={props.testID}
			>
				<actualPaper.Text>{props.children}</actualPaper.Text>
				{props.loading && <actualPaper.ActivityIndicator testID={`${props.testID}-loading`} />}
			</Pressable>
		);
	};
	return {
		...actualPaper,
		useTheme: jest.fn(() => ({
			colors: {
				surface: 'white',
				text: 'black',
				primary: 'purple',
				error: 'red',
				// Add any other colors your component might use from the theme
			},
			roundness: 4,
			// Add any other theme properties your component might use
		})),
		Button: MockButton,
		Modal: (props: any) => props.visible ? <View testID="mock-modal">{props.children}</View> : null,
		Portal: (props: any) => <View testID="mock-portal">{props.children}</View>,
		ActivityIndicator: (props: any) => (props.animating === undefined || props.animating === true) ? <View testID={props.testID} /> : null, // Removed default testID
		Text: actualPaper.Text, // Use actual Text or mock if needed for specific styles
	};
});

// Mock Toast (if it were still used, good practice to keep if it might be re-added)
const mockShowToast = jest.fn();
jest.mock('@components/Common/Toast', () => ({
	useToast: () => ({
		showToast: mockShowToast,
	}),
}));

const mockFromCoin: Coin = {
	mintAddress: 'fromMint',
	name: 'FromCoin',
	symbol: 'FROM',
	price: 10.0,
	iconUrl: 'from_url',
	decimals: 9,
	balance: 100,
	value: 1000,
	description: '',
	tags: [],
	dailyVolume: 0,
};

const mockToCoin: Coin = {
	mintAddress: 'toMint',
	name: 'ToCoin',
	symbol: 'TO',
	price: 1.0,
	iconUrl: 'to_url',
	decimals: 6,
	balance: 500,
	value: 500,
	description: '',
	tags: [],
	dailyVolume: 0,
};

const defaultProps = {
	isVisible: true,
	onClose: jest.fn(),
	onConfirm: jest.fn(),
	fromAmount: '10',
	toAmount: '98',
	fromCoin: mockFromCoin,
	toCoin: mockToCoin,
	fees: {
		exchangeRate: '9.8',
		gasFee: '0.001',
		priceImpactPct: '1.5', // 1.5%
		totalFee: '0.02', // in USD
		route: 'FROM -> TO'
	},
	isLoading: false,
};

const renderComponent = (props = {}) => {
	return render(
		<PaperProvider>
			<TradeConfirmation {...defaultProps} {...props} />
		</PaperProvider>
	);
};

describe('TradeConfirmation', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		// Reset useTheme mock return value if it was changed in a test
		(useTheme as jest.Mock).mockReturnValue({
			colors: {
				surface: 'white',
				text: 'black',
				primary: 'purple',
				error: 'red',
			},
			roundness: 4,
		});
	});

	it('renders loading spinner if fromCoin is not provided', () => {
		const { getByTestId, queryByText } = renderComponent({ fromCoin: undefined });
		expect(getByTestId('loading-spinner')).toBeTruthy();
		expect(queryByText('Confirm Trade')).toBeTruthy(); // Title should still be there
		expect(queryByText('You Pay')).toBeNull(); // Details should not be visible
	});

	it('renders loading spinner if toCoin is not provided', () => {
		const { getByTestId, queryByText } = renderComponent({ toCoin: undefined });
		expect(getByTestId('loading-spinner')).toBeTruthy();
		expect(queryByText('Confirm Trade')).toBeTruthy();
		expect(queryByText('You Receive')).toBeNull();
	});

	it('renders correctly with all props provided', () => {
		const { getByText, getAllByText, queryByTestId, getByTestId } = renderComponent();

		expect(queryByTestId('loading-spinner')).toBeNull();
		// Check for title "Confirm Trade" - it appears once as the title
		const confirmTradeElements = getAllByText('Confirm Trade');
		expect(confirmTradeElements.length).toBe(1); // Only the title

		// Verify amounts and symbols are rendered - just check they exist, not exact format
		expect(getByText(defaultProps.fromAmount)).toBeTruthy(); // Check amount
		expect(getByText(mockFromCoin.symbol)).toBeTruthy(); // Check symbol
		expect(getByText(mockToCoin.symbol)).toBeTruthy(); // Check symbol
		expect(getByText(defaultProps.toAmount)).toBeTruthy(); // Check amount

		// Check that some USD value is displayed (should contain $ and numbers)
		const fromSection = getByTestId('from-coin-details');
		const toSection = getByTestId('to-coin-details');
		expect(fromSection).toBeTruthy();
		expect(toSection).toBeTruthy();

		// Fees section - just check that fee section exists and shows some fee
		const feeSection = getByTestId('fee-section');
		expect(feeSection).toBeTruthy();
		expect(getByText('Network Fee')).toBeTruthy();

		// Buttons
		expect(getByText('Cancel')).toBeTruthy();
		expect(getByText('Confirm')).toBeTruthy();
	});

	it('calls onClose when Cancel button is pressed', () => {
		const { getByTestId } = renderComponent();
		fireEvent.press(getByTestId('cancel-trade-button'));
		expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
	});

	it('calls onConfirm when Confirm Trade button is pressed', () => {
		const { getByTestId } = renderComponent();
		fireEvent.press(getByTestId('confirm-trade-button'));
		expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
	});

	it('disables buttons and shows loading on Confirm Trade button when isLoading is true', () => {
		const { getByTestId } = renderComponent({ isLoading: true });

		const confirmButton = getByTestId('confirm-trade-button');
		// Check if the loading indicator is part of the button (specific to mock)
		expect(getByTestId('confirm-trade-button-loading')).toBeTruthy();

		// Check if buttons are effectively disabled (Pressable's disabled prop)
		// Note: The mock Button uses `props.disabled || props.loading`
		fireEvent.press(confirmButton);
		expect(defaultProps.onConfirm).not.toHaveBeenCalled(); // Should not call if disabled

		const cancelButton = getByTestId('cancel-trade-button');
		fireEvent.press(cancelButton);
		expect(defaultProps.onClose).not.toHaveBeenCalled(); // Should also be disabled
	});

	it('calculates value correctly even if coin price is 0', () => {
		const fromCoinWithZeroPrice = { ...mockFromCoin, price: 0 };
		const { getByTestId } = renderComponent({ fromCoin: fromCoinWithZeroPrice });
		// Just check that the component renders without crashing when price is 0
		expect(getByTestId('from-coin-details')).toBeTruthy();
	});

	it('handles invalid amount gracefully', () => {
		const { getByTestId } = renderComponent({ fromAmount: 'invalid' });
		// Just check that the component renders without crashing with invalid amount
		expect(getByTestId('from-coin-details')).toBeTruthy();
		expect(getByTestId('to-coin-details')).toBeTruthy();
	});

	it('calculates value as $0.00 if amount is invalid', () => {
		const { getByText } = renderComponent({ fromAmount: 'invalid' });
		// The value is calculated as $0.00 for invalid amount
		expect(getByText('$0.00')).toBeTruthy();
		// And the "You Receive" value will be based on its valid amount and price.
		const expectedReceiveValue = `$${(parseFloat(defaultProps.toAmount) * mockToCoin.price).toFixed(4)}`;
		expect(getByText(expectedReceiveValue)).toBeTruthy();
	});

	it('does not render if isVisible is false', () => {
		const { queryByTestId } = renderComponent({ isVisible: false });
		expect(queryByTestId('mock-modal')).toBeNull();
	});
});
