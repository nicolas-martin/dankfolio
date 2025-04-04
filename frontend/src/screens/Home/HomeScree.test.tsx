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

// Test data
const mockWallet = {
	address: 'GgaBFkzjuvMV7RCrZyt65zx7iRo7W6Af4cGXZMKNxK2R',
	balances: [
		{ id: 'So11111111111111111111111111111111111111112', amount: 0.0462 },
	],
};

const mockCoins = [
	{
		id: 'So11111111111111111111111111111111111111112',
		name: 'Wrapped SOL',
		symbol: 'SOL',
		description: 'Wrapped SOL (SOL) is a Solana token.',
		icon_url: 'https://solana.com/logo.png',
		price: 126.67,
		daily_volume: 651534477,
	},
	{
		id: 'CniPCE4b3s8gSUPhUiyMjXnytrEqUrMfSsnbBjLCpump',
		name: 'PWEASE',
		symbol: 'pwease',
		description: 'PWEASE (pwease) is a Solana token.',
		icon_url: 'https://solana.com/logo.png',
		price: 0.023,
		daily_volume: 9370569,
	},
];

describe('HomeScreen', () => {
	const fetchAvailableCoinsMock = jest.fn();
	const showToastMock = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();

		// Mock portfolio store with wallet state
		mocked(usePortfolioStore).mockReturnValue({
			wallet: mockWallet,
		});

		// Mock coin store with initial state and loading states
		const mockCoinStore = {
			availableCoins: mockCoins,
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
	});

	// Add test for loading state
	it('shows loading state while fetching coins', async () => {
		// Mock loading state
		const mockCoinStoreLoading = {
			availableCoins: [],
			fetchAvailableCoins: fetchAvailableCoinsMock,
			isLoading: true,
			error: null,
		};
		mocked(useCoinStore).mockReturnValue(mockCoinStoreLoading);

		// Verify loading state is handled
		fetchAvailableCoinsMock.mockImplementation(async () => {
			await new Promise(resolve => setTimeout(resolve, 100)); // Simulate API delay
		});

		const { getByTestId } = render(
			<NavigationContainer>
				<HomeScreen />
			</NavigationContainer>
		);

		fireEvent.press(getByTestId('refresh-button'));

		expect(fetchAvailableCoinsMock).toHaveBeenCalled();
		expect(useCoinStore).toHaveBeenCalled();
	});

	// Add test for error handling
	it('shows error toast when fetching coins fails', async () => {
		const error = new Error('Failed to fetch coins');
		fetchAvailableCoinsMock.mockRejectedValueOnce(error);

		const { getByTestId } = render(
			<NavigationContainer>
				<HomeScreen />
			</NavigationContainer>
		);

		fireEvent.press(getByTestId('refresh-button'));

		await waitFor(() => {
			expect(showToastMock).toHaveBeenCalledWith({
				type: 'error',
				message: 'Failed to refresh coins',
				duration: 3000,
			});
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
			coin: mockCoins[0],
			fromScreen: 'Home',
		});
	});

	it('calls fetchAvailableCoins and shows success toast when refresh button is pressed', async () => {
		const { getByTestId } = render(
			<NavigationContainer>
				<HomeScreen />
			</NavigationContainer>
		);

		// Find the refresh button using its test ID
		const refreshButton = getByTestId('refresh-button');

		fireEvent.press(refreshButton);

		await waitFor(() => {
			expect(fetchAvailableCoinsMock).toHaveBeenCalled();
			expect(showToastMock).toHaveBeenCalledWith({
				type: 'success',
				message: 'Coins refreshed successfully!',
				duration: 3000,
			});
		});
	});
});
