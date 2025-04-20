import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { mocked } from 'jest-mock';
import TradeScreen from './index'; // The component under test
import { usePortfolioStore, PortfolioToken } from '@store/portfolio';
import { useCoinStore } from '@store/coins';
import * as TradeScripts from './trade_scripts';
import { Coin, Wallet } from '@/types';
import { View, Text, TextInput } from 'react-native';

// --- Mock Data (Copied from original file) ---
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
		[mockFromCoin.id]: mockFromCoin,
		[mockToCoin.id]: mockToCoin,
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
		mockCoinStoreReturn.getCoinByID.mockImplementation(async (id, forceRefresh) => {
			if (id === mockFromCoin.id) return { ...mockFromCoin, price: 150.0 };
			if (id === mockToCoin.id) return { ...mockToCoin, price: 0.00011 };
			return null;
		});
		mocked(usePortfolioStore).mockReturnValue(mockPortfolioStoreReturn);
		mocked(useCoinStore).mockReturnValue(mockCoinStoreReturn);
		mockRoute.params.initialFromCoin = mockFromCoin;
		mockRoute.params.initialToCoin = mockToCoin;
	});

	afterEach(() => {
		consoleLogSpy.mockRestore();
		jest.runOnlyPendingTimers();
		jest.clearAllTimers();
	});

	it('handles trade confirmation flow correctly', async () => {
		const mockFromAmount = '1';
		const mockToAmount = '13636.36';
		const mockFees = { priceImpactPct: '1.5', totalFee: '0.50' };

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
			async (wallet, fromCoin, toCoin, amount, slippage, showToast, ...setters) => {
				const [setIsLoadingTrade, setIsConfirmationVisible, , setSubmittedTxHash, , , , setIsStatusModalVisible] = setters;
				await act(async () => {
					setIsLoadingTrade(false);
					setIsConfirmationVisible(false);
					setIsStatusModalVisible(false);
					showToast({ type: 'success', message: 'Trade successful!' });
					mockNavigate('Portfolio');
					setSubmittedTxHash('mock_tx_hash_confirm');
				});
			}
		);

		const { getByTestId, getByText, findByText, queryByText, queryByTestId } = render(<TradeScreen />);

		// 1. Initial setup and price refresh
		await act(async () => {
			await waitFor(() => expect(mockCoinStoreReturn.getCoinByID).toHaveBeenCalledTimes(2));
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
			fireEvent.press(getByText('Trade'));
			jest.runOnlyPendingTimers();
		});
		await waitFor(() => expect(mockCoinStoreReturn.getCoinByID).toHaveBeenCalledTimes(2));
		await waitFor(() => expect(queryByTestId('loading-spinner')).toBeNull());

		// 4. Verify modal content
		expect(await findByText(`${mockFromAmount} ${mockFromCoin.symbol}`)).toBeTruthy();
		expect(await findByText('$150.0000')).toBeTruthy();
		expect(await findByText(`${mockToAmount} ${mockToCoin.symbol}`)).toBeTruthy();
		expect(await findByText('$1.5000')).toBeTruthy();
		expect(await findByText(`${parseFloat(mockFees.priceImpactPct).toFixed(4)}%`)).toBeTruthy();
		expect(await findByText(`$${mockFees.totalFee}`)).toBeTruthy();
		expect(queryByText(/Warning: High price impact/)).toBeNull();

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
			fireEvent.press(getByText('Trade'));
			jest.runOnlyPendingTimers();
		});
		await waitFor(() => expect(mockCoinStoreReturn.getCoinByID).toHaveBeenCalledTimes(4));
		await waitFor(() => expect(queryByTestId('loading-spinner')).toBeNull());

		await act(async () => {
			const confirmButton = getByTestId('confirm-trade-button');
			fireEvent.press(confirmButton);
			jest.runOnlyPendingTimers();
		});

		await waitFor(() => expect(TradeScripts.executeTrade).toHaveBeenCalledTimes(1));
		expect(TradeScripts.executeTrade).toHaveBeenCalledWith(
			mockWallet,
			mockFromCoin,
			mockToCoin,
			mockFromAmount,
			0.5,
			mockShowToast,
			expect.any(Function),
			expect.any(Function),
			expect.any(Function),
			expect.any(Function),
			expect.any(Function),
			expect.any(Function),
			expect.any(Function),
			expect.any(Function)
		);

		await waitFor(() => {
			expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({
				type: 'success',
				message: expect.stringContaining('Trade successful')
			}));
			expect(mockNavigate).toHaveBeenCalledWith('Portfolio');
		});
	});

	it('shows high price impact warning when impact exceeds threshold', async () => {
		const mockFromAmount = '1';
		const mockToAmount = '13636.36';
		const mockFees = { priceImpactPct: '3.5', totalFee: '0.50' }; // High impact > 2%

		(TradeScripts.fetchTradeQuote as jest.Mock).mockImplementation(
			async (amount, fromC, toC, setIsQuoteLoading, setToAmount, setTradeDetails) => {
				await act(async () => {
					setToAmount(mockToAmount);
					setTradeDetails(mockFees);
					setIsQuoteLoading(false);
				});
			}
		);

		const { getByTestId, getByText, findByText } = render(<TradeScreen />);

		await act(async () => {
			await waitFor(() => expect(mockCoinStoreReturn.getCoinByID).toHaveBeenCalledTimes(2));
			jest.runOnlyPendingTimers();
		});
		mockCoinStoreReturn.getCoinByID.mockClear();

		await act(async () => {
			const fromInput = getByTestId('token-selector-input-from');
			fireEvent.changeText(fromInput, mockFromAmount);
			jest.runOnlyPendingTimers();
		});
		await waitFor(() => expect(TradeScripts.fetchTradeQuote).toHaveBeenCalledTimes(1));

		await act(async () => {
			fireEvent.press(getByText('Trade'));
			jest.runOnlyPendingTimers();
		});
		await waitFor(() => expect(mockCoinStoreReturn.getCoinByID).toHaveBeenCalledTimes(2));

		expect(await findByText(/Warning: High price impact/)).toBeTruthy();
	});
}); 
