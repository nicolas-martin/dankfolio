import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import CoinDetailScreen from './index'; // Assuming default export
import { usePortfolioStore } from '@store/portfolio';
import { useCoinStore } from '@store/coins';
import { useToast } from '@components/Common/Toast';
import * as CoinDetailScripts from './coindetail_scripts';
import { Coin } from '@/types'; // Assuming Coin type is in @/types

// --- Mock Data ---
const mockInitialCoin: Coin = {
	id: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzL7xiH5HwMJI",
	name: "WEN",
	symbol: "WEN",
	icon_url: "https://logos.usdcfreesol.workers.dev/ekpggsjmfqkzk9kqansqyxcf8fbopzl7xih5hwjmji.webp",
	decimals: 5,
	price: 0.00011104,
	description: "WEN",
	website: "https://wen-foundation.org",
	twitter: "https://twitter.com/wenwencoin",
	telegram: "https://t.me/wenwencoinsol",
	daily_volume: 123456.78,
	tags: ["meme", "community"],
	created_at: "2024-01-01T00:00:00Z"
};

const mockSolCoin: Coin = {
	id: "So11111111111111111111111111111111111111112",
	name: "Wrapped SOL",
	symbol: "SOL",
	icon_url: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
	decimals: 9,
	price: 130.50,
	description: "Wrapped SOL",
	website: "",
	twitter: "",
	telegram: "",
	daily_volume: 9876543.21,
	tags: ["defi"],
	created_at: "2024-01-01T00:00:00Z"
};


// --- Mocks ---

// React Navigation
const mockNavigate = jest.fn();
const mockRoute = {
	params: { coin: mockInitialCoin },
};
jest.mock('@react-navigation/native', () => {
	const actualNav = jest.requireActual('@react-navigation/native');
	return {
		...actualNav,
		useNavigation: () => ({
			navigate: mockNavigate,
		}),
		useRoute: () => (mockRoute),
	};
});

// Stores
const mockUsePortfolioStore = usePortfolioStore as unknown as jest.Mock;
const mockUseCoinStore = useCoinStore as unknown as jest.Mock;
const mockGetCoinByID = jest.fn();
jest.mock('@store/portfolio');
jest.mock('@store/coins');

// Toast
const mockShowToast = jest.fn();
jest.mock('@components/Common/Toast', () => ({
	useToast: () => ({
		showToast: mockShowToast,
		hideToast: jest.fn(),
	}),
}));

// Child Components
// Mock child components to render their name and accept props
const createMockComponent = (name: string) => (props: any) => {
	const React = require('react');
	const View = require('react-native').View;
	const Text = require('react-native').Text;
	// Include testID for easier querying and spread other props
	return <View testID={`mock-${name}`} {...props}><Text>{name}</Text></View>;
};
jest.mock('@components/Chart/CoinChart', () => createMockComponent('CoinChart'));
jest.mock('@components/Chart/CoinInfo', () => createMockComponent('CoinInfo'));
jest.mock('@components/CoinDetails/PriceDisplay', () => createMockComponent('PriceDisplay'));

// React Native Paper Components (add more as needed)
jest.mock('react-native-paper', () => {
	const actualPaper = jest.requireActual('react-native-paper');
	const MockToggleButton = (props: any) => {
		const React = require('react');
		const Pressable = require('react-native').Pressable;
		const Text = require('react-native').Text;
		// Use onPress from props if available, falling back to onValueChange for ToggleButton.Row context
		const onPress = () => props.onPress ? props.onPress(props.value) : props.onValueChange(props.value);
		return (
			<Pressable onPress={onPress} testID={`toggle-button-${props.value}`}>
				{props.icon ? props.icon() : <Text>{props.value}</Text>}
			</Pressable>
		);
	}
	MockToggleButton.Row = (props: any) => {
		const React = require('react');
		const View = require('react-native').View;
		// Map children to pass down the onValueChange prop
		const childrenWithProps = React.Children.map(props.children, (child: any) => {
			if (React.isValidElement(child)) {
				// Ensure onValueChange is passed down, used by individual ToggleButton mock
				return React.cloneElement(child, { onValueChange: props.onValueChange, value: child.props.value } as any);
			}
			return child;
		});
		return <View testID="toggle-button-row">{childrenWithProps}</View>;
	}
	return {
		...actualPaper,
		ToggleButton: MockToggleButton,
		// Ensure other used components like ActivityIndicator, Text, Button are included
		ActivityIndicator: actualPaper.ActivityIndicator,
		Text: actualPaper.Text,
		Button: actualPaper.Button,
		useTheme: actualPaper.useTheme, // Keep actual useTheme
	};
});


// Scripts
const mockFetchPriceHistory = jest.spyOn(CoinDetailScripts, 'fetchPriceHistory').mockImplementation(
	async (timeframe, setLoading, setPriceHistory, coin, isInitialLoad) => {
		if (!coin) return;
		setLoading(true);
		await new Promise(resolve => setTimeout(resolve, 10)); // Minimal delay

		// Create mock data matching the structure set by the *actual* mapping
		const now = Date.now();
		const pastUnix = Math.floor((now - 100000) / 1000);
		const nowUnix = Math.floor(now / 1000);

		setPriceHistory([
			{
				timestamp: new Date(pastUnix * 1000).toISOString(),
				value: coin.price * 0.98, // Value should be number
				unixTime: pastUnix
			},
			{
				timestamp: new Date(nowUnix * 1000).toISOString(),
				value: coin.price, // Value should be number
				unixTime: nowUnix
			}
		]);
		setLoading(false);
	}
);
const mockHandleTradeNavigation = jest.spyOn(CoinDetailScripts, 'handleTradeNavigation').mockImplementation(() => { });

// Icons (using the same robust mock from ProfileScreen)
jest.mock('lucide-react-native', () => {
	const React = require('react');
	const Text = require('react-native').Text;
	const createMockIcon = (name: string) => (props: any) => <Text {...props}>{name}</Text>;
	return {
		ArrowLeft: createMockIcon('ArrowLeft'), Home: createMockIcon('Home'),
		Coins: createMockIcon('Coins'), Settings: createMockIcon('Settings'),
		Search: createMockIcon('Search'), Plus: createMockIcon('Plus'),
		Trash: createMockIcon('Trash'), Pencil: createMockIcon('Pencil'),
		User: createMockIcon('User'), Menu: createMockIcon('Menu'),
		X: createMockIcon('X'), Check: createMockIcon('Check'),
		AlertCircle: createMockIcon('AlertCircle'), Globe: createMockIcon('Globe'),
		Link: createMockIcon('Link'), ArrowUpDown: createMockIcon('ArrowUpDown'),
		Wallet: createMockIcon('Wallet'), MessageCircle: createMockIcon('MessageCircle'),
		Twitter: createMockIcon('Twitter'), Copy: createMockIcon('Copy'), // Added Copy if used by IconButton
	};
});


// --- Test Suite ---

describe('CoinDetail Screen', () => {

	beforeEach(() => {
		// Reset mocks before each test
		jest.clearAllMocks();

		// Setup default mock implementations
		mockUsePortfolioStore.mockReturnValue({
			tokens: [], // Default to no holdings
			// Add other store state/functions if needed
		});
		mockUseCoinStore.mockReturnValue({
			getCoinByID: mockGetCoinByID.mockResolvedValue(mockSolCoin), // Default mock for getCoinByID
			// Add other store state/functions if needed
		});
		// Reset route params if necessary, though usually set per test
		mockRoute.params.coin = mockInitialCoin;
	});

	it('renders correctly with initial coin data', async () => {
		// Define the expected structure of the mock history data for comparison
		const now = Date.now(); // Use a fixed time for predictable calculations if needed, but Date.now() is fine here
		const pastUnix = Math.floor((now - 100000) / 1000);
		const nowUnix = Math.floor(now / 1000);
		const expectedMockHistory = [
			{
				timestamp: new Date(pastUnix * 1000).toISOString(),
				value: mockInitialCoin.price * 0.98,
				unixTime: pastUnix
			},
			{
				timestamp: new Date(nowUnix * 1000).toISOString(),
				value: mockInitialCoin.price,
				unixTime: nowUnix
			}
		];

		// Re-configure the mock for this specific test run to use the exact data
		mockFetchPriceHistory.mockImplementation(
			async (timeframe, setLoading, setPriceHistory, coin, isInitialLoad) => {
				if (!coin) return;
				setLoading(true);
				await new Promise(resolve => setTimeout(resolve, 0)); // Near-instant resolve
				setPriceHistory(expectedMockHistory);
				setLoading(false);
			}
		);

		const { getByText, findByText, getByTestId } = render(
			<CoinDetailScreen />
		);

		// Wait for price history to load
		await waitFor(() => expect(getByTestId('mock-PriceDisplay')).toBeTruthy()); // Wait until PriceDisplay renders

		// --- Assert PriceDisplay Props --- 
		const priceDisplayMock = getByTestId('mock-PriceDisplay');
		const firstDataPoint = expectedMockHistory[0];
		const lastDataPoint = expectedMockHistory[expectedMockHistory.length - 1];
		const expectedPrice = lastDataPoint.value; // Assuming no hover initially
		const expectedValueChange = lastDataPoint.value - firstDataPoint.value;
		const expectedPeriodChange = ((lastDataPoint.value - firstDataPoint.value) / firstDataPoint.value) * 100;

		expect(priceDisplayMock.props.price).toBeCloseTo(expectedPrice);
		expect(priceDisplayMock.props.periodChange).toBeCloseTo(expectedPeriodChange);
		expect(priceDisplayMock.props.valueChange).toBeCloseTo(expectedValueChange);
		expect(priceDisplayMock.props.period).toBe("15m"); // Initial timeframe
		expect(priceDisplayMock.props.icon_url).toBe(mockInitialCoin.icon_url);
		expect(priceDisplayMock.props.name).toBe(mockInitialCoin.name);

		// --- Assert CoinChart Props --- 
		const coinChartMock = getByTestId('mock-CoinChart');
		expect(coinChartMock.props.data).toEqual(expectedMockHistory);
		expect(coinChartMock.props.loading).toBe(false); // Should be false after waiting
		expect(coinChartMock.props.activePoint).toBeNull(); // Initial state

		// --- Assert CoinInfo Props (already tested in detail, basic check here is ok) ---
		expect(getByTestId('mock-CoinInfo')).toBeTruthy();

		// Check for timeframe buttons (using testID from mock)
		expect(getByTestId('toggle-button-1D')).toBeTruthy();
		expect(getByTestId('toggle-button-4H')).toBeTruthy();

		// Check for "About" section title
		expect(await findByText(`About ${mockInitialCoin.name}`)).toBeTruthy();

		// Check for Trade button
		expect(getByText('Trade')).toBeTruthy();

		// Check for link icons (using mocked Text content)
		expect(await findByText('Globe')).toBeTruthy();
		expect(await findByText('Twitter')).toBeTruthy();
		expect(await findByText('MessageCircle')).toBeTruthy(); // Assuming MessageCircle maps to Telegram link
	});

	it('displays coin information correctly', async () => {
		const { findByTestId } = render(<CoinDetailScreen />);

		// Wait for initial load
		await waitFor(() => expect(mockFetchPriceHistory).toHaveBeenCalled());

		// Check that CoinInfo mock receives correct props
		const coinInfoMock = await findByTestId('mock-CoinInfo');
		expect(coinInfoMock.props.metadata).toEqual({
			name: mockInitialCoin.name,
			description: mockInitialCoin.description,
			website: mockInitialCoin.website,
			twitter: mockInitialCoin.twitter,
			telegram: mockInitialCoin.telegram,
			daily_volume: mockInitialCoin.daily_volume,
			decimals: mockInitialCoin.decimals,
			tags: mockInitialCoin.tags,
			symbol: mockInitialCoin.symbol
		});
	});

	it('does not display social/website links when not provided', async () => {
		// Use a coin object without links
		const mockCoinWithoutLinks: Coin = {
			...mockInitialCoin, // Start with base data
			website: "",
			twitter: "",
			telegram: "",
		};
		mockRoute.params.coin = mockCoinWithoutLinks; // Override route param for this test

		const { queryByText } = render(<CoinDetailScreen />);

		// Wait for initial load
		await waitFor(() => expect(mockFetchPriceHistory).toHaveBeenCalled());

		// Check that link icons are NOT present
		expect(queryByText('Globe')).toBeNull();
		expect(queryByText('Twitter')).toBeNull();
		expect(queryByText('MessageCircle')).toBeNull();
	});

	it('displays holdings information when token is in portfolio', async () => {
		const mockHolding = {
			id: mockInitialCoin.id,
			amount: 10000, // Example amount
			value: 10000 * mockInitialCoin.price, // Calculated value
			coin: mockInitialCoin,
		};
		mockUsePortfolioStore.mockReturnValue({ tokens: [mockHolding] });

		const { findByText } = render(<CoinDetailScreen />);

		// Wait for initial load
		await waitFor(() => expect(mockFetchPriceHistory).toHaveBeenCalled());

		// Check for Holdings section title
		expect(await findByText('Your Holdings')).toBeTruthy();

		// Check for displayed value (formatted to 4 decimals as in component)
		expect(await findByText(`$${mockHolding.value.toFixed(4)}`)).toBeTruthy();

		// Check for displayed quantity (formatted to 4 decimals + symbol)
		expect(await findByText(`${mockHolding.amount.toFixed(4)} ${mockInitialCoin.symbol}`)).toBeTruthy();
	});

	it('does not display holdings information when token is not in portfolio', async () => {
		// Note: beforeEach already sets tokens: []
		const { queryByText } = render(<CoinDetailScreen />);

		// Wait for initial load
		await waitFor(() => expect(mockFetchPriceHistory).toHaveBeenCalled());

		// Check that Holdings section title is NOT present
		expect(queryByText('Your Holdings')).toBeNull();
	});

	it('calls store hooks correct number of times', async () => {
		const { getByText } = render(<CoinDetailScreen />);

		// Initial render checks
		expect(mockUsePortfolioStore).toHaveBeenCalledTimes(1);
		expect(mockUseCoinStore).toHaveBeenCalledTimes(1);
		expect(mockGetCoinByID).not.toHaveBeenCalled(); // Not called yet

		// Find and press the Trade button
		const tradeButton = getByText('Trade');
		fireEvent.press(tradeButton);

		// Post-press checks
		await waitFor(() => {
			expect(mockGetCoinByID).toHaveBeenCalledTimes(1); // Called inside onPress
		});

		// Ensure hooks themselves weren't called again
		expect(mockUsePortfolioStore).toHaveBeenCalledTimes(1);
		expect(mockUseCoinStore).toHaveBeenCalledTimes(1);
	});

}); 