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

jest.mock('./coindetail_scripts', () => {
	const originalModule = jest.requireActual('./coindetail_scripts');
	return {
		...originalModule,
		fetchPriceHistory: jest.fn(),
		handleTradeNavigation: jest.fn(),
	};
});

describe('CoinDetail Screen', () => {
	const mockedHandleTradeNavigation = handleTradeNavigation as jest.Mock;
	let consoleLogSpy: jest.SpyInstance;

	beforeEach(() => {
		jest.clearAllMocks();
		consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
		mockedHandleTradeNavigation.mockClear();

		mockPortfolioStoreReturn.tokens = [];
		Object.values(mockPortfolioStoreReturn).forEach(mockFn => {
			if (jest.isMockFunction(mockFn)) {
				mockFn.mockClear();
			}
		});
		Object.values(mockCoinStoreReturn).forEach(mockFn => {
			if (jest.isMockFunction(mockFn)) {
				mockFn.mockClear();
			}
		});
		mockGetCoinByID.mockClear();
		mockFetchPriceHistory.mockClear();

		// Reset mockFetchPriceHistory implementation
		mockFetchPriceHistory.mockImplementation(async (timeframe, setLoading, setPriceHistory, coin, isInitialLoad) => {
			if (!coin) return;

			if (isInitialLoad) {
				act(() => {
					setLoading(true);
				});
			}

			await new Promise(resolve => setTimeout(resolve, 10));

			const now = Date.now();
			const pastUnix = Math.floor((now - 100000) / 1000);
			const nowUnix = Math.floor(now / 1000);

			act(() => {
				setPriceHistory([
					{
						timestamp: new Date(pastUnix * 1000).toISOString(),
						value: coin.price * 0.98,
						unixTime: pastUnix
					},
					{
						timestamp: new Date(nowUnix * 1000).toISOString(),
						value: coin.price,
						unixTime: nowUnix
					}
				]);
				if (isInitialLoad) {
					setLoading(false);
				}
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

	it('renders and displays coin information correctly', async () => {
		const now = Date.now();
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

		// Test with no social links
		const mockCoinWithoutLinks: Coin = {
			...mockInitialCoin,
			website: "",
			twitter: "",
			telegram: "",
		};
		mockRoute.params.coin = mockCoinWithoutLinks;

		const { getByText, findByText, getByTestId, queryByText } = render(
			<CoinDetailScreen />
		);

		await waitFor(() => expect(getByTestId('mock-PriceDisplay')).toBeTruthy());

		// Verify price display
		const priceDisplayMock = getByTestId('mock-PriceDisplay');
		const lastDataPoint = expectedMockHistory[expectedMockHistory.length - 1];
		const firstDataPoint = expectedMockHistory[0];
		const expectedPrice = lastDataPoint.value;
		const expectedValueChange = lastDataPoint.value - firstDataPoint.value;
		const expectedPeriodChange = ((lastDataPoint.value - firstDataPoint.value) / firstDataPoint.value) * 100;

		expect(priceDisplayMock.props.price).toBeCloseTo(expectedPrice);
		expect(priceDisplayMock.props.periodChange).toBeCloseTo(expectedPeriodChange);
		expect(priceDisplayMock.props.valueChange).toBeCloseTo(expectedValueChange);
		expect(priceDisplayMock.props.period).toBe("15m");
		expect(priceDisplayMock.props.iconUrl).toBe(mockCoinWithoutLinks.iconUrl);
		expect(priceDisplayMock.props.name).toBe(mockCoinWithoutLinks.name);

		// Verify chart
		const coinChartMock = getByTestId('mock-CoinChart');
		expect(coinChartMock.props.data).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					timestamp: expect.any(String),
					unixTime: expect.any(Number),
					value: expectedMockHistory[0].value,
				}),
				expect.objectContaining({
					timestamp: expect.any(String),
					unixTime: expect.any(Number),
					value: expectedMockHistory[1].value,
				}),
			])
		);
		expect(coinChartMock.props.loading).toBe(false);
		expect(coinChartMock.props.activePoint).toBeNull();

		// Verify coin info
		const coinInfoMock = getByTestId('mock-CoinInfo');
		const mockCoinMetadata = {
			name: mockCoinWithoutLinks.name,
			description: mockCoinWithoutLinks.description,
			website: mockCoinWithoutLinks.website,
			twitter: mockCoinWithoutLinks.twitter,
			telegram: mockCoinWithoutLinks.telegram,
			dailyVolume: mockCoinWithoutLinks.dailyVolume,
			tags: mockCoinWithoutLinks.tags,
			symbol: mockCoinWithoutLinks.symbol
		};
		expect(coinInfoMock.props.metadata).toEqual(mockCoinMetadata);

		// Verify no holdings info is shown when not in portfolio
		expect(queryByText('Your Holdings')).toBeNull();

		// Verify store hooks are called
		expect(usePortfolioStore).toHaveBeenCalled();
		expect(useCoinStore).toHaveBeenCalled();
		expect(mockCoinStoreReturn.getCoinByID).not.toHaveBeenCalled();
	});

	it('handles portfolio integration and trading correctly', async () => {
		// Setup portfolio holding
		const mockHolding = {
			mintAddress: mockInitialCoin.mintAddress,
			amount: 100,
			value: 15000,
			coin: mockInitialCoin,
			price: 150.0
		};
		mockPortfolioStoreReturn.tokens = [mockHolding];

		const { findByText, getByText, getByTestId } = render(<CoinDetailScreen />); // Add getByTestId

		await waitFor(() => expect(mockFetchPriceHistory).toHaveBeenCalled());

		// Verify holdings display
		expect(await findByText('Your Holdings')).toBeTruthy();
		expect(await findByText(`$${mockHolding.value.toFixed(4)}`)).toBeTruthy();
		expect(await findByText(`${mockHolding.amount.toFixed(4)} ${mockInitialCoin.symbol}`)).toBeTruthy();

		// Test trade navigation
		const tradeButton = getByTestId('trade-button'); // Use getByTestId
		fireEvent.press(tradeButton);

		await waitFor(() => {
			expect(mockGetCoinByID).not.toHaveBeenCalled();
			expect(mockedHandleTradeNavigation).toHaveBeenCalledTimes(1);
			expect(mockedHandleTradeNavigation).toHaveBeenCalledWith(
				mockInitialCoin,
				null,
				mockShowToast,
				mockNavigate
			);
		});
	});

	it('handles timeframe changes correctly', async () => {
		const { getByText } = render(<CoinDetailScreen />);

		// Verify initial timeframe fetch
		await waitFor(() => {
			expect(mockFetchPriceHistory).toHaveBeenCalledWith(
				'FIFTEEN_MINUTE',
				expect.any(Function),
				expect.any(Function),
				mockInitialCoin,
				true
			);
		});

		await act(async () => {
			await new Promise(resolve => setTimeout(resolve, 100));
		});

		mockFetchPriceHistory.mockClear();

		// Test timeframe change
		const button1D = getByText('1D');
		fireEvent.press(button1D);

		await waitFor(() => expect(mockFetchPriceHistory).toHaveBeenCalledTimes(1));

		expect(mockFetchPriceHistory).toHaveBeenCalledWith(
			'ONE_DAY',
			expect.any(Function),
			expect.any(Function),
			mockInitialCoin,
			false
		);
	});
}); 
