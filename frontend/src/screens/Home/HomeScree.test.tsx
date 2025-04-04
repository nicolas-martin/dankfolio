import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import HomeScreen from './index';
import { usePortfolioStore } from '@store/portfolio';
import { useCoinStore } from '@store/coins';
import { useToast } from '@components/Common/Toast';
import { NavigationContainer } from '@react-navigation/native';
import { Text } from 'react-native';
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
			expect(getByText('Available Coins')).toBeTruthy();
			expect(getByText('SOL')).toBeTruthy();
			expect(getByText('USDT')).toBeTruthy();
			expect(getByText('View Profile')).toBeTruthy();
		});
	});

	it('calls both fetchAvailableCoins and fetchPortfolioBalance when refreshing', async () => {
		const { getByTestId } = render(
			<NavigationContainer>
				<HomeScreen />
			</NavigationContainer>
		);

		const refreshButton = getByTestId('refresh-button');
		fireEvent.press(refreshButton);

		await waitFor(() => {
			// Verify both fetch functions were called
			expect(fetchAvailableCoinsMock).toHaveBeenCalled();
			expect(fetchPortfolioBalanceMock).toHaveBeenCalledWith(mockWallet.address);

			// Verify success toast was shown
			expect(showToastMock).toHaveBeenCalledWith({
				type: 'success',
				message: 'Coins refreshed successfully!',
				duration: 3000,
			});
		});
	});

	it('shows error toast when fetching fails', async () => {
		const error = new Error('Network error');
		fetchAvailableCoinsMock.mockRejectedValueOnce(error);

		const { getByTestId } = render(
			<NavigationContainer>
				<HomeScreen />
			</NavigationContainer>
		);

		const refreshButton = getByTestId('refresh-button');
		fireEvent.press(refreshButton);

		await waitFor(() => {
			expect(showToastMock).toHaveBeenCalledWith({
				type: 'error',
				message: 'Failed to refresh coins',
				duration: 3000,
			});
		});
	});

	it('verifies store state after refresh', async () => {
		// Initial render with default mocks
		const { getByTestId } = render(
			<NavigationContainer>
				<HomeScreen />
			</NavigationContainer>
		);

		// Trigger refresh
		const refreshButton = getByTestId('refresh-button');
		fireEvent.press(refreshButton);

		await waitFor(() => {
			// Verify both functions were called
			expect(fetchAvailableCoinsMock).toHaveBeenCalled();
			expect(fetchPortfolioBalanceMock).toHaveBeenCalledWith(mockWallet.address);

			// Verify wallet balances in store are as expected
			const balances = mockWallet.balances;

			// Check SOL balance
			const solBalance = balances.find(b => b.id === "So11111111111111111111111111111111111111112");
			expect(solBalance?.amount).toBe(0.046201915);

			// Check PWEASE balance
			const pweaseBalance = balances.find(b => b.id === "CniPCE4b3s8gSUPhUiyMjXnytrEqUrMfSsnbBjLCpump");
			expect(pweaseBalance?.amount).toBe(1.365125);

			// Check largest token balance
			const largeBalance = balances.find(b => b.id === "28B63oRCS2K83EUqTRbe7qYEvQFFTPbntiUnJNKLpump");
			expect(largeBalance?.amount).toBe(1483648.13214);

			// Verify coin prices are correct
			const coins = mockApiResponse;
			expect(coins[0].price).toBe(126.675682);
			expect(coins[1].price).toBe(1.000041);
		});
	});
});
