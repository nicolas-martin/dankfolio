import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import HomeScreen from './index'; // Corrected: Use relative path
import { usePortfolioStore } from '@store/portfolio';
import { useCoinStore } from '@store/coins';
import { useToast } from '@components/Common/Toast';
import { NavigationContainer } from '@react-navigation/native';
import { Text } from 'react-native';

// Mocks
jest.mock('../../../store/portfolio', () => ({
	usePortfolioStore: jest.fn(),
}));

jest.mock('../../../store/coins', () => ({
	useCoinStore: jest.fn(),
}));

jest.mock('../../../components/Common/Toast', () => ({
	useToast: jest.fn(),
}));

jest.mock('../../../components/Home/CoinCard', () => {
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

		(usePortfolioStore as jest.Mock).mockReturnValue({
			wallet: mockWallet,
		});

		(useCoinStore as jest.Mock).mockReturnValue({
			availableCoins: mockCoins,
			fetchAvailableCoins: fetchAvailableCoinsMock,
		});

		(useToast as jest.Mock).mockReturnValue({
			showToast: showToastMock,
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
		const { getByRole } = render( // Corrected: Use getByRole
			<NavigationContainer>
				<HomeScreen />
			</NavigationContainer>
		);

		// Find the refresh IconButton (role "button", there’s only one)
		const refreshButton = getByRole('button'); // Corrected: Use getByRole

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

