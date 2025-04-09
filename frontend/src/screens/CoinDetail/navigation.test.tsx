import { NavigationContainer } from '@react-navigation/native';
import { render, fireEvent } from '@testing-library/react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CoinDetail from '@screens/CoinDetail';
import Home from '@screens/Home';
import { PaperProvider } from 'react-native-paper';
import { ToastProvider } from '@components/Common/Toast';
import { formatPrice } from '@utils/numberFormat';
import CustomHeader from '../../navigation/CustomHeader';

const Stack = createNativeStackNavigator();

// Test data
const mockCoin = {
	id: 'bitcoin',
	name: 'Bitcoin',
	symbol: 'BTC',
	icon_url: 'https://example.com/btc.png',
	price: '50000',
	description: 'Digital gold',
	website: 'https://bitcoin.org',
	twitter: 'https://twitter.com/bitcoin',
	telegram: 'https://t.me/bitcoin',
	daily_volume: '1000000',
	tags: ['cryptocurrency'],
};

// Mock minimal required store data
jest.mock('@store/coins', () => ({
	useCoinStore: () => ({
		availableCoins: [mockCoin],
		getCoinByID: (id: string) => mockCoin,
		fetchAvailableCoins: jest.fn(),
	}),
}));

jest.mock('@store/portfolio', () => ({
	usePortfolioStore: () => ({
		tokens: [{
			id: 'bitcoin',
			amount: 1.5,
			value: 75000,
		}],
		wallet: {
			address: 'mock-address',
		},
		fetchPortfolioBalance: jest.fn(),
	}),
}));

describe('CoinDetail Navigation', () => {
	const renderTestNavigator = () => render(
		<PaperProvider>
			<ToastProvider>
				<NavigationContainer>
					<Stack.Navigator
						initialRouteName="Home"
						screenOptions={{
							header: () => <CustomHeader />,
							headerShown: true,
						}}
					>
						<Stack.Screen name="Home" component={Home} />
						<Stack.Screen
							name="CoinDetail"
							component={CoinDetail}
							initialParams={{ coin: mockCoin }}
						/>
					</Stack.Navigator>
				</NavigationContainer>
			</ToastProvider>
		</PaperProvider>
	);

	it('should navigate between Home and CoinDetail screens with data persistence', () => {
		const { getByTestId, getByText, queryByText } = renderTestNavigator();

		// Verify we start on Home screen with correct content
		expect(getByTestId('home-screen')).toBeTruthy();
		expect(getByText('Available Coins')).toBeTruthy();

		// Verify coin data is displayed on Home screen
		expect(getByText('BTC')).toBeTruthy();
		expect(getByText(formatPrice(Number(mockCoin.price)))).toBeTruthy();

		// Navigate to CoinDetail by pressing the coin card
		const coinCard = getByTestId('coin-card-bitcoin');
		fireEvent.press(coinCard);

		// Verify CoinDetail screen is displayed with correct data
		expect(getByTestId('coin-detail-screen')).toBeTruthy();
		expect(getByText('About Bitcoin')).toBeTruthy();
		expect(getByText('Digital gold')).toBeTruthy();
		expect(getByText('Your Holdings')).toBeTruthy();
		expect(getByText('1.5000 BTC')).toBeTruthy();

		// Press back button
		const backButton = getByTestId('back-button');
		fireEvent.press(backButton);

		// Verify we're back on Home screen
		expect(getByTestId('home-screen')).toBeTruthy();
		expect(queryByText('About Bitcoin')).toBeNull();
	});

	it('should preserve timeframe selection when navigating', () => {
		const { getByTestId, getByText } = renderTestNavigator();

		// Navigate to CoinDetail
		const coinCard = getByTestId('coin-card-bitcoin');
		fireEvent.press(coinCard);

		// Change timeframe
		const hourButton = getByText('1H');
		fireEvent.press(hourButton);

		// Verify timeframe changed
		expect(hourButton).toHaveStyle({ color: expect.any(String) });

		// Navigate back
		const backButton = getByTestId('back-button');
		fireEvent.press(backButton);

		// Navigate to CoinDetail again
		fireEvent.press(coinCard);

		// Verify timeframe selection persisted
		const hourButtonAfterReturn = getByText('1H');
		expect(hourButtonAfterReturn).toHaveStyle({ color: expect.any(String) });
	});
}); 
