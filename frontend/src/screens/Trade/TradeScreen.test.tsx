import { ReactElement } from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { mocked } from 'jest-mock';
import TradeScreen from './index';
import * as TradeScripts from './trade_scripts';
import { View, Text, TextInput } from 'react-native';
import { SOLANA_ADDRESS } from '@/utils/constants';
import { Provider as PaperProvider } from 'react-native-paper';
import { mockFromCoin, mockToCoin, mockWallet, mockFromPortfolioToken } from '@/__mocks__/testData';
import { mockPortfolioStoreReturn, usePortfolioStore } from '@/__mocks__/store/portfolio';
import { mockCoinStoreReturn, useCoinStore } from '@/__mocks__/store/coins';
import { fetchTradeQuote as mockFetchTradeQuote, signTradeTransaction as mockSignTradeTransaction } from '@/__mocks__/services/trade_scripts';
import { useRoute } from '@react-navigation/native';
import type { PortfolioToken } from '@/store/portfolio';
import grpcApi from '@/services/grpcApi';

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
jest.mock('./trade_scripts', () => ({
	fetchTradeQuote: jest.fn(),
	signTradeTransaction: jest.fn(),
	handleSwapCoins: jest.fn(),
	executeTrade: jest.fn(),
	startPolling: jest.fn(),
	pollTradeStatus: jest.fn(),
	stopPolling: jest.fn(),
	DEFAULT_AMOUNT: "0.0001",
	QUOTE_DEBOUNCE_MS: 500,
}));

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
		(grpcApi.submitSwap as jest.Mock).mockResolvedValue({ transaction_hash: 'mock_tx_hash' });
		(grpcApi.getSwapStatus as jest.Mock).mockResolvedValue({
			status: 'completed',
			transaction_hash: 'mock_tx_hash',
			timestamp: new Date().toISOString(),
			from_amount: '1.5',
			to_amount: '100.5'
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

		mockCoinStoreReturn.getCoinByID.mockImplementation(async (id, forceRefresh) => {
			if (id === mockFromCoin.id) return mockFromCoin;
			if (id === mockToCoin.id) return mockToCoin;
			if (id === SOLANA_ADDRESS) return { ...mockFromCoin, id: SOLANA_ADDRESS, name: 'Solana', symbol: 'SOL' };
			return null;
		});

		(useRoute as jest.Mock).mockReturnValue({
			key: 'TradeScreen-Default',
			name: 'TradeScreen',
			params: {
				initialFromCoin: mockFromCoin,
				initialToCoin: mockToCoin,
			},
		});
	});

	it('initializes correctly with store hooks and initial coin fetch', async () => {
		renderWithProvider(<TradeScreen />);

		await waitFor(() => {
			expect(mockCoinStoreReturn.getCoinByID).toHaveBeenCalledTimes(2);
			expect(require('@store/portfolio').usePortfolioStore).toHaveBeenCalledTimes(1);
			expect(require('@store/coins').useCoinStore).toHaveBeenCalledTimes(1);
		});

		// Verify correct coin fetching
		expect(mockCoinStoreReturn.getCoinByID).toHaveBeenCalledWith(mockFromCoin.id, true);
		expect(mockCoinStoreReturn.getCoinByID).toHaveBeenCalledWith(mockToCoin.id, true);

		// Verify store actions that should NOT be called on mount
		expect(mockPortfolioStoreReturn.fetchPortfolioBalance).not.toHaveBeenCalled();
		expect(mockCoinStoreReturn.fetchAvailableCoins).not.toHaveBeenCalled();
	});

	it('handles quote fetching and UI updates on amount change', async () => {
		const mockQuoteData = {
			estimatedAmount: '12345.67',
			exchangeRate: '82304.46',
			priceImpactPct: '0.01',
			totalFee: '0.000005',
			route: 'SOL -> WEN'
		};

		(TradeScripts.fetchTradeQuote as jest.Mock).mockImplementation(
			async (amount, fromC, toC, setIsQuoteLoading, setToAmount, setTradeDetails) => {
				act(() => {
					setToAmount(mockQuoteData.estimatedAmount);
					setTradeDetails({
						exchangeRate: mockQuoteData.exchangeRate,
						gasFee: mockQuoteData.totalFee,
						priceImpactPct: mockQuoteData.priceImpactPct,
						totalFee: mockQuoteData.totalFee,
						route: mockQuoteData.route,
					});
				});
			}
		);

		const { getByTestId } = renderWithProvider(<TradeScreen />);
		await waitFor(() => expect(mockCoinStoreReturn.getCoinByID).toHaveBeenCalledTimes(2));

		const fromInput = getByTestId('token-selector-input-from');
		const testAmount = '1.5';
		fireEvent.changeText(fromInput, testAmount);

		await waitFor(() => {
			expect(TradeScripts.fetchTradeQuote).toHaveBeenCalledWith(
				testAmount,
				mockFromCoin,
				mockToCoin,
				expect.any(Function),
				expect.any(Function),
				expect.any(Function)
			);
			expect(getByTestId('token-selector-input-to').props.value).toBe(mockQuoteData.estimatedAmount);
		});
	});

	it('handles coin swapping correctly', async () => {
		const initialFromAmount = '1';
		const initialToAmount = '1350000';

		(TradeScripts.fetchTradeQuote as jest.Mock).mockImplementation(
			async (amount, fromC, toC, setIsQuoteLoading, setToAmount, setTradeDetails) => {
				act(() => {
					setToAmount(fromC.id === mockFromCoin.id ? initialToAmount : initialFromAmount);
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

		const { getByTestId, getByText } = renderWithProvider(<TradeScreen />);
		await waitFor(() => expect(mockCoinStoreReturn.getCoinByID).toHaveBeenCalledTimes(2));

		const fromInput = getByTestId('token-selector-input-from');
		fireEvent.changeText(fromInput, initialFromAmount);

		await waitFor(() => expect(getByTestId('token-selector-input-to').props.value).toBe(initialToAmount));

		fireEvent.press(getByText('Swap'));

		await waitFor(() => {
			expect(fromInput.props.value).toBe(initialToAmount);
			expect(getByTestId('token-selector-input-to').props.value).toBe(initialFromAmount);
		});
	});

	it('executes complete trade flow with confirmation', async () => {
		const initialFromAmount = '1';
		const initialToAmount = '1350000';

		(TradeScripts.fetchTradeQuote as jest.Mock).mockImplementation(
			async (amount, fromC, toC, setIsQuoteLoading, setToAmount, setTradeDetails) => {
				act(() => {
					setToAmount(initialToAmount);
					setTradeDetails({ exchangeRate: '1350000', gasFee: '0', priceImpactPct: '0', totalFee: '0' });
				});
			}
		);

		const { getByTestId, getByText } = renderWithProvider(<TradeScreen />);
		await waitFor(() => expect(mockCoinStoreReturn.getCoinByID).toHaveBeenCalledTimes(2));

		// Set amount and trigger quote
		const fromInput = getByTestId('token-selector-input-from');
		fireEvent.changeText(fromInput, initialFromAmount);
		await waitFor(() => expect(TradeScripts.fetchTradeQuote).toHaveBeenCalledTimes(1));

		// Open confirmation modal
		fireEvent.press(getByText('Trade'));
		const confirmationModal = await waitFor(() => getByTestId('mock-TradeConfirmation'));
		expect(confirmationModal.props.isVisible).toBe(true);

		// Confirm trade
		await act(async () => {
			await confirmationModal.props.onConfirm();
		});

		// Verify trade execution
		await waitFor(() => {
			expect(TradeScripts.executeTrade).toHaveBeenCalledWith(
				mockWallet,
				mockFromCoin,
				mockToCoin,
				initialFromAmount,
				0.5,
				expect.any(Function),
				expect.any(Function),
				expect.any(Function),
				expect.any(Function),
				expect.any(Function),
				expect.any(Function),
				expect.any(Function),
				expect.any(Function),
				expect.any(Function)
			);
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
					setToAmount((numericAmount * 1000).toString());
				}
			}
		);

		const { getByTestId, getByText } = renderWithProvider(<TradeScreen />);
		await waitFor(() => expect(mockCoinStoreReturn.getCoinByID).toHaveBeenCalledTimes(2));

		const fromInput = getByTestId('token-selector-input-from');
		fireEvent.changeText(fromInput, '6');
		await waitFor(() => expect(TradeScripts.fetchTradeQuote).toHaveBeenCalled());

		fireEvent.press(getByText('Trade'));

		await waitFor(() => {
			expect(mockShowToast).toHaveBeenCalledWith({
				type: 'error',
				message: expect.stringContaining(`Insufficient ${mockFromCoin.symbol}. You only have 5.000000 ${mockFromCoin.symbol}`),
			});
			expect(getByTestId('mock-TradeConfirmation')).toHaveProp('isVisible', false);
		});
	});

	it('handles SOL as default fromCoin when not provided', async () => {
		(useRoute as jest.Mock).mockReturnValue({
			key: 'TradeScreen-NullFrom',
			name: 'TradeScreen',
			params: {
				initialFromCoin: null,
				initialToCoin: mockToCoin,
			},
		});

		renderWithProvider(<TradeScreen />);

		await waitFor(() => {
			expect(mockCoinStoreReturn.getCoinByID).toHaveBeenNthCalledWith(1, SOLANA_ADDRESS, true);
			expect(mockCoinStoreReturn.getCoinByID).toHaveBeenNthCalledWith(2, mockToCoin.id, true);
			expect(mockCoinStoreReturn.getCoinByID).toHaveBeenCalledTimes(2);
		});
	});
}); 
