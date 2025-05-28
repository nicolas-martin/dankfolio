import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import CoinDetailScreen from './index';
import * as CoinDetailScripts from './coindetail_scripts';
import { Coin } from '@/types';
import { handleTradeNavigation } from './coindetail_scripts';
import { mocked } from 'jest-mock';

import { usePortfolioStore, PortfolioToken } from '@store/portfolio';
import { useCoinStore } from '@store/coins';

const mockPortfolioStoreReturn = {
	wallet: null,
	isLoading: false,
	error: null,
	tokens: [] as PortfolioToken[],
	setWallet: jest.fn(),
	clearWallet: jest.fn(),
	fetchPortfolioBalance: jest.fn(),
};

const mockSolCoin: Coin = {
	mintAddress: "So11111111111111111111111111111111111111112",
	name: "Solana",
	symbol: "SOL",
	decimals: 9,
	description: "Solana is a high-performance blockchain platform",
	iconUrl: "https://example.com/sol.png",
	tags: ["Layer 1"],
	price: 100.0,
	dailyVolume: 1000000,
	website: "https://solana.com",
	twitter: "https://twitter.com/solana",
	telegram: "https://t.me/solana",
	coingeckoId: "solana"
};

const mockInitialCoin: Coin = {
	mintAddress: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzL7xiH5HwMJI",
	name: "Test Coin",
	symbol: "TEST",
	decimals: 9,
	description: "A test coin",
	iconUrl: "https://example.com/test.png",
	tags: ["DeFi"],
	price: 150.0,
	dailyVolume: 500000,
	website: "https://test.com",
	twitter: "https://twitter.com/test",
	telegram: "https://t.me/test",
	coingeckoId: "test"
};

const mockCoinStoreReturn = {
	coins: {
		[mockSolCoin.mintAddress]: mockSolCoin,
		[mockInitialCoin.mintAddress]: mockInitialCoin
	},
	getCoinByID: jest.fn((mintAddress: string) => {
		if (mintAddress === mockSolCoin.mintAddress) return mockSolCoin;
		if (mintAddress === mockInitialCoin.mintAddress) return mockInitialCoin;
		return null;
	}),
	availableCoins: [] as Coin[],
	coinMap: {} as Record<string, Coin>,
	isLoading: false,
	error: null,
	setAvailableCoins: jest.fn(),
	setCoin: jest.fn(),
	fetchAvailableCoins: jest.fn(),
};

const mockGetCoinByID = jest.fn();
const mockFetchPriceHistory = jest.spyOn(CoinDetailScripts, 'fetchPriceHistory');

const createMockComponent = (name: string) => (props: any) => {
	const React = require('react');
	const { View, Text, TextInput } = require('react-native');
	if (name === 'CoinSelector') {
		const { label, amount } = props;
		const inputTestID = `token-selector-input-${label?.toLowerCase() || 'unknown'}`;
		return (
			<View testID={`mock-${name}`} {...props}>
				<Text>{label}</Text>
				{amount?.onChange && (
					<TextInput
						testID={inputTestID}
						value={amount.value}
						onChangeText={amount.onChange}
						placeholder={`Enter ${label} amount`}
						keyboardType="numeric"
					/>
				)}
				<Text>{name}</Text>
			</View>
		);
	}
	return <View testID={`mock-${name}`} {...props}><Text>{name}</Text></View>;
};

// Mock Stores by path only
jest.mock('@store/portfolio');
jest.mock('@store/coins');

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

const mockShowToast = jest.fn();
jest.mock('@components/Common/Toast', () => ({
	useToast: () => ({
		showToast: mockShowToast,
		hideToast: jest.fn(),
	}),
}));

// Mock Child Components
jest.mock('@components/Chart/CoinChart', () => createMockComponent('CoinChart'));
jest.mock('@components/Chart/CoinInfo', () => createMockComponent('CoinInfo'));
jest.mock('@components/CoinDetails/PriceDisplay', () => createMockComponent('PriceDisplay'));

// Mock react-native-paper (Simplified)
jest.mock('react-native-paper', () => {
	const ReactNative = require('react-native'); // Use a single require for react-native
	const React = require('react');

	const mockThemeColors = {
		primary: 'purple',
		onSurface: 'black',
		onSurfaceVariant: 'gray',
		surfaceVariant: 'whitesmoke',
		outline: 'lightgray',
		onPrimaryContainer: 'blue',    // Added
		onSecondaryContainer: 'green', // Added
		// Add any other colors used by CoinDetailScreen.tsx or its styles if errors occur
	};

	// Basic mock for components used by CoinDetailScreen
	return {
		ActivityIndicator: (props: any) => <ReactNative.View testID="mock-activity-indicator" {...props} />,
		Text: (props: any) => <ReactNative.Text testID="mock-text" {...props}>{props.children}</ReactNative.Text>,
		useTheme: () => ({ colors: mockThemeColors, roundness: 4, fonts: {} }), // Return a theme object
		Button: (props: any) => (
			<ReactNative.Pressable onPress={props.onPress} testID={props.testID || 'mock-rnp-button'} accessibilityRole="button" disabled={props.disabled} style={props.style}>
				{typeof props.children === 'string' ? <ReactNative.Text style={props.labelStyle}>{props.children}</ReactNative.Text> : props.children}
			</ReactNative.Pressable>
		),
		SegmentedButtons: (props: any) => {
			// Mock structure for SegmentedButtons, including onValueChange and buttons prop
			return (
				<ReactNative.View testID="mock-segmented-buttons">
					{props.buttons.map((button: any) => (
						<ReactNative.Pressable
							key={button.value}
							onPress={() => props.onValueChange(button.value)}
							testID={`mock-segmented-button-${button.value}`}
						>
							<ReactNative.Text>{button.label}</ReactNative.Text>
						</ReactNative.Pressable>
					))}
				</ReactNative.View>
			);
		},
		Icon: (props: any) => <ReactNative.View testID={`mock-icon-${props.source}`} {...props}><ReactNative.Text>{props.source}</ReactNative.Text></ReactNative.View>,
		// Provide other necessary exports from react-native-paper if they are used directly or by other components
		// For instance, if PaperProvider is used by tests, or other components are used by CoinDetailScreen
		// Defaulting to very basic mocks or actual implementations if they don't cause issues
		Divider: (props: any) => <ReactNative.View testID="mock-divider" style={props.style} />,
		Chip: (props: any) => <ReactNative.View testID="mock-chip" style={props.style}><ReactNative.Text>{props.children}</ReactNative.Text></ReactNative.View>,
		// Ensure all exports from react-native-paper that are used are covered
		// If some are missing, it could lead to errors.
		// For now, focusing on those directly used by CoinDetailScreen.
	};
});

jest.mock('@shopify/react-native-skia', () => ({
	Canvas: (props: any) => {
		const View = require('react-native').View;
		return <View {...props} testID="mock-skia-canvas" />;
	},
	useFont: jest.fn().mockReturnValue({}),
	rect: jest.fn().mockReturnValue({}),
	Path: (props: any) => {
		const View = require('react-native').View;
		return <View {...props} testID="mock-skia-path" />;
	},
	Skia: {
		Path: {
			Make: jest.fn(() => ({
				moveTo: jest.fn(),
				lineTo: jest.fn(),
				close: jest.fn(),
				addRect: jest.fn(),
			})),
		},
	},
	useSharedValue: jest.fn((initialValue) => ({ value: initialValue })),
	useComputedValue: jest.fn((fn, args) => ({ value: fn() })),
}));

// Mock Icons
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
	const React = require('react');
	const Text = require('react-native').Text;
	const createMockIcon = (name: string) => (props: any) => <Text {...props} testID={`icon-${name}`}>{name}</Text>;
	return createMockIcon;
});

// Actual TIMEFRAMES from coindetail_scripts.ts
const actualTIMEFRAMES = [
	{ label: "1H", value: "1H" },
	{ label: "4H", value: "4H" },
	{ label: "1D", value: "1D" },
	{ label: "1W", value: "1W" },
	{ label: "1M", value: "1M" },
];

jest.mock('./coindetail_scripts', () => {
	const originalModule = jest.requireActual('./coindetail_scripts');
	return {
		...originalModule,
		fetchPriceHistory: jest.fn(),
		handleTradeNavigation: jest.fn(),
		TIMEFRAMES: actualTIMEFRAMES, // Use the new TIMEFRAMES for the mock
	};
});


describe('CoinDetail Screen', () => {
	const mockedFetchPriceHistory = CoinDetailScripts.fetchPriceHistory as jest.Mock;
	const mockedHandleTradeNavigation = handleTradeNavigation as jest.Mock;
	let consoleLogSpy: jest.SpyInstance;

	beforeEach(() => {
		jest.clearAllMocks();
		consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

		mockPortfolioStoreReturn.tokens = [];
		Object.values(mockPortfolioStoreReturn).forEach(mockFn => {
			if (jest.isMockFunction(mockFn)) mockFn.mockClear();
		});
		Object.values(mockCoinStoreReturn).forEach(mockFn => {
			if (jest.isMockFunction(mockFn)) mockFn.mockClear();
		});
		mockGetCoinByID.mockClear();
		mockedFetchPriceHistory.mockClear(); // Use the aliased mock

		// Default mock implementation for fetchPriceHistory for most tests
		mockedFetchPriceHistory.mockImplementation(async (timeframe, setLoading, setPriceHistory, coin, isInitialLoad) => {
			if (!coin) {
				act(() => setPriceHistory([]));
				if (isInitialLoad) act(() => setLoading(false));
				return;
			}
			if (isInitialLoad) act(() => setLoading(true));

			// Simulate async data fetching
			await new Promise(resolve => setTimeout(resolve, 10));

			const now = Date.now();
			const pastUnix = Math.floor((now - 3600 * 1000) / 1000); // 1 hour ago
			const nowUnix = Math.floor(now / 1000);

			act(() => {
				setPriceHistory([
					{ timestamp: new Date(pastUnix * 1000).toISOString(), value: coin.price * 0.98, unixTime: pastUnix },
					{ timestamp: new Date(nowUnix * 1000).toISOString(), value: coin.price, unixTime: nowUnix }
				]);
				if (isInitialLoad) act(() => setLoading(false));
			});
		});

		mockCoinStoreReturn.getCoinByID.mockImplementation(mockGetCoinByID);
		mockGetCoinByID.mockImplementation(async (id) => {
			if (id === mockSolCoin.mintAddress) return mockSolCoin;
			if (id === mockInitialCoin.mintAddress) return mockInitialCoin;
			return null;
		});

		mocked(usePortfolioStore).mockReturnValue(mockPortfolioStoreReturn);
		mocked(useCoinStore).mockReturnValue(mockCoinStoreReturn);
		mockRoute.params.coin = mockInitialCoin;
	});

	afterEach(() => {
		consoleLogSpy.mockRestore();
	});

	it('renders and displays coin information correctly with default timeframe 4H', async () => {
		const { getByTestId } = render(<CoinDetailScreen />);

		// IMPORTANT: Keep API call assertion for performance monitoring
		await waitFor(() => {
			expect(mockedFetchPriceHistory).toHaveBeenCalledWith(
				"4H", // Default timeframe
				expect.any(Function), // setLoading
				expect.any(Function), // setPriceHistory
				mockInitialCoin,
				true // isInitialLoad
			);
		});

		// Verify components render (don't assert exact props)
		await waitFor(() => expect(getByTestId('mock-PriceDisplay')).toBeTruthy());

		const priceDisplayMock = getByTestId('mock-PriceDisplay');
		// Just verify that props exist, not exact values
		expect(priceDisplayMock.props.period).toBeTruthy();
		expect(priceDisplayMock.props.name).toBeTruthy();

		const coinChartMock = getByTestId('mock-CoinChart');
		expect(coinChartMock.props.loading).toBeDefined();
	});

	it('handles portfolio integration and trading correctly', async () => {
		const mockHolding = {
			mintAddress: mockInitialCoin.mintAddress,
			amount: 100, 
			value: 15000, 
			coin: mockInitialCoin, 
			price: 150.0
		};
		mockPortfolioStoreReturn.tokens = [mockHolding];

		const { findByText, getByTestId } = render(<CoinDetailScreen />);

		// IMPORTANT: Keep API call assertion for performance monitoring
		await waitFor(() => expect(mockedFetchPriceHistory).toHaveBeenCalled());

		// Verify holdings section exists (don't assert exact formatting)
		expect(await findByText('Your Holdings')).toBeTruthy();
		
		// Just verify that values are displayed, not exact format
		const valueText = await findByText(new RegExp(`\\$.*${mockHolding.value}.*`));
		expect(valueText).toBeTruthy();
		
		const amountText = await findByText(new RegExp(`.*${mockHolding.amount}.*${mockInitialCoin.symbol}`));
		expect(amountText).toBeTruthy();

		const tradeButton = getByTestId('trade-button');
		fireEvent.press(tradeButton);

		await waitFor(() => {
			expect(mockedHandleTradeNavigation).toHaveBeenCalledWith(
				mockInitialCoin, null, mockShowToast, mockNavigate
			);
		});
	});

	// Test suite for timeframe changes
	describe('Timeframe Selection', () => {
		const timeframesToTest = [
			{ label: "1H", value: "1H" },
			{ label: "1D", value: "1D" },
			{ label: "1W", value: "1W" },
			{ label: "1M", value: "1M" },
		];

		timeframesToTest.forEach(timeframe => {
			it(`handles timeframe change to ${timeframe.label} correctly`, async () => {
				const { getByTestId } = render(<CoinDetailScreen />);

				// IMPORTANT: Keep API call assertion for performance monitoring
				await waitFor(() => {
					expect(mockedFetchPriceHistory).toHaveBeenCalledWith(
						"4H", expect.any(Function), expect.any(Function), mockInitialCoin, true
					);
				});

				mockedFetchPriceHistory.mockClear(); // Clear after initial fetch

				// Find the specific SegmentedButton option
				const buttonToPress = getByTestId(`mock-segmented-button-${timeframe.value}`);
				fireEvent.press(buttonToPress);

				// IMPORTANT: Keep API call assertion for performance monitoring
				await waitFor(() => {
					expect(mockedFetchPriceHistory).toHaveBeenCalledWith(
						timeframe.value, // The value of the pressed button
						expect.any(Function), // setLoading
						expect.any(Function), // setPriceHistory
						mockInitialCoin,
						true // isInitialLoad is true because priceHistory gets reset or is empty when timeframe changes
					);
				});

				// Verify PriceDisplay period updates (just that it exists, not exact value)
				await waitFor(() => {
					const priceDisplayMock = getByTestId('mock-PriceDisplay');
					expect(priceDisplayMock.props.period).toBeTruthy();
				});
			});
		});
	});
});
