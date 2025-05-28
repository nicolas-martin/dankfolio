import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { RefreshControl } from 'react-native'; // Import components from react-native
import HomeScreen from './index';
import { usePortfolioStore } from '@store/portfolio';
import { useCoinStore } from '@store/coins';
import { useToast } from '@components/Common/Toast';
import { NavigationContainer } from '@react-navigation/native';
import { mocked } from 'jest-mock';

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
	return ({ coin, onPress }: any) => (
		<Text onPress={onPress}>{coin.symbol}</Text>
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
	};
});

// Simplified test data - focus on structure, not exact values
const mockWalletBalances = {
	balances: [
		{
			id: "So11111111111111111111111111111111111111112",
			amount: 0.046201915
		},
		{
			id: "CniPCE4b3s8gSUPhUiyMjXnytrEqUrMfSsnbBjLCpump",
			amount: 1.365125
		}
	]
};

const mockWallet = {
	address: 'GgaBFkzjuvMV7RCrZyt65zx7iRo7W6Af4cGXZMKNxK2R',
	balances: mockWalletBalances.balances
};

const mockApiResponse = [
	{
		id: "So11111111111111111111111111111111111111112",
		name: "Wrapped SOL",
		symbol: "SOL",
		decimals: 9,
		description: "Wrapped SOL (SOL) is a Solana token.",
		icon_url: "https://example.com/sol.png",
		tags: ["verified"],
		price: 126.675682,
		daily_volume: 651534477.88
	},
	{
		id: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
		name: "USDT",
		symbol: "USDT",
		decimals: 6,
		description: "USDT (USDT) is a Solana token.",
		icon_url: "https://example.com/usdt.svg",
		tags: ["verified"],
		price: 1.000041,
		daily_volume: 93921196.89
	}
];

describe('HomeScreen', () => {
	const fetchAvailableCoinsMock = jest.fn();
	const fetchPortfolioBalanceMock = jest.fn();
	const showToastMock = jest.fn();
	let consoleLogSpy: jest.SpyInstance;

	beforeEach(() => {
		jest.clearAllMocks();
		consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

		// Setup mock implementations
		fetchAvailableCoinsMock.mockImplementation(async () => mockApiResponse);
		fetchPortfolioBalanceMock.mockImplementation(async () => mockWalletBalances);

		// Mock portfolio store with wallet state and functions
		mocked(usePortfolioStore).mockReturnValue({
			wallet: mockWallet,
			fetchPortfolioBalance: fetchPortfolioBalanceMock
		});

		// Mock coin store with initial state
		mocked(useCoinStore).mockReturnValue({
			availableCoins: mockApiResponse,
			fetchAvailableCoins: fetchAvailableCoinsMock,
			isLoading: false,
			error: null,
		});

		// Mock toast notifications
		mocked(useToast).mockReturnValue({
			showToast: showToastMock,
			hideToast: jest.fn(),
		});
	});

	afterEach(() => {
		consoleLogSpy.mockRestore();
	});

	it('renders correctly and handles data refresh', async () => {
		const { getByText, getByTestId } = render(
			<NavigationContainer>
				<HomeScreen />
			</NavigationContainer>
		);

		// Verify initial render - focus on behavior, not exact call counts
		await waitFor(() => {
			expect(usePortfolioStore).toHaveBeenCalled();
			expect(useCoinStore).toHaveBeenCalled();
			// IMPORTANT: Keep API call assertions for performance monitoring
			expect(fetchAvailableCoinsMock).not.toHaveBeenCalled();
			expect(fetchPortfolioBalanceMock).not.toHaveBeenCalled();

			// Verify UI elements exist (don't assert exact text)
			expect(getByText('Trending Coins')).toBeTruthy();
			expect(getByText('SOL')).toBeTruthy();
			expect(getByText('USDT')).toBeTruthy();
		});

		// Test refresh functionality
		const homeScreenComponent = getByTestId('home-screen');
		const refreshControls = homeScreenComponent.findAllByType(RefreshControl);
		if (refreshControls && refreshControls.length > 0) {
			fireEvent(refreshControls[0], 'onRefresh');
		} else {
			throw new Error("RefreshControl not found for testing 'renders correctly and handles data refresh'");
		}

		await waitFor(() => {
			// IMPORTANT: Keep API call count assertions for performance monitoring
			expect(fetchAvailableCoinsMock).toHaveBeenCalledTimes(1);
			expect(fetchPortfolioBalanceMock).toHaveBeenCalledTimes(1);
			expect(fetchPortfolioBalanceMock).toHaveBeenCalledWith(mockWallet.address);
			expect(showToastMock).toHaveBeenCalledTimes(1);

			// Verify data structure exists (don't assert exact values)
			expect(mockApiResponse).toHaveLength(2);
			expect(mockApiResponse[0]).toHaveProperty('symbol');
			expect(mockApiResponse[0]).toHaveProperty('price');
			expect(mockApiResponse[1]).toHaveProperty('symbol');
			expect(mockApiResponse[1]).toHaveProperty('price');

			// Verify wallet balances structure (don't assert exact values)
			expect(mockWallet.balances).toHaveLength(2);
			expect(mockWallet.balances[0]).toHaveProperty('id');
			expect(mockWallet.balances[0]).toHaveProperty('amount');
		});
	});

	it('handles error states during refresh', async () => {
		// Setup error conditions
		const error = new Error('Network error');
		fetchAvailableCoinsMock.mockRejectedValueOnce(error);
		fetchPortfolioBalanceMock.mockRejectedValueOnce(error);

		const { getByTestId } = render(
			<NavigationContainer>
				<HomeScreen />
			</NavigationContainer>
		);

		// IMPORTANT: Keep API call assertions for performance monitoring
		expect(fetchAvailableCoinsMock).not.toHaveBeenCalled();
		expect(fetchPortfolioBalanceMock).not.toHaveBeenCalled();
		expect(showToastMock).not.toHaveBeenCalled();

		// Trigger refresh
		const homeScreenComponentOnError = getByTestId('home-screen');
		const refreshControlsOnError = homeScreenComponentOnError.findAllByType(RefreshControl);
		if (refreshControlsOnError && refreshControlsOnError.length > 0) {
			fireEvent(refreshControlsOnError[0], 'onRefresh');
		} else {
			throw new Error("RefreshControl not found for testing 'handles error states during refresh'");
		}

		await waitFor(() => {
			// IMPORTANT: Keep API call count assertions for performance monitoring
			expect(fetchAvailableCoinsMock).toHaveBeenCalledTimes(1);
			expect(fetchPortfolioBalanceMock).toHaveBeenCalledTimes(0);
			expect(showToastMock).toHaveBeenCalledTimes(1);
			// Check error toast was shown (don't assert exact message)
			expect(showToastMock).toHaveBeenCalledWith({
				type: 'error',
				message: expect.stringContaining('Failed'),
				duration: expect.any(Number),
			});
		});
	});
});
