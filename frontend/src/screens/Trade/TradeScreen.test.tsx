import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { mocked } from 'jest-mock';
import TradeScreen from './index';
import * as TradeScripts from './trade_scripts';
import { Coin, Wallet } from '@/types';
import { View, Text, TextInput } from 'react-native';
import { SOLANA_ADDRESS } from '@/utils/constants';

// Mock Stores
jest.mock('@store/portfolio');
jest.mock('@store/coins');

// Import store hooks AND types needed
import { usePortfolioStore, PortfolioToken } from '@store/portfolio';
import { useCoinStore } from '@store/coins';

// Add common mocks for RNGH and Reanimated
jest.mock('react-native-gesture-handler', () => {
	const View = require('react-native').View;
	return {
		GestureHandlerRootView: View,
		// Add other gesture handler exports if needed, e.g., State, Directions
	};
});
jest.mock('react-native-reanimated', () => {
	const Reanimated = require('react-native-reanimated/mock');
	// Modify or add mocks as needed
	Reanimated.useSharedValue = jest.fn(() => ({ value: 0 }));
	Reanimated.withTiming = jest.fn((toValue, _, cb) => {
		// Immediately invoke callback if provided
		if (cb) { cb(true); }
		return toValue; // Return the target value directly
	});
	Reanimated.withSpring = jest.fn((toValue, _, cb) => {
		// Immediately invoke callback if provided
		if (cb) { cb(true); }
		return toValue; // Return the target value directly
	});
	Reanimated.useAnimatedStyle = jest.fn(() => ({}));
	// Mock other Reanimated functions/hooks if your component uses them
	return Reanimated;
});

// Mock Navigation - Define factory returning jest.fn()
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
	// Return new mocks for the hooks
	useNavigation: jest.fn(() => ({ navigate: mockNavigate })),
	useRoute: jest.fn(), // Mock function for useRoute
	// Include other exports from react-navigation if needed directly by the component
	// Example: DefaultTheme: jest.requireActual('@react-navigation/native').DefaultTheme
}));

// Import hooks AFTER the mock definition - these will be the mock functions
import { useNavigation, useRoute } from '@react-navigation/native';

const mockFromCoin: Coin = {
	id: "So11111111111111111111111111111111111111112",
	name: "Solana",
	symbol: "SOL",
	icon_url: "sol_icon_url",
	decimals: 9,
	price: 150.0,
	description: "Solana Blockchain",
	website: "https://solana.com",
	twitter: "https://twitter.com/solana",
	telegram: "",
	daily_volume: 5e9,
	tags: ["layer-1"],
	created_at: "2024-01-01T00:00:00Z",
};

const mockToCoin: Coin = {
	id: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzL7xiH5HwMJI",
	name: "WEN",
	symbol: "WEN",
	icon_url: "wen_icon_url",
	decimals: 5,
	price: 0.00011,
	description: "WEN",
	website: "https://wen-foundation.org",
	twitter: "https://twitter.com/wenwencoin",
	telegram: "https://t.me/wenwencoinsol",
	daily_volume: 123456.78,
	tags: ["meme", "community"],
	created_at: "2024-01-01T00:00:00Z"
};

const mockWallet: Wallet = {
	address: 'TestWalletAddress12345',
	privateKey: 'TestPrivateKey12345',
	publicKey: 'TestPublicKey67890',
	balance: 0,
};

const mockFromPortfolioToken: PortfolioToken = {
	id: mockFromCoin.id,
	amount: 10,
	price: mockFromCoin.price,
	value: 10 * mockFromCoin.price,
	coin: mockFromCoin,
};

// --- Define Full Mock Return Values for Stores ---
const mockPortfolioStoreReturn = {
	wallet: mockWallet,
	isLoading: false,
	error: null,
	tokens: [mockFromPortfolioToken] as PortfolioToken[],
	setWallet: jest.fn(),
	clearWallet: jest.fn(),
	fetchPortfolioBalance: jest.fn(),
};

const mockCoinStoreReturn = {
	availableCoins: [mockFromCoin, mockToCoin] as Coin[],
	coinMap: {
		[mockFromCoin.id]: mockFromCoin,
		[mockToCoin.id]: mockToCoin,
	} as Record<string, Coin>,
	isLoading: false,
	error: null,
	setAvailableCoins: jest.fn(),
	setCoin: jest.fn(),
	fetchAvailableCoins: jest.fn(),
	getCoinByID: jest.fn().mockResolvedValue(null), // Default mock
};

// --- Mock Component Creator ---
const createMockComponent = (name: string) => (props: any) => {
	// Special handling for CoinSelector to include an input and expose coin prop
	if (name === 'CoinSelector') {
		const { label, amount, coinData } = props;
		const inputTestID = `coin-selector-input-${label?.toLowerCase() || 'unknown'}`;
		return (
			<View testID={`mock-${name}-${label?.toLowerCase() || 'unknown'}`} {...props} mockPassedCoin={coinData?.coin}>
				<Text>{label}</Text>
				{amount?.onChange && (
					<TextInput
						testID={inputTestID}
						value={amount.value}
						onChangeText={amount.onChange}
						placeholder={`Enter ${label} amount`}
						keyboardType="numeric"
					/>
				)}
				<Text>{name}</Text>
			</View>
		);
	}

	// Default mock for other components
	return <View testID={`mock-${name}`} {...props}><Text>{name}</Text></View>;
};

// Mock Toast
const mockShowToast = jest.fn();
jest.mock('@components/Common/Toast', () => ({
	useToast: () => ({
		showToast: mockShowToast,
		hideToast: jest.fn(),
	}),
}));

// Mock Child Components
jest.mock('@components/Trade/CoinSelector', () => createMockComponent('CoinSelector'));
jest.mock('@components/Trade/TradeDetails', () => createMockComponent('TradeDetails'));
// Restore simple mock for TradeConfirmation
jest.mock('@components/Trade/TradeConfirmation', () => createMockComponent('TradeConfirmation'));

// Mock Local Scripts
jest.mock('./trade_scripts', () => {
	const originalModule = jest.requireActual('./trade_scripts');
	return {
		...originalModule,
		// Mock functions we spy on or want to control
		fetchTradeQuote: jest.fn(),
		handleTrade: jest.fn(),
	};
});

// Mock Services
jest.mock('@/services/api', () => ({
	// Mock specific API functions used by trade_scripts if necessary
	getTokenPrices: jest.fn().mockResolvedValue({}),
	getTradeQuote: jest.fn().mockResolvedValue({ estimatedAmount: '0', fee: '0', priceImpact: '0', exchangeRate: '0', routePlan: [] }),
	executeTrade: jest.fn().mockResolvedValue({ transaction_hash: 'mock_tx_hash' }),
}));
jest.mock('@/services/solana', () => ({
	buildAndSignSwapTransaction: jest.fn().mockResolvedValue('mock_signed_tx'),
}));

// Mock react-native-paper (Theme and Button)
jest.mock('react-native-paper', () => {
	const actualPaper = jest.requireActual('react-native-paper');
	const React = require('react');
	const Pressable = require('react-native').Pressable;
	const Text = require('react-native').Text;

	const MockButton = (props: any) => (
		<Pressable
			onPress={props.onPress}
			disabled={props.disabled}
			style={props.style}
			accessibilityRole="button"
			testID={props.testID || 'mock-button'}
		>
			<Text style={props.labelStyle}>{props.children}</Text>
		</Pressable>
	);

	const mockTheme = {
		colors: { primary: 'purple', onSurface: 'black', /* ... other colors */ },
		// ... other theme properties
	};

	return {
		...actualPaper,
		Button: MockButton,
		Text: actualPaper.Text,
		useTheme: () => mockTheme,
		// Add other components used by TradeScreen if needed
	};
});

// --- Test Suite ---
describe('TradeScreen', () => {

	beforeEach(() => {
		jest.clearAllMocks(); // Good practice to clear previous mocks first

		// Silence console methods for the upcoming test
		jest.spyOn(console, 'log').mockImplementation(() => { });
		jest.spyOn(console, 'error').mockImplementation(() => { });
		jest.spyOn(console, 'warn').mockImplementation(() => { });

		// No need to clear mockNavigate here as useNavigation mock creates a new one each time
		// mockNavigate.mockClear(); 
		(useRoute as jest.Mock).mockClear(); // Clear the imported mock function
		mockPortfolioStoreReturn.tokens = [mockFromPortfolioToken];
		Object.values(mockPortfolioStoreReturn).forEach(mockFn => jest.isMockFunction(mockFn) && mockFn.mockClear());
		Object.values(mockCoinStoreReturn).forEach(mockFn => jest.isMockFunction(mockFn) && mockFn.mockClear());

		mocked(usePortfolioStore).mockReturnValue(mockPortfolioStoreReturn);
		mocked(useCoinStore).mockReturnValue(mockCoinStoreReturn);

		mockCoinStoreReturn.getCoinByID.mockImplementation(async (id, forceRefresh) => {
			if (id === mockFromCoin.id) return mockFromCoin;
			if (id === mockToCoin.id) return mockToCoin;
			if (id === SOLANA_ADDRESS) return { ...mockFromCoin, id: SOLANA_ADDRESS, name: 'Solana', symbol: 'SOL' };
			return null;
		});

		// Reset useRoute mock using the imported mock function
		(useRoute as jest.Mock).mockReturnValue({
			key: 'TradeScreen-Default',
			name: 'TradeScreen',
			params: {
				initialFromCoin: mockFromCoin,
				initialToCoin: mockToCoin,
			},
		});
	});

	afterEach(() => {
		// Restore all mocks created with jest.spyOn or jest.mock
		jest.restoreAllMocks();
	});

	it('renders correctly with initial coins', async () => {
		const { getAllByTestId, findByTestId, getByText, getByTestId } = render(<TradeScreen />);

		// Check if main components are rendered (using mocks with specific IDs)
		expect(getByTestId('mock-CoinSelector-from')).toBeTruthy();
		expect(getByTestId('mock-CoinSelector-to')).toBeTruthy();
		expect(getByText('Trade')).toBeTruthy(); // Correct button text is "Trade"

		// Check initial state rendering (e.g., correct coins in selectors if mock passes props)
		// More detailed checks will be in specific tests
	});

	it('fetches quote and updates details on fromAmount change', async () => {
		// 1. Define Mock Quote Data
		const mockQuoteData = {
			estimatedAmount: '12345.67',
			exchangeRate: '82304.46',
			priceImpactPct: '0.01',
			totalFee: '0.000005',
			route: 'SOL -> WEN'
		};

		// 2. Mock the implementation of fetchTradeQuote for this test
		(TradeScripts.fetchTradeQuote as jest.Mock).mockImplementation(
			async (amount, fromC, toC, setIsQuoteLoading, setToAmount, setTradeDetails) => {
				act(() => {
					// Call setToAmount with the expected quote amount
					setToAmount(mockQuoteData.estimatedAmount);
					// Also set the trade details
					setTradeDetails({
						exchangeRate: mockQuoteData.exchangeRate,
						gasFee: mockQuoteData.totalFee, // Assuming gasFee uses totalFee for mock
						priceImpactPct: mockQuoteData.priceImpactPct,
						totalFee: mockQuoteData.totalFee,
						route: mockQuoteData.route,
					});
				});
			}
		);

		const { getByTestId, findByTestId } = render(<TradeScreen />); // Add findByTestId

		// Wait for initial price refresh to potentially finish
		await waitFor(() => expect(mockCoinStoreReturn.getCoinByID).toHaveBeenCalledTimes(2));

		// Find the "From" input (using the new testID)
		const fromInput = getByTestId('coin-selector-input-from');

		// Clear any previous calls to ensure we test only the changeText trigger
		(TradeScripts.fetchTradeQuote as jest.Mock).mockClear();

		// Simulate entering an amount
		const testAmount = '1.5';
		fireEvent.changeText(fromInput, testAmount);

		// Wait for fetchTradeQuote to be called
		await waitFor(() => expect(TradeScripts.fetchTradeQuote).toHaveBeenCalledTimes(1));

		// Assert fetchTradeQuote arguments (still useful)
		expect(TradeScripts.fetchTradeQuote).toHaveBeenCalledWith(
			testAmount,
			mockFromCoin,
			mockToCoin,
			expect.any(Function), // setIsQuoteLoading
			expect.any(Function), // setToAmount
			expect.any(Function)  // setTradeDetails
		);

		// 3. Add Assertions for UI updates

		// Assert "To" amount input value
		const toInput = getByTestId('coin-selector-input-to');
		expect(toInput.props.value).toBe(mockQuoteData.estimatedAmount);

		// Assert TradeDetails props (use findByTestId as it might appear async)
		const tradeDetailsComponent = await findByTestId('mock-TradeDetails');
		expect(tradeDetailsComponent.props.exchangeRate).toBe(mockQuoteData.exchangeRate);
		expect(tradeDetailsComponent.props.priceImpactPct).toBe(mockQuoteData.priceImpactPct);
		expect(tradeDetailsComponent.props.totalFee).toBe(mockQuoteData.totalFee);
		expect(tradeDetailsComponent.props.route).toBe(mockQuoteData.route);
	});

	it('calls store hooks and initial fetch expected number of times', async () => {
		render(<TradeScreen />);

		await waitFor(() => expect(mockCoinStoreReturn.getCoinByID).toHaveBeenCalledTimes(2));

		// Assert hook call counts using the require syntax
		expect(require('@store/portfolio').usePortfolioStore).toHaveBeenCalledTimes(1);
		expect(require('@store/coins').useCoinStore).toHaveBeenCalledTimes(1);

		// Assert specific function call count within useEffect
		expect(mockCoinStoreReturn.getCoinByID).toHaveBeenCalledTimes(2);
		expect(mockCoinStoreReturn.getCoinByID).toHaveBeenCalledWith(mockFromCoin.id, true);
		expect(mockCoinStoreReturn.getCoinByID).toHaveBeenCalledWith(mockToCoin.id, true);

		// Assert other store actions were NOT called on mount
		expect(mockPortfolioStoreReturn.fetchPortfolioBalance).not.toHaveBeenCalled();
		expect(mockCoinStoreReturn.fetchAvailableCoins).not.toHaveBeenCalled();
	});

	it('swaps coins and amounts when swap button is pressed', async () => {
		// Mock quote fetch to populate amounts
		const initialFromAmount = '1';
		const initialToAmount = '1350000'; // Example value returned by quote
		(TradeScripts.fetchTradeQuote as jest.Mock).mockImplementation(
			async (amount, fromC, toC, setIsQuoteLoading, setToAmount, setTradeDetails) => {
				act(() => {
					if (fromC.id === mockFromCoin.id) {
						setToAmount(initialToAmount);
					}
					// Basic details mock
					setTradeDetails({ exchangeRate: '1350000', gasFee: '0', priceImpactPct: '0', totalFee: '0' });
				});
			}
		);

		const { getByTestId, getByText } = render(<TradeScreen />);

		// Wait for initial price refresh
		await waitFor(() => expect(mockCoinStoreReturn.getCoinByID).toHaveBeenCalledTimes(2));

		// Find inputs
		const fromInput = getByTestId('coin-selector-input-from');
		const toInput = getByTestId('coin-selector-input-to');

		// Set initial "From" amount to trigger quote and populate "To" amount
		fireEvent.changeText(fromInput, initialFromAmount);

		// Wait for the "To" amount to be updated by the quote fetch
		await waitFor(() => expect(toInput.props.value).toBe(initialToAmount));

		// Find and press the Swap button
		const swapButton = getByText('Swap');
		fireEvent.press(swapButton);

		// Assert that amounts are swapped in the inputs
		await waitFor(() => {
			expect(fromInput.props.value).toBe(initialToAmount); // From input should now have initial To amount
			expect(toInput.props.value).toBe(initialFromAmount); // To input should now have initial From amount
		});

		// We could also assert that the coin objects themselves were swapped in the state
		// by checking the props passed to the mocked CoinSelectors, but checking inputs is often sufficient.
	});

	it('shows confirmation modal when Trade button is pressed with valid amounts', async () => {
		// Mock quote fetch to populate amounts so button is enabled
		const initialFromAmount = '1';
		const initialToAmount = '1350000';
		(TradeScripts.fetchTradeQuote as jest.Mock).mockImplementation(
			async (amount, fromC, toC, setIsQuoteLoading, setToAmount, setTradeDetails) => {
				act(() => {
					if (fromC.id === mockFromCoin.id) {
						setToAmount(initialToAmount);
					}
					setTradeDetails({ exchangeRate: '1350000', gasFee: '0', priceImpactPct: '0', totalFee: '0' });
				});
			}
		);

		const { getByTestId, getByText, findByTestId } = render(<TradeScreen />); // Add findByTestId

		// Wait for initial price refresh
		await waitFor(() => expect(mockCoinStoreReturn.getCoinByID).toHaveBeenCalledTimes(2));

		// Find inputs
		const fromInput = getByTestId('coin-selector-input-from');
		const toInput = getByTestId('coin-selector-input-to');

		// Set initial "From" amount to trigger quote and populate "To" amount
		fireEvent.changeText(fromInput, initialFromAmount);
		await waitFor(() => expect(toInput.props.value).toBe(initialToAmount));

		// Find the Trade button and press it
		const tradeButton = getByText('Trade');
		fireEvent.press(tradeButton);

		// Assert that the confirmation modal mock becomes visible
		const confirmationModal = await findByTestId('mock-TradeConfirmation');
		expect(confirmationModal.props.isVisible).toBe(true);
	});

	it('calls handleTrade when confirmation modal is confirmed', async () => {
		// Mock quote fetch to populate amounts so button is enabled
		const initialFromAmount = '1';
		const initialToAmount = '1350000';
		(TradeScripts.fetchTradeQuote as jest.Mock).mockImplementation(
			async (amount, fromC, toC, setIsQuoteLoading, setToAmount, setTradeDetails) => {
				act(() => {
					if (fromC.id === mockFromCoin.id) {
						setToAmount(initialToAmount);
					}
					setTradeDetails({ exchangeRate: '1350000', gasFee: '0', priceImpactPct: '0', totalFee: '0' });
				});
			}
		);

		const { getByTestId, getByText, findByTestId } = render(<TradeScreen />);

		// Wait for initial price refresh
		await waitFor(() => expect(mockCoinStoreReturn.getCoinByID).toHaveBeenCalledTimes(2));

		// Find inputs and populate amounts
		const fromInput = getByTestId('coin-selector-input-from');
		const toInput = getByTestId('coin-selector-input-to');
		fireEvent.changeText(fromInput, initialFromAmount);
		await waitFor(() => expect(toInput.props.value).toBe(initialToAmount));

		// Press the Trade button to (theoretically) show the modal
		const tradeButton = getByText('Trade');
		fireEvent.press(tradeButton);

		// Find the confirmation modal mock
		const confirmationModal = await findByTestId('mock-TradeConfirmation');

		// Clear handleTrade mock before triggering confirm
		(TradeScripts.handleTrade as jest.Mock).mockClear();

		// Extract and call the onConfirm prop passed to the mock modal
		const onConfirm = confirmationModal.props.onConfirm;
		await act(async () => {
			await onConfirm();
		});

		// Assert that handleTrade was called
		await waitFor(() => expect(TradeScripts.handleTrade).toHaveBeenCalledTimes(1));

		// Assert handleTrade arguments
		expect(TradeScripts.handleTrade).toHaveBeenCalledWith(
			mockFromCoin,         // fromCoin
			mockToCoin,           // toCoin
			initialFromAmount,    // amount
			0.5,                  // slippage
			mockWallet,           // wallet
			{ navigate: mockNavigate }, // Correct: Expect the navigation object
			expect.any(Function),  // setIsLoading
			mockShowToast         // showToast
		);
	});

	it('should call getCoinByID with SOLANA_ADDRESS when initialFromCoin is null', async () => {
		// Arrange: Override the useRoute mock using the imported mock function
		(useRoute as jest.Mock).mockReturnValue({
			key: 'TradeScreen-NullFrom',
			name: 'TradeScreen',
			params: {
				initialFromCoin: null, // Set to null for this test
				initialToCoin: mockToCoin, // Ensure toCoin is set
			},
		});

		// Act: Render the component
		render(<TradeScreen />);

		// Assert: Wait for the effect and check the calls
		await waitFor(() => {
			expect(mockCoinStoreReturn.getCoinByID).toHaveBeenCalled();
		});

		expect(mockCoinStoreReturn.getCoinByID).toHaveBeenNthCalledWith(1, SOLANA_ADDRESS, true);
		expect(mockCoinStoreReturn.getCoinByID).toHaveBeenNthCalledWith(2, mockToCoin.id, true);
		expect(mockCoinStoreReturn.getCoinByID).toHaveBeenCalledTimes(2);
	});

	// Add more tests here for:
	// - Review Trade button shows confirmation
	// - Error handling (insufficient balance, API errors)

}); 
