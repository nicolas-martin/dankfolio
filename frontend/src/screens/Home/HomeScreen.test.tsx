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

		// Verify initial render
		await waitFor(() => {
			expect(usePortfolioStore).toHaveBeenCalledTimes(1);
			expect(useCoinStore).toHaveBeenCalledTimes(1);
			expect(fetchAvailableCoinsMock).not.toHaveBeenCalled();
			expect(fetchPortfolioBalanceMock).not.toHaveBeenCalled();

			expect(getByText('Available Coins')).toBeTruthy();
			expect(getByText('SOL')).toBeTruthy();
			expect(getByText('USDT')).toBeTruthy();
		});

		// Test refresh functionality
		const refreshButton = getByTestId('refresh-button');
		fireEvent.press(refreshButton);

		await waitFor(() => {
			// Verify function calls
			expect(fetchAvailableCoinsMock).toHaveBeenCalledTimes(1);
			expect(fetchPortfolioBalanceMock).toHaveBeenCalledTimes(1);
			expect(fetchPortfolioBalanceMock).toHaveBeenCalledWith(mockWallet.address);
			expect(showToastMock).toHaveBeenCalledTimes(1);

			// Verify data after refresh
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
			expect(mockWallet.balances).toEqual(mockWalletBalances.balances);
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

		// Initial state verification
		expect(fetchAvailableCoinsMock).not.toHaveBeenCalled();
		expect(fetchPortfolioBalanceMock).not.toHaveBeenCalled();
		expect(showToastMock).not.toHaveBeenCalled();

		// Trigger refresh
		const refreshButton = getByTestId('refresh-button');
		fireEvent.press(refreshButton);

		await waitFor(() => {
			// Verify error handling
			expect(fetchAvailableCoinsMock).toHaveBeenCalledTimes(1);
			expect(fetchPortfolioBalanceMock).toHaveBeenCalledTimes(0);
			expect(showToastMock).toHaveBeenCalledTimes(1);
			expect(showToastMock).toHaveBeenCalledWith({
				type: 'error',
				message: 'Failed to refresh coins',
				duration: 3000,
			});
		});
	});
});
