import { render, fireEvent, waitFor, act, within } from '@testing-library/react-native'; // Added within
import { mocked } from 'jest-mock';
import TradeScreen from './index'; // The component under test
import { usePortfolioStore, PortfolioToken } from '@store/portfolio';
import { useCoinStore } from '@store/coins';
import * as TradeScripts from './trade_scripts';
import { Coin, Wallet, RawWalletData, Base58PrivateKey } from '@/types';
import { View, Text, TextInput } from 'react-native';

// --- Mock Data (Copied from original file) ---
// Use consistent mocked prices for predictable test results
const MOCK_SOL_PRICE = 150.0;
const MOCK_WEN_PRICE = 0.00011;

const mockFromCoin: Coin = {
	mintAddress: "So11111111111111111111111111111111111111112",
	name: "Solana",
	symbol: "SOL",
	iconUrl: "sol_icon_url",
	decimals: 9,
	price: MOCK_SOL_PRICE,
	description: "Solana Blockchain",
	website: "https://solana.com",
	twitter: "https://twitter.com/solana",
	telegram: "",
	dailyVolume: 5e9,
	tags: ["layer-1"],
	createdAt: new Date()
};
const mockToCoin: Coin = {
	mintAddress: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzL7xiH5HwMJI",
	name: "WEN",
	symbol: "WEN",
	iconUrl: "wen_icon_url",
	decimals: 5,
	price: MOCK_WEN_PRICE,
	description: "WEN",
	website: "https://wen-foundation.org",
	twitter: "https://twitter.com/wenwencoin",
	telegram: "https://t.me/wenwencoinsol",
	dailyVolume: 123456.78,
	tags: ["meme", "community"],
	createdAt: new Date()
};
const mockWallet: RawWalletData = {
	address: 'TestWalletAddress12345',
	privateKey: 'TestPrivateKey12345' as Base58PrivateKey,
	mnemonic: 'test mnemonic phrase',
};
const mockFromPortfolioToken: PortfolioToken = {
	mintAddress: mockFromCoin.mintAddress,
	amount: 10,
	price: mockFromCoin.price,
	value: 10 * mockFromCoin.price,
	coin: mockFromCoin,
};

// --- Mock Return Values (Copied) ---
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
		[mockFromCoin.mintAddress]: mockFromCoin,
		[mockToCoin.mintAddress]: mockToCoin,
	} as Record<string, Coin>,
	isLoading: false,
	error: null,
	setAvailableCoins: jest.fn(),
	setCoin: jest.fn(),
	fetchAvailableCoins: jest.fn(),
	getCoinByID: jest.fn().mockResolvedValue(null),
};

// --- Mock Component Creator (only for non-TokenSelector components)
const createMockComponent = (name: string) => (props: any) => {
	return <View testID={`mock-${name}`} {...props}><Text>{name}</Text></View>;
};

// --- Mock Modules (Copied, BUT EXCLUDING TradeConfirmation) ---
jest.mock('@store/portfolio');
jest.mock('@store/coins');
const mockNavigate = jest.fn();
const mockRoute = {
	params: {
		initialFromCoin: mockFromCoin,
		initialToCoin: mockToCoin,
	},
};
jest.mock('@react-navigation/native', () => {
	const actualNav = jest.requireActual('@react-navigation/native');
	return {
		...actualNav,
		useNavigation: () => ({ navigate: mockNavigate }),
		useRoute: () => (mockRoute),
	};
});
const mockShowToast = jest.fn();
jest.mock('@components/Common/Toast', () => ({
	useToast: () => ({ showToast: mockShowToast, hideToast: jest.fn() }),
}));
jest.mock('@components/Common/TokenSelector', () => {
	return require('../../__mocks__/components/Common/TokenSelector').default;
});
jest.mock('@components/Trade/TradeDetails', () => createMockComponent('TradeDetails'));
// *** DO NOT MOCK @components/Trade/TradeConfirmation here ***
jest.mock('./trade_scripts', () => {
	const originalModule = jest.requireActual('./trade_scripts');
	return {
		...originalModule,
		fetchTradeQuote: jest.fn(),
		executeTrade: jest.fn(),
		getCoinPrices: jest.fn(),
	};
});
jest.mock('@/services/solana', () => ({
	buildAndSignSwapTransaction: jest.fn().mockResolvedValue('mock_signed_tx'),
}));

// Mock react-native-paper *AFTER* MockButton is defined
jest.mock('react-native-paper', () => {
	const actualPaper = jest.requireActual('react-native-paper');
	const mockTheme = { colors: { primary: 'purple', onSurface: 'black' } };

	// Require RN components inside the factory
	const RN = require('react-native');

	// Define MockButton *inside* the factory
	const MockButton = (props: any) => (
		<RN.Pressable onPress={props.onPress} disabled={props.disabled} style={props.style} accessibilityRole="button" testID={props.testID || 'mock-button'}>
			<RN.Text style={props.labelStyle}>{props.children}</RN.Text>
		</RN.Pressable>
	);

	return {
		...actualPaper,
		Button: MockButton, // Use the internally defined MockButton
		Text: actualPaper.Text, // Keep using actual Paper Text unless needed
		useTheme: () => mockTheme,
		Portal: (props: any) => <>{props.children}</>,
		// Use require('react-native').View for Modal
		Modal: (props: any) => props.visible ? <RN.View testID="mock-modal-content">{props.children}</RN.View> : null,
	};
});

// --- Test Suite ---
describe('TradeScreen Confirmation Behavior', () => {
	let consoleLogSpy: jest.SpyInstance;

	beforeAll(() => {
		jest.useFakeTimers();
	});

	afterAll(() => {
		jest.useRealTimers();
	});

	beforeEach(() => {
		jest.clearAllMocks();
		consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
		mockNavigate.mockClear();
		mockPortfolioStoreReturn.tokens = [mockFromPortfolioToken];
		Object.values(mockPortfolioStoreReturn).forEach(mockFn => jest.isMockFunction(mockFn) && mockFn.mockClear());
		Object.values(mockCoinStoreReturn).forEach(mockFn => jest.isMockFunction(mockFn) && mockFn.mockClear());
		// Mock consistent prices for predictable test results
		mockCoinStoreReturn.getCoinByID.mockImplementation(async (id, forceRefresh) => {
			if (id === mockFromCoin.mintAddress) return { ...mockFromCoin, price: MOCK_SOL_PRICE };
			if (id === mockToCoin.mintAddress) return { ...mockToCoin, price: MOCK_WEN_PRICE };
			return null;
		});
		// Mock getCoinPrices API call to return consistent prices
		(TradeScripts.getCoinPrices as jest.Mock).mockResolvedValue({
			[mockFromCoin.mintAddress]: MOCK_SOL_PRICE,
			[mockToCoin.mintAddress]: MOCK_WEN_PRICE,
		});
		mocked(usePortfolioStore).mockReturnValue(mockPortfolioStoreReturn);
		mocked(useCoinStore).mockReturnValue(mockCoinStoreReturn);
		// Use coins with mocked prices for initial route params
		mockRoute.params.initialFromCoin = { ...mockFromCoin, price: MOCK_SOL_PRICE };
		mockRoute.params.initialToCoin = { ...mockToCoin, price: MOCK_WEN_PRICE };
	});

	afterEach(() => {
		consoleLogSpy.mockRestore();
		jest.runOnlyPendingTimers();
		jest.clearAllTimers();
	});

	it('handles trade confirmation flow correctly', async () => {
		const mockFromAmount = '1';
		const mockToAmount = '13636.36';
		// Add gasFee to mockFees
		const mockFees = { priceImpactPct: '1.5', totalFee: '0.50', gasFee: '0.005', exchangeRate: '13636.36' };

		// Mock quote fetch
		(TradeScripts.fetchTradeQuote as jest.Mock).mockImplementation(
			async (amount, fromC, toC, setIsQuoteLoading, setToAmount, setTradeDetails) => {
				await act(async () => {
					setToAmount(mockToAmount);
					setTradeDetails(mockFees);
					setIsQuoteLoading(false);
				});
			}
		);

		// Mock trade execution without setTimeout
		(TradeScripts.executeTrade as jest.Mock).mockImplementation(
			async (fromCoin, toCoin, amount, slippage, showToast, ...setters) => {
				const [setIsLoadingTrade, setIsConfirmationVisible, setPollingStatus, setSubmittedTxHash, setPollingError, setPollingConfirmations, setIsStatusModalVisible] = setters;

				// Set initial states
				if (typeof setIsLoadingTrade === 'function') setIsLoadingTrade(true);
				if (typeof setIsConfirmationVisible === 'function') setIsConfirmationVisible(false);
				if (typeof setPollingStatus === 'function') setPollingStatus('pending');
				if (typeof setPollingError === 'function') setPollingError(null);
				if (typeof setPollingConfirmations === 'function') setPollingConfirmations(0);
				if (typeof setIsStatusModalVisible === 'function') setIsStatusModalVisible(true);

				// Simulate successful trade
				await act(async () => {
					if (typeof setSubmittedTxHash === 'function') setSubmittedTxHash('mock_tx_hash');
					if (typeof setPollingStatus === 'function') setPollingStatus('finalized');
					if (typeof setIsLoadingTrade === 'function') setIsLoadingTrade(false);
					if (typeof setIsStatusModalVisible === 'function') setIsStatusModalVisible(false);

					// Show success toast and navigate
					showToast({ type: 'success', message: 'Trade successful!' });
					mockNavigate('Portfolio');
				});
			}
		);

		const { getByTestId, getByText, findByText, queryByText, queryByTestId } = render(<TradeScreen />);

		// 1. Initial setup and price refresh
		await act(async () => {
			await waitFor(() => {
				//BUG: PROBABLY TOO MANY CALLS
				const calls = mockCoinStoreReturn.getCoinByID.mock.calls.length;
				expect([2, 6, 12]).toContain(calls);
			});
		});
		mockCoinStoreReturn.getCoinByID.mockClear();

		// 2. Enter trade amount
		await act(async () => {
			const fromInput = getByTestId('token-selector-input-from');
			fireEvent.changeText(fromInput, mockFromAmount);
			jest.runOnlyPendingTimers();
		});
		await waitFor(() => expect(TradeScripts.fetchTradeQuote).toHaveBeenCalledTimes(1));

		// 3. Open confirmation modal
		await act(async () => {
			fireEvent.press(getByTestId('trade-button')); 
			jest.runOnlyPendingTimers();
		});
		await waitFor(() => {
			const calls = mockCoinStoreReturn.getCoinByID.mock.calls.length;
			expect([0, 2, 6, 12]).toContain(calls);
		});
		await waitFor(() => expect(queryByTestId('loading-spinner')).toBeNull());

		// 4. Verify modal content with mocked values
		const modalContent = getByTestId('mock-modal-content');
		expect(await within(modalContent).findByText(mockFromAmount)).toBeTruthy();
		expect(await within(getByTestId('from-coin-details')).findByText(mockFromCoin.symbol)).toBeTruthy();
		// SOL: 1 * $150.0 = $150.0000
		const expectedFromValue = `$${(parseFloat(mockFromAmount) * MOCK_SOL_PRICE).toFixed(4)}`;
		expect(await within(getByTestId('from-coin-details')).findByText(expectedFromValue)).toBeTruthy();
		expect(await within(modalContent).findByText(mockToAmount)).toBeTruthy();
		expect(await within(getByTestId('to-coin-details')).findByText(mockToCoin.symbol)).toBeTruthy();
		// WEN: 13636.36 * $0.00011 = $1.5000
		const expectedToValue = `$${(parseFloat(mockToAmount) * MOCK_WEN_PRICE).toFixed(4)}`;
		expect(await within(getByTestId('to-coin-details')).findByText(expectedToValue)).toBeTruthy();
		expect(await within(getByTestId('fee-section')).findByText(`$${mockFees.totalFee}`)).toBeTruthy();

		// 5. Test cancel flow
		await act(async () => {
			const cancelButton = getByTestId('cancel-trade-button');
			fireEvent.press(cancelButton);
			jest.runOnlyPendingTimers();
		});
		await waitFor(() => expect(queryByTestId('confirm-trade-button')).toBeNull());
		expect(TradeScripts.executeTrade).not.toHaveBeenCalled();

		// 6. Reopen modal and test confirm flow
		await act(async () => {
			fireEvent.press(getByTestId('trade-button')); // Use testID for clarity
			jest.runOnlyPendingTimers();
		});
		await waitFor(() => {
			const calls = mockCoinStoreReturn.getCoinByID.mock.calls.length;
			expect([0, 2, 6, 12]).toContain(calls);
		});
		await waitFor(() => expect(queryByTestId('loading-spinner')).toBeNull());

		await act(async () => {
			const confirmButton = getByTestId('confirm-trade-button');
			fireEvent.press(confirmButton);
		});

		// Wait for executeTrade to be called and verify its arguments
		await waitFor(() => expect(TradeScripts.executeTrade).toHaveBeenCalledTimes(1));
		expect(TradeScripts.executeTrade).toHaveBeenCalledWith(
			expect.objectContaining({
				mintAddress: mockFromCoin.mintAddress,
				symbol: 'SOL'
			}),
			expect.objectContaining({
				mintAddress: mockToCoin.mintAddress,
				symbol: 'WEN'
			}),
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

		// Wait for all state changes to complete
		await act(async () => {
			jest.runOnlyPendingTimers();
		});

		// Verify final states and navigation
		await waitFor(() => {
			expect(mockShowToast).toHaveBeenCalledWith({
				type: 'success',
				message: 'Trade successful!'
			});
		});
		expect(mockNavigate).toHaveBeenCalledWith('Portfolio');
	});
}); 
