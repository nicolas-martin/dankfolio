import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
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

// Test data from actual API responses
const mockWalletBalances = {
	balances: [
		{
			id: "So11111111111111111111111111111111111111112",
			amount: 0.046201915
		},
		{
			id: "CniPCE4b3s8gSUPhUiyMjXnytrEqUrMfSsnbBjLCpump",
			amount: 1.365125
		},
		{
			id: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
			amount: 2.942492
		},
		{
			id: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
			amount: 0.067008
		},
		{
			id: "28B63oRCS2K83EUqTRbe7qYEvQFFTPbntiUnJNKLpump",
			amount: 1483648.13214
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
		icon_url: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
		tags: ["verified", "community", "strict"],
		price: 126.675682,
		daily_volume: 651534477.8800015
	},
	{
		id: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
		name: "USDT",
		symbol: "USDT",
		decimals: 6,
		description: "USDT (USDT) is a Solana token.",
		icon_url: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.svg",
		tags: ["verified", "community", "strict"],
		price: 1.000041,
		daily_volume: 93921196.89232118
	}
];

describe('HomeScreen', () => {
	const fetchAvailableCoinsMock = jest.fn();
	const fetchPortfolioBalanceMock = jest.fn();
	const showToastMock = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();

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

	it('renders coin list and profile button when wallet is connected', async () => {
		const { getByText } = render(
			<NavigationContainer>
				<HomeScreen />
			</NavigationContainer>
		);

		await waitFor(() => {
			// Verify store hooks are called exactly once on mount
			expect(usePortfolioStore).toHaveBeenCalledTimes(1);
			expect(useCoinStore).toHaveBeenCalledTimes(1);
			expect(fetchAvailableCoinsMock).not.toHaveBeenCalled();
			expect(fetchPortfolioBalanceMock).not.toHaveBeenCalled();

			expect(getByText('Available Coins')).toBeTruthy();
			expect(getByText('SOL')).toBeTruthy();
			expect(getByText('USDT')).toBeTruthy();
			expect(getByText('View Profile')).toBeTruthy();
		});
	});

	it('calls both fetchAvailableCoins and fetchPortfolioBalance exactly once when refreshing', async () => {
		const { getByTestId } = render(
			<NavigationContainer>
				<HomeScreen />
			</NavigationContainer>
		);

		expect(fetchAvailableCoinsMock).not.toHaveBeenCalled();
		expect(fetchPortfolioBalanceMock).not.toHaveBeenCalled();

		const refreshButton = getByTestId('refresh-button');
		fireEvent.press(refreshButton);

		await waitFor(() => {
			// Verify store hooks and functions are called exactly once
			expect(usePortfolioStore).toHaveBeenCalledTimes(1);
			expect(useCoinStore).toHaveBeenCalledTimes(1);
			expect(fetchAvailableCoinsMock).toHaveBeenCalledTimes(1);
			expect(fetchPortfolioBalanceMock).toHaveBeenCalledTimes(1);
			expect(fetchPortfolioBalanceMock).toHaveBeenCalledWith(mockWallet.address);
			expect(showToastMock).toHaveBeenCalledTimes(1);
		});
	});

	it('shows error toast when fetching fails', async () => {
	  // Both calls will fail
	  const error = new Error('Network error');
	  fetchAvailableCoinsMock.mockRejectedValueOnce(error);
	  fetchPortfolioBalanceMock.mockRejectedValueOnce(error);

	  const { getByTestId } = render(
	    <NavigationContainer>
	      <HomeScreen />
	    </NavigationContainer>
	  );

	  // Initial state check
	  expect(fetchAvailableCoinsMock).not.toHaveBeenCalled();
	  expect(fetchPortfolioBalanceMock).not.toHaveBeenCalled();
	  expect(showToastMock).not.toHaveBeenCalled();

	  // Trigger refresh
	  const refreshButton = getByTestId('refresh-button');
	  fireEvent.press(refreshButton);

	  await waitFor(() => {
	    // Both fetch functions should be called exactly once
	    expect(fetchAvailableCoinsMock).toHaveBeenCalledTimes(1);
	    expect(fetchPortfolioBalanceMock).toHaveBeenCalledTimes(1);
	    // Error toast should be shown once
	    expect(showToastMock).toHaveBeenCalledTimes(1);
	    // Verify error message
			expect(showToastMock).toHaveBeenCalledWith({
				type: 'error',
				message: 'Failed to refresh coins',
				duration: 3000,
			});
		});
	});

	it('verifies store state and call counts after refresh', async () => {
		const { getByTestId } = render(
			<NavigationContainer>
				<HomeScreen />
			</NavigationContainer>
		);

		// Initial state check
		expect(usePortfolioStore).toHaveBeenCalledTimes(1);
		expect(useCoinStore).toHaveBeenCalledTimes(1);
		expect(fetchAvailableCoinsMock).not.toHaveBeenCalled();
		expect(fetchPortfolioBalanceMock).not.toHaveBeenCalled();

		// Trigger refresh
		const refreshButton = getByTestId('refresh-button');
		fireEvent.press(refreshButton);

		await waitFor(() => {
			// Verify function call counts
			expect(usePortfolioStore).toHaveBeenCalledTimes(1);
			expect(useCoinStore).toHaveBeenCalledTimes(1);
			expect(fetchAvailableCoinsMock).toHaveBeenCalledTimes(1);
			expect(fetchPortfolioBalanceMock).toHaveBeenCalledTimes(1);
			expect(showToastMock).toHaveBeenCalledTimes(1);

			// Verify all coin data with exact fields
			const coins = mockApiResponse;
			expect(coins).toEqual([
				{
					id: "So11111111111111111111111111111111111111112",
					name: "Wrapped SOL",
					symbol: "SOL",
					decimals: 9,
					description: "Wrapped SOL (SOL) is a Solana token.",
					icon_url: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
					tags: ["verified", "community", "strict"],
					price: 126.675682,
					daily_volume: 651534477.8800015
				},
				{
					id: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
					name: "USDT",
					symbol: "USDT",
					decimals: 6,
					description: "USDT (USDT) is a Solana token.",
					icon_url: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.svg",
					tags: ["verified", "community", "strict"],
					price: 1.000041,
					daily_volume: 93921196.89232118
				}
			]);

			// Verify wallet balances
			expect(mockWallet.balances).toEqual([
				{
					id: "So11111111111111111111111111111111111111112",
					amount: 0.046201915
				},
				{
					id: "CniPCE4b3s8gSUPhUiyMjXnytrEqUrMfSsnbBjLCpump",
					amount: 1.365125
				},
				{
					id: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
					amount: 2.942492
				},
				{
					id: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
					amount: 0.067008
				},
				{
					id: "28B63oRCS2K83EUqTRbe7qYEvQFFTPbntiUnJNKLpump",
					amount: 1483648.13214
				}
			]);
		});
	});
});
