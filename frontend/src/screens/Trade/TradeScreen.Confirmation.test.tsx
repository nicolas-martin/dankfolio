import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { mocked } from 'jest-mock';
import TradeScreen from './index'; // The component under test
import { usePortfolioStore, PortfolioToken } from '@store/portfolio';
import { useCoinStore } from '@store/coins';
import * as TradeScripts from './trade_scripts';
import { Coin, Wallet } from '@/types';
import { View, Text, TextInput, Pressable } from 'react-native';

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

// --- Mock Component Creator (Copied, needed for CoinSelector) ---
const createMockComponent = (name: string) => (props: any) => {
	if (name === 'CoinSelector') {
		const { label, amount } = props;
		const inputTestID = `coin-selector-input-${label?.toLowerCase() || 'unknown'}`;
		return (
			<View testID={`mock-${name}`} {...props}>
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
jest.mock('@components/Trade/CoinSelector', () => createMockComponent('CoinSelector'));
jest.mock('@components/Trade/TradeDetails', () => createMockComponent('TradeDetails'));
// *** DO NOT MOCK @components/Trade/TradeConfirmation here ***
jest.mock('./trade_scripts', () => {
	const originalModule = jest.requireActual('./trade_scripts');
	return {
		...originalModule,
		fetchTradeQuote: jest.fn(),
		handleTrade: jest.fn(),
	};
});
jest.mock('@/services/api', () => ({
	getTokenPrices: jest.fn().mockResolvedValue({}),
	getTradeQuote: jest.fn().mockResolvedValue({ estimatedAmount: '0', fee: '0', priceImpact: '0', exchangeRate: '0', routePlan: [] }),
	executeTrade: jest.fn().mockResolvedValue({ transaction_hash: 'mock_tx_hash' }),
}));
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

	let consoleLogSpy: jest.SpyInstance; // Declare the spy variable

	beforeEach(() => {
		jest.clearAllMocks();
		// Silence console.log before each test
		consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
		mockNavigate.mockClear();
		mockPortfolioStoreReturn.tokens = [mockFromPortfolioToken];
		Object.values(mockPortfolioStoreReturn).forEach(mockFn => jest.isMockFunction(mockFn) && mockFn.mockClear());
		Object.values(mockCoinStoreReturn).forEach(mockFn => jest.isMockFunction(mockFn) && mockFn.mockClear());
		mockCoinStoreReturn.getCoinByID.mockImplementation(async (id, forceRefresh) => {
			if (id === mockFromCoin.id) return mockFromCoin;
			if (id === mockToCoin.id) return mockToCoin;
			return null;
		});
		mocked(usePortfolioStore).mockReturnValue(mockPortfolioStoreReturn);
		mocked(useCoinStore).mockReturnValue(mockCoinStoreReturn);
		mockRoute.params.initialFromCoin = mockFromCoin;
		mockRoute.params.initialToCoin = mockToCoin;
	});

	// Add afterEach to restore the original console.log
	afterEach(() => {
		consoleLogSpy.mockRestore();
	});

	// The test moved from the original file
	it('refreshes coin prices via getCoinByID when confirmation modal appears', async () => {
		// Mock quote fetch minimally for setup
		(TradeScripts.fetchTradeQuote as jest.Mock).mockImplementation(
			async (amount, fromC, toC, setIsQuoteLoading, setToAmount, setTradeDetails) => {
				act(() => { setToAmount('1'); }); // Just need some value
			}
		);

		const { getByTestId, getByText } = render(<TradeScreen />); // Remove findByTestId if not used

		// 1. Wait for initial price refresh (2 calls)
		await waitFor(() => expect(mockCoinStoreReturn.getCoinByID).toHaveBeenCalledTimes(2));

		// 2. Populate amount to enable button
		const fromInput = getByTestId('coin-selector-input-from');
		fireEvent.changeText(fromInput, '1');
		// Assert fetchTradeQuote was called with the correct amount and coins
		await waitFor(() => {
			expect(TradeScripts.fetchTradeQuote).toHaveBeenCalledTimes(1);
			expect(TradeScripts.fetchTradeQuote).toHaveBeenCalledWith(
				'1',                  // Check the amount
				mockFromCoin,
				mockToCoin,
				expect.any(Function), // setIsQuoteLoading
				expect.any(Function), // setToAmount
				expect.any(Function)  // setTradeDetails
			);
		});

		// 3. Clear getCoinByID mock *after* initial mount calls
		mockCoinStoreReturn.getCoinByID.mockClear();

		// 4. Press Trade button
		const tradeButton = getByText('Trade');
		fireEvent.press(tradeButton);

		// 5. Wait for the modal's useEffect to call getCoinByID twice more
		//    Now using the *real* component, this effect should run.
		await waitFor(() => expect(mockCoinStoreReturn.getCoinByID).toHaveBeenCalledTimes(2), { timeout: 2000 }); // Increase timeout slightly if needed

		// 6. Verify the calls were for the correct coins with forceRefresh
		expect(mockCoinStoreReturn.getCoinByID).toHaveBeenCalledWith(mockFromCoin.id, true);
		expect(mockCoinStoreReturn.getCoinByID).toHaveBeenCalledWith(mockToCoin.id, true);
	});

	it('calls handleTrade, shows toast, and navigates on confirm', async () => {
		// Mock handleTrade implementation to simulate success
		(TradeScripts.handleTrade as jest.Mock).mockImplementation(
			async (fromCoin, toCoin, amount, slippage, wallet, navigation, setIsLoading, showToast) => {
				// Simulate async work and success
				act(() => {
					setIsLoading(true);
				});
				await new Promise(resolve => setTimeout(resolve, 10)); // Simulate delay
				act(() => {
					showToast({ type: 'success', message: 'Trade executed successfully!', txHash: 'mock_tx_hash_from_test' });
					navigation.navigate('Home');
					setIsLoading(false);
				});
			}
		);

		// Mock quote fetch minimally for setup
		(TradeScripts.fetchTradeQuote as jest.Mock).mockImplementation(
			async (amount, fromC, toC, setIsQuoteLoading, setToAmount, setTradeDetails) => {
				act(() => { setToAmount('1'); setTradeDetails({ exchangeRate: '1', fromAmount: '1', toAmount: '1', fromCoin: fromC, toCoin: toC }); });
			}
		);

		const { getByTestId, getByText } = render(<TradeScreen />);

		// 1. Wait for initial price refresh
		await waitFor(() => expect(mockCoinStoreReturn.getCoinByID).toHaveBeenCalledTimes(2));

		// 2. Populate amount
		const fromInput = getByTestId('coin-selector-input-from');
		fireEvent.changeText(fromInput, '1');
		await waitFor(() => expect(TradeScripts.fetchTradeQuote).toHaveBeenCalledTimes(1));

		// 3. Press Trade button to open modal
		const tradeButton = getByText('Trade');
		fireEvent.press(tradeButton);

		// 4. Wait for modal to appear (check for content unique to the modal)
		//    We can also wait for the price refresh calls triggered by the modal
		await waitFor(() => expect(mockCoinStoreReturn.getCoinByID).toHaveBeenCalledTimes(4)); // 2 initial + 2 modal

		// 5. Find and press the Confirm button inside the modal using testID
		const confirmButton = getByTestId('confirm-trade-button');
		fireEvent.press(confirmButton);

		// 6. Wait specifically for handleTrade to be called, then assert arguments
		await waitFor(() => expect(TradeScripts.handleTrade).toHaveBeenCalledTimes(1), { timeout: 3000 });

		// Now assert the arguments, toast, and navigation *after* we know handleTrade was called
		expect(TradeScripts.handleTrade).toHaveBeenCalledWith(
			mockFromCoin,         // fromCoin
			mockToCoin,           // toCoin
			'1',                  // fromAmount
			0.5,                  // slippage (hardcoded in TradeScreen)
			mockWallet,           // wallet
			expect.objectContaining({ navigate: mockNavigate }), // navigation object
			expect.any(Function), // setIsLoading
			mockShowToast         // showToast function (mocked)
		);

		// Check if toast was shown - needs waitFor as well due to setTimeout in handleTrade
		await waitFor(() => {
			expect(mockShowToast).toHaveBeenCalledTimes(1);
			expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'success', message: expect.stringContaining('Trade executed successfully') }));
		});

		// Check navigation - needs waitFor as well due to setTimeout in handleTrade
		await waitFor(() => {
			expect(mockNavigate).toHaveBeenCalledTimes(1);
			expect(mockNavigate).toHaveBeenCalledWith('Home');
		});
	});

	it('closes modal and does nothing when Cancel is pressed', async () => {
		// Mock quote fetch minimally for setup
		(TradeScripts.fetchTradeQuote as jest.Mock).mockImplementation(
			async (amount, fromC, toC, setIsQuoteLoading, setToAmount, setTradeDetails) => {
				act(() => { setToAmount('1'); setTradeDetails({ exchangeRate: '1', fromAmount: '1', toAmount: '1', fromCoin: fromC, toCoin: toC }); });
			}
		);

		const { getByTestId, getByText, queryByTestId } = render(<TradeScreen />); // Added queryByTestId

		// 1. Wait for initial price refresh
		await waitFor(() => expect(mockCoinStoreReturn.getCoinByID).toHaveBeenCalledTimes(2));

		// 2. Populate amount
		const fromInput = getByTestId('coin-selector-input-from');
		fireEvent.changeText(fromInput, '1');
		await waitFor(() => expect(TradeScripts.fetchTradeQuote).toHaveBeenCalledTimes(1));

		// 3. Press Trade button to open modal
		const tradeButton = getByText('Trade');
		fireEvent.press(tradeButton);

		// 4. Wait for modal to appear (find confirm button)
		await waitFor(() => expect(getByTestId('confirm-trade-button')).toBeTruthy());

		// 5. Find and press the Cancel button inside the modal using testID
		const cancelButton = getByTestId('cancel-trade-button');
		fireEvent.press(cancelButton);

		// 6. Verify modal is closed (confirm button should be gone)
		await waitFor(() => {
			expect(queryByTestId('confirm-trade-button')).toBeNull();
		});

		// 7. Verify no trade actions occurred
		expect(TradeScripts.handleTrade).not.toHaveBeenCalled();
		expect(mockShowToast).not.toHaveBeenCalled();
		expect(mockNavigate).not.toHaveBeenCalled();
	});

}); 
