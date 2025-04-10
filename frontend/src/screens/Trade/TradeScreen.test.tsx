import React, { ReactElement } from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { mocked } from 'jest-mock';
import TradeScreen from './index';
import * as TradeScripts from './trade_scripts';
import { Coin } from '@/types';
import { View, Text, TextInput } from 'react-native';
import { SOLANA_ADDRESS } from '@/utils/constants';
import { Provider as PaperProvider } from 'react-native-paper';
import { fetchTradeQuote, signTradeTransaction, handleSwapCoins } from './trade_scripts';
import api from '@/services/api';
import { mockFromCoin, mockToCoin, mockWallet, mockFromPortfolioToken } from '@/__mocks__/testData';
import { mockPortfolioStoreReturn, usePortfolioStore } from '@/__mocks__/store/portfolio';
import { mockCoinStoreReturn, useCoinStore } from '@/__mocks__/store/coins';
import { fetchTradeQuote as mockFetchTradeQuote, signTradeTransaction as mockSignTradeTransaction } from '@/__mocks__/services/trade_scripts';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { PortfolioToken } from '@/store/portfolio';

// Mock Stores
jest.mock('@store/portfolio');
jest.mock('@store/coins');

// Mock Navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
	useNavigation: jest.fn(() => ({ navigate: mockNavigate })),
	useRoute: jest.fn(),
}));

// Mock Toast
const mockShowToast = jest.fn();
jest.mock('@components/Common/Toast', () => ({
	useToast: () => ({
		showToast: mockShowToast,
		hideToast: jest.fn(),
	}),
}));

// Mock Child Components
const createMockComponent = (name: string) => (props: any) => {
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
	return <View testID={`mock-${name}`} {...props}><Text>{name}</Text></View>;
};

jest.mock('@components/Trade/CoinSelector', () => createMockComponent('CoinSelector'));
jest.mock('@components/Trade/TradeDetails', () => createMockComponent('TradeDetails'));
jest.mock('@components/Trade/TradeConfirmation', () => createMockComponent('TradeConfirmation'));

// Mock Local Scripts
jest.mock('./trade_scripts', () => ({
	fetchTradeQuote: jest.fn(),
	signTradeTransaction: jest.fn(),
	handleSwapCoins: jest.fn(),
	DEFAULT_AMOUNT: "0.0001",
	QUOTE_DEBOUNCE_MS: 500,
}));

// Mock Services
jest.mock('@/services/api', () => ({
	submitTrade: jest.fn(),
	getTradeStatus: jest.fn()
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
	const renderWithProvider = (component: ReactElement) => {
		return render(
			<PaperProvider>
				{component}
			</PaperProvider>
		);
	};

	beforeEach(() => {
		// Clear all mocks
		jest.clearAllMocks();

		// Setup your mocks
		(mockFetchTradeQuote as jest.Mock).mockResolvedValue(undefined);
		(mockSignTradeTransaction as jest.Mock).mockResolvedValue('mock_signed_tx');
		(api.submitTrade as jest.Mock).mockResolvedValue({ transaction_hash: 'mock_tx_hash' });
		(api.getTradeStatus as jest.Mock).mockResolvedValue({
			status: 'completed',
			transaction_hash: 'mock_tx_hash',
			timestamp: new Date().toISOString(),
			from_amount: '1.5',
			to_amount: '100.5'
		});

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
		const { getAllByTestId, findByTestId, getByText, getByTestId } = renderWithProvider(<TradeScreen />);

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

		const { getByTestId, findByTestId } = renderWithProvider(<TradeScreen />); // Add findByTestId

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
		renderWithProvider(<TradeScreen />);

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

		const { getByTestId, getByText } = renderWithProvider(<TradeScreen />);

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

		const { getByTestId, getByText, findByTestId } = renderWithProvider(<TradeScreen />); // Add findByTestId

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

		const { getByTestId, getByText, findByTestId } = renderWithProvider(<TradeScreen />);

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
		(TradeScripts.handleSwapCoins as jest.Mock).mockClear();

		// Extract and call the onConfirm prop passed to the mock modal
		const onConfirm = confirmationModal.props.onConfirm;
		await act(async () => {
			await onConfirm();
		});

		// Assert that handleTrade was called
		await waitFor(() => expect(TradeScripts.handleSwapCoins).toHaveBeenCalledTimes(1));

		// Assert handleTrade arguments
		expect(TradeScripts.handleSwapCoins).toHaveBeenCalledWith(
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
		renderWithProvider(<TradeScreen />);

		// Assert: Wait for the effect and check the calls
		await waitFor(() => {
			expect(mockCoinStoreReturn.getCoinByID).toHaveBeenCalled();
		});

		expect(mockCoinStoreReturn.getCoinByID).toHaveBeenNthCalledWith(1, SOLANA_ADDRESS, true);
		expect(mockCoinStoreReturn.getCoinByID).toHaveBeenNthCalledWith(2, mockToCoin.id, true);
		expect(mockCoinStoreReturn.getCoinByID).toHaveBeenCalledTimes(2);
	});

	it('should show insufficient balance error if fromAmount exceeds available balance', async () => {
		// Arrange: Set a specific low balance for the from coin
		const lowBalanceToken: PortfolioToken = {
			...mockFromPortfolioToken,
			amount: 5, // Only 5 SOL available
			value: 5 * mockFromCoin.price,
		};
		mocked(usePortfolioStore).mockReturnValue({
			...mockPortfolioStoreReturn,
			tokens: [lowBalanceToken],
		});

		// Mock useRoute to provide initial coins
		mocked(useRoute).mockReturnValue({
			params: { initialFromCoin: mockFromCoin, initialToCoin: mockToCoin },
			key: 'test-key', // Add missing properties
			name: 'Trade', // Add missing properties
			path: undefined // Add missing properties
		});

		// Mock getCoinByID to return the coins
		mocked(useCoinStore().getCoinByID).mockImplementation(async (id) => {
			if (id === mockFromCoin.id) return mockFromCoin;
			if (id === mockToCoin.id) return mockToCoin;
			return null;
		});

		// Mock fetchTradeQuote to provide a dummy toAmount when fromAmount changes
		mocked(TradeScripts.fetchTradeQuote).mockImplementation(async (
			amount, fromCoin, toCoin, setLoading, setAmount, setDetails
		) => {
			if (setAmount) {
				// Simulate getting a quote (e.g., 1 SOL -> 1000 WEN)
				const numericAmount = parseFloat(amount);
				if (!isNaN(numericAmount)) {
					setAmount((numericAmount * 1000).toString());
				}
			}
		});

		const { getByTestId, findByText, getByText } = renderWithProvider(<TradeScreen />);

		// Wait for initial coin data to load (important because of useEffect)
		await waitFor(() => {
			expect(getByTestId('mock-CoinSelector-from')).toBeTruthy();
			expect(getByTestId('mock-CoinSelector-to')).toBeTruthy();
		});

		// Act: Enter an amount greater than the balance
		const fromInput = getByTestId('coin-selector-input-from');
		fireEvent.changeText(fromInput, '6'); // Try to trade 6 SOL (more than the 5 available)

		// Wait for the quote to update the 'to' amount
		await waitFor(() => {
			expect(mocked(TradeScripts.fetchTradeQuote)).toHaveBeenCalled();
		});

		// Act: Press the trade button
		const tradeButton = getByText('Trade');
		fireEvent.press(tradeButton);

		// Assert: Check if the insufficient funds toast message was shown
		await waitFor(() => {
			expect(mockShowToast).toHaveBeenCalledWith({
				type: 'error',
				message: expect.stringContaining(`Insufficient ${mockFromCoin.symbol}. You only have 5.000000 ${mockFromCoin.symbol}`),
			});
		});

		// Assert: Ensure Trade Confirmation is not shown and handleTrade is not called
		expect(getByTestId('mock-TradeConfirmation')).toHaveProp('isVisible', false);
		expect(mocked(TradeScripts.handleSwapCoins)).not.toHaveBeenCalled();
	});

	it('executes trade flow correctly when confirmation modal is confirmed', async () => {
		const { getByTestId } = renderWithProvider(<TradeScreen />);

		// Trigger trade submission
		fireEvent.press(getByTestId('mock-button')); // Updated to match the actual test ID

		// Confirm the trade in the confirmation modal
		const confirmationModal = getByTestId('mock-TradeConfirmation');
		fireEvent.press(confirmationModal.props.onConfirm);

		// Verify transaction signing was attempted
		await waitFor(() => expect(mockSignTradeTransaction).toHaveBeenCalledTimes(1));

		// Verify trade submission to API
		await waitFor(() => expect(api.submitTrade).toHaveBeenCalledTimes(1));
		expect(api.submitTrade).toHaveBeenCalledWith({
			signed_transaction: 'mock_signed_tx',
			from_coin_id: expect.any(String),
			to_coin_id: expect.any(String),
			amount: expect.any(Number)
		});

		// Verify status polling started
		await waitFor(() => expect(api.getTradeStatus).toHaveBeenCalledWith('mock_tx_hash'));
	});

	// Add more tests here for:
	// - Review Trade button shows confirmation
	// - Error handling (insufficient balance, API errors)

}); 
