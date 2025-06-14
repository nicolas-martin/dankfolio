import React from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { render, fireEvent, act } from '@testing-library/react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CoinDetail from '@screens/CoinDetail';
import Home from '@screens/Home';
import { PaperProvider } from 'react-native-paper';
import { ToastProvider } from '@components/Common/Toast';
import CustomHeader from './CustomHeader';
import { Coin } from '@/types';
import { HomeScreenNavigationProp } from '@screens/Home/home_types';

const Stack = createNativeStackNavigator();

// Test data
const mockCoin: Coin = {
	mintAddress: 'BTC123',
	symbol: 'BTC',
	name: 'Bitcoin',
	resolvedIconUrl: 'https://example.com/btc-from-nav.png',
	decimals: 8,
	price: 50000,
	change24h: 2.5,
	dailyVolume: 1000000000,
	description: 'Bitcoin',
	website: 'https://bitcoin.org',
	twitter: 'https://twitter.com/bitcoin',
	telegram: '',
	tags: ['cryptocurrency'],
	createdAt: new Date(),
};

// Mock home scripts
jest.mock('@screens/Home/home_scripts', () => ({
	handleCoinPress: (coin: Coin, navigation: HomeScreenNavigationProp) => {
		navigation.navigate('CoinDetail', {
			coin
		});
	},
}));

// Mock CoinDetail scripts
jest.mock('@screens/CoinDetail/coindetail_scripts', () => ({
	TIMEFRAMES: [
		{ label: '1H', value: '1h' },
		{ label: '24H', value: '24h' },
		{ label: '7D', value: '7d' },
	],
	fetchPriceHistory: jest.fn().mockImplementation(() => Promise.resolve([])),
	handleTradeNavigation: jest.fn(),
}));

// Mock Chart components
jest.mock('@components/Chart/CoinChart', () => {
	const MockCoinChart = () => <View testID="coin-chart" />;
	MockCoinChart.displayName = 'MockCoinChart';
	return MockCoinChart;
});

jest.mock('@components/Chart/CoinInfo', () => {
	const MockCoinInfo = ({ metadata }: { metadata: { description: string } }) => (
		<View testID="coin-info">
			<Text>{metadata.description}</Text>
		</View>
	);
	MockCoinInfo.displayName = 'MockCoinInfo';
	return MockCoinInfo;
});

jest.mock('@components/CoinDetails/PriceDisplay', () => {
	const MockPriceDisplay = () => <View testID="price-display" />;
	MockPriceDisplay.displayName = 'MockPriceDisplay';
	return MockPriceDisplay;
});

// Mock stores with minimal required data
jest.mock('@store/coins', () => ({
	useCoinStore: () => ({
		availableCoins: [mockCoin],
		getCoinByID: (_id: string) => mockCoin,
		fetchAvailableCoins: jest.fn().mockImplementation(() => Promise.resolve()),
		isLoading: false,
		error: null
	}),
}));

// Mock portfolio store for wallet state
jest.mock('@store/portfolio', () => ({
	usePortfolioStore: () => ({
		wallet: {
			address: 'mock-address',
			connected: true
		},
		tokens: [{
			mintAddress: 'bitcoin',
			amount: 1.5,
			value: 75000,
			coin: mockCoin,
			price: 50000
		}],
	}),
}));

// Mock toast with minimal implementation
jest.mock('@components/Common/Toast', () => ({
	useToast: () => ({
		showToast: jest.fn(),
		hideToast: jest.fn(),
	}),
	ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('Navigation Flow', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	const renderTestNavigator = () => {
		return render(
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
	};

	it('handles complete navigation flow with data persistence', async () => {
		const { getByTestId, getByText, queryByText, findByTestId } = renderTestNavigator();

		// 1. Initial Home Screen Render
		await findByTestId('home-screen');
		expect(getByText('Trending Coins')).toBeTruthy();
		expect(getByText('BTC')).toBeTruthy();
		expect(getByText('$50.00K')).toBeTruthy(); // Actual formatted price from component

		// 2. First Navigation to CoinDetail
		await act(async () => {
			const coinCard = getByTestId('coin-card-bitcoin');
			fireEvent.press(coinCard);
		});

		// Verify CoinDetail content
		const coinDetailScreen = await findByTestId('coin-detail-screen');
		expect(coinDetailScreen).toBeTruthy();
		await findByTestId('coin-info');
		expect(getByText('About Bitcoin')).toBeTruthy();
		expect(getByText('Digital gold')).toBeTruthy();

		// 3. Navigate Back to Home
		await act(async () => {
			const backButton = getByTestId('back-button');
			fireEvent.press(backButton);
		});

		// Verify back on Home screen
		await findByTestId('home-screen');
		expect(queryByText('About Bitcoin')).toBeNull();

		// 4. Second Navigation to CoinDetail (testing state persistence)
		await act(async () => {
			const coinCard = getByTestId('coin-card-bitcoin');
			fireEvent.press(coinCard);
		});

		// Verify CoinDetail content is preserved
		await findByTestId('coin-detail-screen');
		await findByTestId('coin-info');
		expect(getByText('About Bitcoin')).toBeTruthy();
		expect(getByText('Digital gold')).toBeTruthy();

		// 5. Final Navigation Back
		await act(async () => {
			const backButton = getByTestId('back-button');
			fireEvent.press(backButton);
		});
		await findByTestId('home-screen');
		expect(queryByText('About Bitcoin')).toBeNull();
	});
}); 
