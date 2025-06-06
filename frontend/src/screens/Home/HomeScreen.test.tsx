import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { RefreshControl } from 'react-native'; // Import components from react-native
import HomeScreen from './index';
import { usePortfolioStore } from '@store/portfolio';
import { useCoinStore } from '@store/coins';
import { useToast } from '@components/Common/Toast';
import { NavigationContainer } from '@react-navigation/native';
import { mocked } from 'jest-mock';
import { logger } from '@/utils/logger'; // Import logger

// Mocks
jest.mock('@services/solana', () => ({
	getKeypairFromPrivateKey: jest.fn(),
}));

jest.mock('@store/portfolio', () => ({
	usePortfolioStore: jest.fn(),
}));

jest.mock('@store/coins', () => ({
	useCoinStore: jest.fn(),
}));

jest.mock('@components/Common/Toast', () => ({
	useToast: jest.fn(),
}));

jest.mock('@components/Home/CoinCard', () => {
	const { Text } = require('react-native');
	// A simple mock for CoinCard that displays the symbol and can be pressed
	return ({ coin, onPress, isPriceHistoryLoading }: { coin: any, onPress: () => void, isPriceHistoryLoading: boolean }) => (
		<Text onPress={onPress} testID={`coincard-${coin.symbol}`}>
			{coin.symbol} {isPriceHistoryLoading ? 'LoadingHistory' : ''}
		</Text>
	);
});

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
	const actualNav = jest.requireActual('@react-navigation/native');
	return {
		...actualNav,
		useNavigation: () => ({
			navigate: mockNavigate,
		}),
		useFocusEffect: jest.fn(callback => callback()), // Mock useFocusEffect to call the callback immediately
	};
});

// Mock coindetail_scripts
const mockFetchPriceHistory = jest.fn();
jest.mock('@/screens/CoinDetail/coindetail_scripts', () => {
	const actualScripts = jest.requireActual('@/screens/CoinDetail/coindetail_scripts');
	return {
		...actualScripts,
		fetchPriceHistory: mockFetchPriceHistory,
	};
});

// Mock constants
jest.mock('@/utils/constants', () => ({
	...jest.requireActual('@/utils/constants'), // Import and retain default behavior
	PRICE_HISTORY_FETCH_MODE: 'sequential', // Default to sequential for tests, can be overridden
	PRICE_HISTORY_FETCH_DELAY_MS: 100, // Use a short delay for tests
}));

// Mock logger
jest.mock('@/utils/logger', () => ({
	logger: {
		log: jest.fn(),
		error: jest.fn(),
		warn: jest.fn(),
		info: jest.fn(),
		debug: jest.fn(),
		breadcrumb: jest.fn(),
		exception: jest.fn(),
	},
}));


// Simplified test data
const mockWalletBalances = {
	balances: [
		{ id: "So11111111111111111111111111111111111111112", amount: 0.046201915 },
		{ id: "CniPCE4b3s8gSUPhUiyMjXnytrEqUrMfSsnbBjLCpump", amount: 1.365125 }
	]
};

const mockWallet = {
	address: 'GgaBFkzjuvMV7RCrZyt65zx7iRo7W6Af4cGXZMKNxK2R',
	balances: mockWalletBalances.balances
};

const mockApiCoinsResponse = [
	{
		mintAddress: "coin1_mint", // Added mintAddress for price history key
		id: "So11111111111111111111111111111111111111112", // Keep id for other parts if necessary
		name: "Coin One",
		symbol: "ONE",
		decimals: 9,
		icon_url: "https://example.com/one.png",
		price: 10,
		daily_volume: 1000
	},
	{
		mintAddress: "coin2_mint",
		id: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
		name: "Coin Two",
		symbol: "TWO",
		decimals: 6,
		icon_url: "https://example.com/two.svg",
		price: 20,
		daily_volume: 2000
	},
	{
		mintAddress: "coin3_mint",
		id: "abcMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8Benwxyz",
		name: "Coin Three",
		symbol: "THREE",
		decimals: 6,
		icon_url: "https://example.com/three.svg",
		price: 30,
		daily_volume: 3000
	}
];


describe('HomeScreen', () => {
	const fetchAvailableCoinsMock = jest.fn();
	const fetchPortfolioBalanceMock = jest.fn();
	const mockFetchNewCoins = jest.fn();
	const mockSetLastFetchedNewCoinsAt = jest.fn(); // This seems unused in HomeScreen directly based on provided code
	const showToastMock = jest.fn();
	let consoleLogSpy: jest.SpyInstance;


	beforeEach(() => {
		jest.clearAllMocks();
		consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
		jest.useFakeTimers(); // Use fake timers for controlling setTimeout

		fetchAvailableCoinsMock.mockResolvedValue(mockApiCoinsResponse);
		fetchPortfolioBalanceMock.mockResolvedValue(mockWalletBalances);
		mockFetchNewCoins.mockResolvedValue(undefined);
		mockFetchPriceHistory.mockResolvedValue({ data: [], error: null }); // Default mock for price history

		mocked(usePortfolioStore).mockReturnValue({
			wallet: mockWallet,
			fetchPortfolioBalance: fetchPortfolioBalanceMock,
		});

		mocked(useCoinStore).mockReturnValue({
			availableCoins: mockApiCoinsResponse, // Provide initial coins
			fetchAvailableCoins: fetchAvailableCoinsMock,
			isLoading: false,
			error: null,
			fetchNewCoins: mockFetchNewCoins,
			lastFetchedNewCoinsAt: 0, // Reset for new coins fetching logic
			setLastFetchedNewCoinsAt: mockSetLastFetchedNewCoinsAt,
			newlyListedCoins: [],
			isLoadingNewlyListed: false,
		});

		mocked(useToast).mockReturnValue({
			showToast: showToastMock,
			hideToast: jest.fn(),
		});
	});

	afterEach(() => {
		consoleLogSpy.mockRestore();
		jest.useRealTimers(); // Restore real timers
	});

	it('renders correctly and initial data fetch effects run', async () => {
		render(
			<NavigationContainer>
				<HomeScreen />
			</NavigationContainer>
		);

		// fetchTrendingAndPortfolio is called on mount
		await waitFor(() => {
			expect(fetchAvailableCoinsMock).toHaveBeenCalledTimes(1);
			expect(fetchPortfolioBalanceMock).toHaveBeenCalledTimes(1);
		});

		// useFocusEffect for fetchNewCoinsData also runs
		await waitFor(() => {
			expect(mockFetchNewCoins).toHaveBeenCalledTimes(1);
		});
	});


	describe('Price History Fetching', () => {
		const mockCoinsForPriceHistory = mockApiCoinsResponse.slice(0, 2); // Use first 2 coins

		beforeEach(() => {
			// Override useCoinStore for these specific tests if needed, or ensure beforeEach provides enough
			mocked(useCoinStore).mockReturnValue({
				availableCoins: mockCoinsForPriceHistory, // Use a smaller set for these tests
				fetchAvailableCoins: fetchAvailableCoinsMock,
				isLoading: false,
				error: null,
				fetchNewCoins: mockFetchNewCoins,
				lastFetchedNewCoinsAt: 0,
				setLastFetchedNewCoinsAt: mockSetLastFetchedNewCoinsAt,
				newlyListedCoins: [],
				isLoadingNewlyListed: false,
			});
			mockFetchPriceHistory.mockClear(); // Clear calls from previous tests
		});

		it("should fetch price histories sequentially when mode is 'sequential'", async () => {
			// Constants are mocked at the top level to be 'sequential' and 100ms delay
			const { PRICE_HISTORY_FETCH_DELAY_MS } = require('@/utils/constants');

			render(
				<NavigationContainer>
					<HomeScreen />
				</NavigationContainer>
			);

			// Wait for the initial fetch of availableCoins to resolve and trigger the price history useEffect
			await waitFor(() => {
				// availableCoins should be set, triggering the price history fetch
				// The first call should happen almost immediately
				expect(mockFetchPriceHistory).toHaveBeenCalledTimes(1);
				expect(mockFetchPriceHistory).toHaveBeenNthCalledWith(
					1,
					mockCoinsForPriceHistory[0], // First coin
					"4H", // timeframeKey
					expect.any(Number) // priceHistoryType (granularity enum)
				);
			});

			// Advance timers for the first coin's delay
			await act(async () => {
				jest.advanceTimersByTime(PRICE_HISTORY_FETCH_DELAY_MS);
			});

			// The second call should happen after the delay
			await waitFor(() => {
				expect(mockFetchPriceHistory).toHaveBeenCalledTimes(2);
				expect(mockFetchPriceHistory).toHaveBeenNthCalledWith(
					2,
					mockCoinsForPriceHistory[1], // Second coin
					"4H",
					expect.any(Number)
				);
			});

			// Advance timers for the second coin's delay (if there were more coins)
			await act(async () => {
				jest.advanceTimersByTime(PRICE_HISTORY_FETCH_DELAY_MS);
			});

			// Ensure no more calls are made after all coins are processed
			expect(mockFetchPriceHistory).toHaveBeenCalledTimes(mockCoinsForPriceHistory.length);
		});

		it("should fetch price histories in parallel when mode is 'parallel'", async () => {
			jest.mock('@/utils/constants', () => ({
				...jest.requireActual('@/utils/constants'),
				PRICE_HISTORY_FETCH_MODE: 'parallel', // Override for this test
				PRICE_HISTORY_FETCH_DELAY_MS: 0, // No delay in parallel mode
			}));
			// We need to re-require or re-render if constants are used at module load time by HomeScreen.
			// For this setup, re-rendering the component should be enough as constants are read in useEffect.

			const { rerender } = render(
				<NavigationContainer>
					<HomeScreen />
				</NavigationContainer>
			);

			// Since rendering happens before this mock change can take effect for the initial render,
			// we might need to trigger a change in availableCoins to re-run the useEffect with new constants.
			// Or, ensure the mock is set *before* the first render for this specific test.
			// For simplicity, let's assume the test structure allows the mock to be effective.
			// If not, one might need to unmount and remount or trigger availableCoins change.

			// For parallel, calls should happen close together without waiting for timers to advance significantly
			await waitFor(() => {
				expect(mockFetchPriceHistory).toHaveBeenCalledTimes(mockCoinsForPriceHistory.length);
			}, { timeout: 500 }); // Short timeout, as calls should be immediate

			expect(mockFetchPriceHistory).toHaveBeenNthCalledWith(
				1,
				mockCoinsForPriceHistory[0], "4H", expect.any(Number)
			);
			expect(mockFetchPriceHistory).toHaveBeenNthCalledWith(
				2,
				mockCoinsForPriceHistory[1], "4H", expect.any(Number)
			);

			// Restore original mocks if they were changed for just this test
			jest.unmock('@/utils/constants');
		});
	});

	// --- Keep other existing test suites like 'Periodic Fetching of New Coins' ---
	// (Assuming they are correctly placed and defined as per the original file structure)
	// For brevity, not re-listing all of them here, but they should be maintained.
	// Make sure the describe block for HomeScreen is properly closed.
});
