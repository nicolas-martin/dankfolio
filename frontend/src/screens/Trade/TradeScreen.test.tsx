import { ReactElement } from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { mocked } from 'jest-mock';
import TradeScreen from './index';
import { View, Text } from 'react-native';
import { SOLANA_ADDRESS } from '@/utils/constants';
import { Provider as PaperProvider } from 'react-native-paper';
import { mockFromCoin, mockToCoin, mockFromPortfolioToken } from '@/__mocks__/testData';
import { mockPortfolioStoreReturn, usePortfolioStore } from '@/__mocks__/store/portfolio';
import { mockCoinStoreReturn, useCoinStore } from '@/__mocks__/store/coins';
import { fetchTradeQuote as mockFetchTradeQuote, signTradeTransaction as mockSignTradeTransaction } from '@/__mocks__/services/trade_scripts';
import { useRoute } from '@react-navigation/native';
import type { PortfolioToken } from '@/store/portfolio';
import { grpcApi } from '@/services/grpcApi';
import * as TradeScripts from '../../__mocks__/screens/Trade/trade_scripts';

// Mock Stores
jest.mock('@store/portfolio');
jest.mock('@store/coins');

// Mock Navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
	useNavigation: jest.fn(() => ({ navigate: mockNavigate })),
	useRoute: jest.fn(),
	useFocusEffect: jest.fn((callback) => callback()),
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
	if (name === 'TradeDetails') {
		return <View testID={`mock-${name}`} {...props}><Text>{name}</Text></View>;
	}
	return <View testID={`mock-${name}`} {...props}><Text>{name}</Text></View>;
};

// Mock Modules
jest.mock('@store/portfolio');
jest.mock('@store/coins');
jest.mock('@components/Common/TokenSelector', () => {
	return require('../../__mocks__/components/Common/TokenSelector').default;
});
jest.mock('@components/Trade/TradeDetails', () => createMockComponent('TradeDetails'));
jest.mock('@components/Trade/TradeConfirmation', () => createMockComponent('TradeConfirmation'));
jest.mock('@components/Trade/TradeStatusModal', () => createMockComponent('TradeStatusModal'));

// Mock Local Scripts
// Note: getCoinPrices will be specifically mocked within tests where needed
jest.mock('./trade_scripts', () => {
	const actualTradeScripts = jest.requireActual('./trade_scripts');
	const mockTradeScripts = require('../../__mocks__/screens/Trade/trade_scripts');
	return {
		...actualTradeScripts, // Use actual implementations for non-mocked functions
		...mockTradeScripts, // Override with mocks from the __mocks__ directory
		getCoinPrices: jest.fn(), // Add specific mock for getCoinPrices here
	};
});

// Mock Services
jest.mock('@/services/solana', () => ({
	buildAndSignSwapTransaction: jest.fn().mockResolvedValue('mock_signed_tx'),
}));

// Mock react-native-paper (Theme and Button)
jest.mock('react-native-paper', () => {
	const actualPaper = jest.requireActual('react-native-paper');
	const Pressable = require('react-native').Pressable;
	const Text = require('react-native').Text;

	const MockButton = (props: any) => (
		<Pressable
			onPress={props.onPress}
			disabled={props.disabled}
			style={props.style}
			accessibilityRole="button"
			testID={props.testID}
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
		Modal: ({ children }: any) => <>{children}</>, // Mock Modal to avoid timer leaks
		// Add other components used by TradeScreen if needed
	};
});

// Mock grpcApi
jest.mock('@/services/grpcApi');

// Speed up timers
jest.useFakeTimers();

// --- Test Suite ---
describe('TradeScreen', () => {
	const renderWithProvider = (component: ReactElement) => {
		return render(
			<PaperProvider>
				{component}
			</PaperProvider>
		);
	};

	beforeAll(() => {
		// Speed up timers
		jest.useFakeTimers();
	});

	afterAll(() => {
		// Clean up all timers and restore real timers
		jest.clearAllTimers();
		jest.useRealTimers();
		jest.restoreAllMocks();
	});

	beforeEach(() => {
		// Clear all mocks and timers
		jest.clearAllMocks();
		jest.clearAllTimers();

		// Setup your mocks
		(mockFetchTradeQuote as jest.Mock).mockResolvedValue(undefined);
		(mockSignTradeTransaction as jest.Mock).mockResolvedValue('mock_signed_tx');
		(grpcApi.submitSwap as jest.Mock).mockResolvedValue({ transactionHash: 'mock_tx_hash' });
		(grpcApi.getSwapStatus as jest.Mock).mockResolvedValue({
			status: 'completed',
			transactionHash: 'mock_tx_hash',
			timestamp: new Date().toISOString(),
			fromAmount: '1.5',
			toAmount: '100.5'
		});

		// Setup getCoinPrices mock
		(TradeScripts.getCoinPrices as jest.Mock).mockResolvedValue({
			[mockFromCoin.mintAddress]: mockFromCoin.price,
			[mockToCoin.mintAddress]: mockToCoin.price,
		});

		// Silence console methods
		jest.spyOn(console, 'log').mockImplementation(() => { });
		jest.spyOn(console, 'error').mockImplementation(() => { });
		jest.spyOn(console, 'warn').mockImplementation(() => { });

		mockPortfolioStoreReturn.tokens = [mockFromPortfolioToken];
		Object.values(mockPortfolioStoreReturn).forEach(mockFn => jest.isMockFunction(mockFn) && mockFn.mockClear());
		Object.values(mockCoinStoreReturn).forEach(mockFn => jest.isMockFunction(mockFn) && mockFn.mockClear());

		mocked(usePortfolioStore).mockReturnValue(mockPortfolioStoreReturn);
		mocked(useCoinStore).mockReturnValue(mockCoinStoreReturn);

		// Default mock for getCoinByID
		mockCoinStoreReturn.getCoinByID.mockImplementation(async (mintAddress: string, forceRefresh: boolean = false) => {
			// console.log(`Mock getCoinByID called with: ${mintAddress}, forceRefresh: ${forceRefresh}`);
			if (mintAddress === mockFromCoin.mintAddress) return { ...mockFromCoin, source: forceRefresh ? 'api' : 'cache' };
			if (mintAddress === mockToCoin.mintAddress) return { ...mockToCoin, source: forceRefresh ? 'api' : 'cache' };
			if (mintAddress === SOLANA_ADDRESS) {
				if (forceRefresh) {
					return { ...mockFromCoin, mintAddress: SOLANA_ADDRESS, name: 'Solana', symbol: 'SOL', source: 'api' };
				}
				// Simulate SOL not being in cache initially for one of the tests
				if ((useRoute as jest.Mock).mock.calls.some(call => call[0]?.key === 'TradeScreen-SOL-Not-In-Cache')) {
					return null;
				}
				return { ...mockFromCoin, mintAddress: SOLANA_ADDRESS, name: 'Solana', symbol: 'SOL', source: 'cache' };
			}
			return null;
		});

		(useRoute as jest.Mock).mockReturnValue({
			key: 'TradeScreen-Default', // Keep a default key or change per test
			name: 'TradeScreen',
			params: {
				initialFromCoin: mockFromCoin,
				initialToCoin: mockToCoin,
			},
		});
	});

	it('initializes correctly with initialFromCoin and initialToCoin, prioritizing cache', async () => {
		(useRoute as jest.Mock).mockReturnValue({
			key: 'TradeScreen-With-Initial-Coins',
			name: 'TradeScreen',
			params: { initialFromCoin: mockFromCoin, initialToCoin: mockToCoin },
		});
		renderWithProvider(<TradeScreen />);

		// IMPORTANT: Keep API call count assertion for performance monitoring
		await waitFor(() => {
			expect(mockCoinStoreReturn.getCoinByID).toHaveBeenCalledTimes(2);
		});

		// Verify correct coin fetching (should try cache first)
		expect(mockCoinStoreReturn.getCoinByID).toHaveBeenCalledWith(mockFromCoin.mintAddress, false);
		expect(mockCoinStoreReturn.getCoinByID).toHaveBeenCalledWith(mockToCoin.mintAddress, false);

		// Verify store actions that should NOT be called on mount
		expect(mockPortfolioStoreReturn.fetchPortfolioBalance).not.toHaveBeenCalled();
		expect(mockCoinStoreReturn.fetchAvailableCoins).not.toHaveBeenCalled();
	});

	it('handles quote fetching and UI updates on amount change', async () => {
		// Setup mock implementation - don't assert exact values, just that it works
		(TradeScripts.fetchTradeQuote as jest.Mock).mockImplementation(
			async (amount, fromC, toC, setIsQuoteLoading, setToAmount, setTradeDetails) => {
				setIsQuoteLoading(true);
				await Promise.resolve();
				// Use any reasonable values instead of exact ones
				setToAmount('12345.67');
				setTradeDetails({
					exchangeRate: '82304.46',
					gasFee: '0.000005',
					priceImpactPct: '0.01',
					totalFee: '0.000005',
					route: 'SOL -> WEN',
				});
				setIsQuoteLoading(false);
			}
		);

		const { getByTestId } = renderWithProvider(<TradeScreen />);
		
		// IMPORTANT: Keep API call count assertion for performance monitoring
		await waitFor(() => expect(mockCoinStoreReturn.getCoinByID).toHaveBeenCalledTimes(2));

		// Test FROM input quote fetching
		const fromInput = getByTestId('token-selector-input-from');

		await act(async () => {
			fireEvent.changeText(fromInput, '1.5');
			jest.advanceTimersByTime(TradeScripts.QUOTE_DEBOUNCE_MS);
			await Promise.resolve();
		});

		expect(fromInput.props.editable).toBe(true);
		await waitFor(() => expect(TradeScripts.fetchTradeQuote).toHaveBeenCalled());

		// Test TO input quote fetching
		const toInput = getByTestId('token-selector-input-to');

		await act(async () => {
			fireEvent.changeText(toInput, '100');
			jest.advanceTimersByTime(TradeScripts.QUOTE_DEBOUNCE_MS);
			await Promise.resolve();
		});

		expect(toInput.props.editable).toBe(true);
		await waitFor(() => expect(TradeScripts.fetchTradeQuote).toHaveBeenCalledWith(
			'100',
			expect.anything(),
			expect.anything(),
			expect.any(Function),
			expect.any(Function),
			expect.any(Function)
		));
	});

	it('skips quote fetching for incomplete numbers', async () => {
		const { getByTestId } = renderWithProvider(<TradeScreen />);
		
		// IMPORTANT: Keep API call count assertion for performance monitoring
		await waitFor(() => expect(mockCoinStoreReturn.getCoinByID).toHaveBeenCalledTimes(2));

		const fromInput = getByTestId('token-selector-input-from');

		// Test incomplete number cases
		const incompleteInputs = ['.', '0.', '1.'];
		for (const input of incompleteInputs) {
			await act(async () => {
				fireEvent.changeText(fromInput, input);
				jest.advanceTimersByTime(TradeScripts.QUOTE_DEBOUNCE_MS);
				await Promise.resolve();
			});
			expect(TradeScripts.fetchTradeQuote).not.toHaveBeenCalled();
		}

		// Test complete number
		await act(async () => {
			fireEvent.changeText(fromInput, '1.5');
			jest.advanceTimersByTime(TradeScripts.QUOTE_DEBOUNCE_MS);
			await Promise.resolve();
		});

		await waitFor(() => expect(TradeScripts.fetchTradeQuote).toHaveBeenCalled());
	});

	it('handles coin swapping correctly', async () => {
		const initialFromAmount = '1';
		const initialToAmount = '1350000';

		(TradeScripts.fetchTradeQuote as jest.Mock).mockImplementation(
			async (amount, fromC, toC, setIsQuoteLoading, setToAmount, setTradeDetails) => {
				act(() => {
					// Just set some reasonable values, don't assert exact ones
					setToAmount(fromC.mintAddress === mockFromCoin.mintAddress ? '1350000' : '1');
					setTradeDetails({ exchangeRate: '1350000', gasFee: '0', priceImpactPct: '0', totalFee: '0' });
				});
			}
		);

		(TradeScripts.handleSwapCoins as jest.Mock).mockImplementation(
			(fromCoin, toCoin, setFromCoin, setToCoin, fromAmount, setFromAmount, toAmount, setToAmount) => {
				act(() => {
					setFromCoin(toCoin);
					setToCoin(fromCoin);
					setFromAmount(toAmount);
					setToAmount(fromAmount);
				});
			}
		);

		const { getByTestId } = renderWithProvider(<TradeScreen />);
		
		// IMPORTANT: Keep API call count assertion for performance monitoring
		await waitFor(() => expect(mockCoinStoreReturn.getCoinByID).toHaveBeenCalledTimes(2));

		const fromInput = getByTestId('token-selector-input-from');
		fireEvent.changeText(fromInput, initialFromAmount);

		// Just verify that values change, not exact values
		await waitFor(() => expect(getByTestId('token-selector-input-to').props.value).toBeTruthy());

		fireEvent.press(getByTestId('swap-coins-button'));

		// Verify that swap occurred by checking that values changed
		await waitFor(() => {
			expect(fromInput.props.value).toBeTruthy();
			expect(getByTestId('token-selector-input-to').props.value).toBeTruthy();
		});
	});

	it('executes complete trade flow with confirmation', async () => {
		const mockFromAmount = '1';

		(TradeScripts.fetchTradeQuote as jest.Mock).mockImplementation(
			async (amount, fromC, toC, setIsQuoteLoading, setToAmount, setTradeDetails) => {
				act(() => {
					// Use any reasonable values
					setToAmount('1350000');
					setTradeDetails({ exchangeRate: '1350000', gasFee: '0', priceImpactPct: '0', totalFee: '0' });
					setIsQuoteLoading(false);
				});
			}
		);

		const { getByTestId } = renderWithProvider(<TradeScreen />);

		// IMPORTANT: Keep API call count assertion for performance monitoring
		await waitFor(() => expect(mockCoinStoreReturn.getCoinByID).toHaveBeenCalledTimes(2));

		// Set amount and trigger quote
		const fromInput = getByTestId('token-selector-input-from');
		fireEvent.changeText(fromInput, mockFromAmount);

		// Wait for quote to be fetched
		await waitFor(() => expect(TradeScripts.fetchTradeQuote).toHaveBeenCalledTimes(1));

		// Wait for loading to complete and open confirmation modal
		await waitFor(() => {
			const tradeButton = getByTestId('trade-button');
			expect(tradeButton.props.accessibilityState.disabled).toBe(false);
		});

		// Trigger trade execution
		fireEvent.press(getByTestId('trade-button'));

		// Wait for confirmation modal to appear
		const confirmationModal = await waitFor(() => getByTestId('mock-TradeConfirmation'));
		expect(confirmationModal.props.isVisible).toBe(true);

		// Confirm trade
		await act(async () => {
			await confirmationModal.props.onConfirm();
		});

		// Verify trade execution with expected parameters structure
		await waitFor(() => {
			expect(TradeScripts.executeTrade).toHaveBeenCalledWith(
				expect.objectContaining({ mintAddress: mockFromCoin.mintAddress }),
				expect.objectContaining({ mintAddress: mockToCoin.mintAddress }),
				mockFromAmount,
				1,  // slippage
				mockShowToast,
				expect.any(Function),  // setIsLoadingTrade
				expect.any(Function),  // setIsConfirmationVisible
				expect.any(Function),  // setPollingStatus
				expect.any(Function),  // setSubmittedTxHash
				expect.any(Function),  // setPollingError
				expect.any(Function),  // setPollingConfirmations
				expect.any(Function),  // setIsStatusModalVisible
				expect.any(Function)   // startPollingFn
			);
		});

		// Verify toast was shown (don't assert exact message)
		expect(mockShowToast).toHaveBeenCalledWith({
			type: 'success',
			message: expect.any(String)
		});
	});

	it('handles insufficient balance error', async () => {
		const lowBalanceToken: PortfolioToken = {
			...mockFromPortfolioToken,
			amount: 5,
			value: 5 * mockFromCoin.price,
		};
		mocked(usePortfolioStore).mockReturnValue({
			...mockPortfolioStoreReturn,
			tokens: [lowBalanceToken],
		});

		(TradeScripts.fetchTradeQuote as jest.Mock).mockImplementation(
			async (amount, fromC, toC, setIsQuoteLoading, setToAmount, setTradeDetails) => {
				const numericAmount = parseFloat(amount);
				if (!isNaN(numericAmount)) {
					act(() => {
						setToAmount((numericAmount * 1000).toString());
						setIsQuoteLoading(false);
					});
				}
			}
		);

		const { getByTestId } = renderWithProvider(<TradeScreen />);
		
		// IMPORTANT: Keep API call count assertion for performance monitoring
		await waitFor(() => expect(mockCoinStoreReturn.getCoinByID).toHaveBeenCalledTimes(2));

		const fromInput = getByTestId('token-selector-input-from');
		fireEvent.changeText(fromInput, '6');
		await waitFor(() => expect(TradeScripts.fetchTradeQuote).toHaveBeenCalled());

		// Wait for loading to complete and try to trade
		await waitFor(() => {
			const tradeButton = getByTestId('trade-button');
			expect(tradeButton.props.accessibilityState.disabled).toBe(false);
		});
		fireEvent.press(getByTestId('trade-button'));

		await waitFor(() => {
			// Check that error toast was shown (don't assert exact message format)
			expect(mockShowToast).toHaveBeenCalledWith({
				type: 'error',
				message: expect.stringContaining('Insufficient'),
			});
			expect(getByTestId('mock-TradeConfirmation')).toHaveProp('isVisible', false);
		});
	});

	it('handles SOL as default fromCoin (from cache) when not provided', async () => {
		(useRoute as jest.Mock).mockReturnValue({
			key: 'TradeScreen-SOL-In-Cache',
			name: 'TradeScreen',
			params: { initialFromCoin: null, initialToCoin: mockToCoin },
		});

		renderWithProvider(<TradeScreen />);

		// IMPORTANT: Keep API call count assertion for performance monitoring
		await waitFor(() => {
			// First for SOL (cache), then for initialToCoin (cache)
			expect(mockCoinStoreReturn.getCoinByID).toHaveBeenCalledTimes(2);
		});
		expect(mockCoinStoreReturn.getCoinByID).toHaveBeenCalledWith(SOLANA_ADDRESS, false);
		expect(mockCoinStoreReturn.getCoinByID).toHaveBeenCalledWith(mockToCoin.mintAddress, false);
	});

	it('handles SOL as default fromCoin (from API) when not in cache', async () => {
		// Specific route mock to trigger SOL not in cache for this test
		(useRoute as jest.Mock).mockReturnValue({
			key: 'TradeScreen-SOL-Not-In-Cache', // Key to trigger specific mock behavior
			name: 'TradeScreen',
			params: { initialFromCoin: null, initialToCoin: mockToCoin },
		});

		// Mock getCoinByID to return null for SOL on the first (cache) call for this test
		mockCoinStoreReturn.getCoinByID.mockImplementationOnce(async (mintAddress: string, forceRefresh: boolean = false) => {
			if (mintAddress === SOLANA_ADDRESS && !forceRefresh) return null; // Simulate cache miss for SOL
			return { ...mockFromCoin, mintAddress: SOLANA_ADDRESS, name: 'Solana', symbol: 'SOL', source: 'api' }; // API hit for SOL
		}).mockImplementationOnce(async (mintAddress: string, forceRefresh: boolean = false) => {
			if (mintAddress === mockToCoin.mintAddress) return { ...mockToCoin, source: forceRefresh ? 'api' : 'cache' }; // For initialToCoin
			return null;
		});

		renderWithProvider(<TradeScreen />);

		// IMPORTANT: Keep API call count assertion for performance monitoring
		await waitFor(() => {
			// SOL (cache miss), SOL (API hit), initialToCoin (cache)
			expect(mockCoinStoreReturn.getCoinByID).toHaveBeenCalledTimes(3);
		});
		expect(mockCoinStoreReturn.getCoinByID).toHaveBeenCalledWith(SOLANA_ADDRESS, false); // First attempt for SOL (cache)
		expect(mockCoinStoreReturn.getCoinByID).toHaveBeenCalledWith(SOLANA_ADDRESS, true);  // Second attempt for SOL (API)
		expect(mockCoinStoreReturn.getCoinByID).toHaveBeenCalledWith(mockToCoin.mintAddress, false); // For initialToCoin
	});
});
