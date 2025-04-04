import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import HomeScreen from './index'; // Corrected: Use relative path
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

jest.mock('@store/portfolio', () => ({ // Use path alias
	usePortfolioStore: jest.fn(),
}));

jest.mock('@store/coins', () => ({ // Use path alias
	useCoinStore: jest.fn(),
}));

jest.mock('@components/Common/Toast', () => ({ // Use path alias
	useToast: jest.fn(),
}));

jest.mock('@components/Home/CoinCard', () => { // Use path alias
	// Import Text inside the factory function
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
  balances: mockWalletBalances.balances,
  getWalletBalance: jest.fn().mockResolvedValue(mockWalletBalances)
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
	},
	{
		id: "CniPCE4b3s8gSUPhUiyMjXnytrEqUrMfSsnbBjLCpump",
		name: "PWEASE",
		symbol: "pwease",
		decimals: 6,
		description: "PWEASE (pwease) is a Solana token.",
		icon_url: "https://ipfs.io/ipfs/QmboNoCSu87DLgnqqf3LVWCUF2zZtzpSE5LtAa3tx8hUUG",
		tags: ["verified", "launchpad", "birdeye-trending", "community"],
		price: 0.023736,
		daily_volume: 9370569.942992656
	}
];

describe('HomeScreen', () => {
	const fetchAvailableCoinsMock = jest.fn();
	const showToastMock = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();

		// Mock portfolio store with wallet state and functions
		mocked(usePortfolioStore).mockReturnValue({
		  wallet: mockWallet,
		  getWalletBalance: mockWallet.getWalletBalance,
		});

		// Mock coin store with initial state and loading states
		const mockCoinStore = {
			availableCoins: mockApiResponse,
			fetchAvailableCoins: fetchAvailableCoinsMock,
			isLoading: false,
			error: null,
		};
		mocked(useCoinStore).mockReturnValue(mockCoinStore);

		// Mock toast notifications
		mocked(useToast).mockReturnValue({
			showToast: showToastMock,
			hideToast: jest.fn(),
		});

		// Mock fetchAvailableCoins to return API response
		fetchAvailableCoinsMock.mockImplementation(async () => {
			return mockApiResponse;
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
			expect(getByText('pwease')).toBeTruthy();
			expect(getByText('View Profile')).toBeTruthy();
		});
	});

	it('navigates to CoinDetail screen with correct params when a coin is pressed', async () => {
		const { getByText } = render(
			<NavigationContainer>
				<HomeScreen />
			</NavigationContainer>
		);

		const coinCard = await waitFor(() => getByText('SOL'));
		fireEvent.press(coinCard);

		expect(mockNavigate).toHaveBeenCalledWith('CoinDetail', {
			coin: mockApiResponse[0],
			fromScreen: 'Home',
		});
	});

	it('calls fetchAvailableCoins and shows success toast when refresh button is pressed', async () => {
		const { getByTestId } = render(
			<NavigationContainer>
				<HomeScreen />
			</NavigationContainer>
		);

		const refreshButton = getByTestId('refresh-button');
		fireEvent.press(refreshButton);

		await waitFor(() => {
			// Verify fetchAvailableCoins was called
			expect(fetchAvailableCoinsMock).toHaveBeenCalled();

			// Verify success toast was shown
			expect(showToastMock).toHaveBeenCalledWith({
				type: 'success',
				message: 'Coins refreshed successfully!',
				duration: 3000,
			});
		});

		// Mock the store update after fetch
		await waitFor(() => {
			// Verify fetchAvailableCoins was called
			expect(fetchAvailableCoinsMock).toHaveBeenCalledWith();

			// Verify store was updated with the correct data
			const mockStoreAfterFetch = {
				availableCoins: mockApiResponse,
				fetchAvailableCoins: fetchAvailableCoinsMock,
				isLoading: false,
				error: null,
			};
			mocked(useCoinStore).mockReturnValue(mockStoreAfterFetch);

			// Verify specific coin data matches the API response
			const solCoin = mockApiResponse[0];
			expect(solCoin.price).toBe(126.675682);
			expect(solCoin.daily_volume).toBe(651534477.8800015);

			// Verify USDT data
			const usdtCoin = mockApiResponse[1];
			expect(usdtCoin.symbol).toBe('USDT');
			expect(usdtCoin.price).toBe(1.000041);

			// Verify PWEASE data
			const pweaseCoin = mockApiResponse[2];
			expect(pweaseCoin.symbol).toBe('pwease');
			expect(pweaseCoin.price).toBe(0.023736);
		});
	});

	it('shows loading state while fetching coins', async () => {
		// Mock loading state
		const mockCoinStoreLoading = {
			availableCoins: [],
			fetchAvailableCoins: fetchAvailableCoinsMock,
			isLoading: true,
			error: null,
		};
		mocked(useCoinStore).mockReturnValue(mockCoinStoreLoading);

		const { getByTestId } = render(
			<NavigationContainer>
				<HomeScreen />
			</NavigationContainer>
		);

		const refreshButton = getByTestId('refresh-button');
		fireEvent.press(refreshButton);

		expect(fetchAvailableCoinsMock).toHaveBeenCalled();
	});

	it('shows error toast when fetching coins fails', async () => {
		const error = new Error('Failed to fetch coins');
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
});
