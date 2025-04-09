import React from 'react';
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

const mockCoinStoreReturn = {
	availableCoins: [] as Coin[],
	coinMap: {} as Record<string, Coin>,
	isLoading: false,
	error: null,
	setAvailableCoins: jest.fn(),
	setCoin: jest.fn(),
	fetchAvailableCoins: jest.fn(),
	getCoinByID: jest.fn(),
};

const mockGetCoinByID = jest.fn();
const mockFetchPriceHistory = jest.spyOn(CoinDetailScripts, 'fetchPriceHistory');
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
	name: "Solana",
	symbol: "SOL",
	icon_url: "sol_icon_url",
	decimals: 9,
	price: 200.0,
	description: "Solana Blockchain",
	website: "https://solana.com",
	twitter: "https://twitter.com/solana",
	telegram: "",
	daily_volume: 5000000000,
	tags: ["layer-1"],
	created_at: "2024-01-01T00:00:00Z",
};

const createMockComponent = (name: string) => (props: any) => {
	const React = require('react');
	const View = require('react-native').View;
	const Text = require('react-native').Text;
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

// Mock react-native-paper
jest.mock('react-native-paper', () => {
	const actualPaper = jest.requireActual('react-native-paper');
	const React = require('react'); // Require React inside the factory
	const Pressable = require('react-native').Pressable;
	const Text = require('react-native').Text;
	const View = require('react-native').View;

	// Simple Mock Button
	const MockButton = (props: any) => (
		<Pressable
			onPress={props.onPress}
			disabled={props.disabled}
			style={props.style}
			accessibilityRole="button"
			testID={props.testID || 'mock-button'}
		>
			<Text style={props.labelStyle}>{props.children}</Text>
		</Pressable>
	);

	const MockToggleButton = (props: any) => {
		const onPress = () => props.onPress ? props.onPress(props.value) : props.onValueChange(props.value);
		return (
			<Pressable onPress={onPress} testID={`toggle-button-${props.value}`}>
				{props.icon ? props.icon() : <Text>{props.value}</Text>}
			</Pressable>
		);
	}
	MockToggleButton.Row = (props: any) => {
		// Restore original mock: Map children to pass down onValueChange
		const childrenWithProps = React.Children.map(props.children, (child: any) => {
			if (React.isValidElement(child)) {
				return React.cloneElement(child, { onValueChange: props.onValueChange, value: child.props.value } as any);
			}
			return child;
		});
		return <View testID="toggle-button-row">{childrenWithProps}</View>;
	}

	const mockTheme = {
		colors: {
			primary: 'purple',
			onSurface: 'black',
			onSurfaceVariant: 'gray',
			surfaceVariant: 'whitesmoke',
			outline: 'lightgray',
		},
	};

	return {
		...actualPaper,
		ToggleButton: MockToggleButton,
		ActivityIndicator: actualPaper.ActivityIndicator,
		Text: actualPaper.Text,
		Button: MockButton,
		useTheme: () => mockTheme,
		Divider: (props: any) => <View testID="mock-divider" style={props.style} />,
		Chip: (props: any) => <View testID="mock-chip" style={props.style}><Text>{props.children}</Text></View>
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
jest.mock('lucide-react-native', () => {
	const React = require('react');
	const Text = require('react-native').Text;
	const createMockIcon = (name: string) => (props: any) => <Text {...props} testID={`icon-${name}`}>{name}</Text>;
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
		Twitter: createMockIcon('Twitter'), Copy: createMockIcon('Copy'),
	};
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
	let consoleLogSpy: jest.SpyInstance; // Declare the spy variable

	beforeEach(() => {
		jest.clearAllMocks();
		// Silence console.log
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

			// Only set loading if it's the initial load
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
			if (id === mockSolCoin.id) return mockSolCoin;
			if (id === mockInitialCoin.id) return mockInitialCoin;
			return null;
		});

		mocked(usePortfolioStore).mockReturnValue(mockPortfolioStoreReturn);
		mocked(useCoinStore).mockReturnValue(mockCoinStoreReturn);

		mockRoute.params.coin = mockInitialCoin;
	});

	// Add afterEach to restore the original console.log
	afterEach(() => {
		consoleLogSpy.mockRestore();
	});

	it('renders correctly with initial coin data', async () => {
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

		mockFetchPriceHistory.mockImplementation(
			async (timeframe, setLoading, setPriceHistory, coin, isInitialLoad) => {
				if (!coin) return;
				act(() => {
					setLoading(true);
				});
				await new Promise(resolve => setTimeout(resolve, 0));
				act(() => {
					setPriceHistory(expectedMockHistory);
					setLoading(false);
				});
			}
		);

		const { getByText, findByText, getByTestId } = render(
			<CoinDetailScreen />
		);

		await waitFor(() => expect(getByTestId('mock-PriceDisplay')).toBeTruthy());

		const priceDisplayMock = getByTestId('mock-PriceDisplay');
		const firstDataPoint = expectedMockHistory[0];
		const lastDataPoint = expectedMockHistory[expectedMockHistory.length - 1];
		const expectedPrice = lastDataPoint.value;
		const expectedValueChange = lastDataPoint.value - firstDataPoint.value;
		const expectedPeriodChange = ((lastDataPoint.value - firstDataPoint.value) / firstDataPoint.value) * 100;

		expect(priceDisplayMock.props.price).toBeCloseTo(expectedPrice);
		expect(priceDisplayMock.props.periodChange).toBeCloseTo(expectedPeriodChange);
		expect(priceDisplayMock.props.valueChange).toBeCloseTo(expectedValueChange);
		expect(priceDisplayMock.props.period).toBe("15m");
		expect(priceDisplayMock.props.icon_url).toBe(mockInitialCoin.icon_url);
		expect(priceDisplayMock.props.name).toBe(mockInitialCoin.name);

		const coinChartMock = getByTestId('mock-CoinChart');
		expect(coinChartMock.props.data).toEqual(expectedMockHistory);
		expect(coinChartMock.props.loading).toBe(false);
		expect(coinChartMock.props.activePoint).toBeNull();

		expect(getByTestId('mock-CoinInfo')).toBeTruthy();

		expect(getByTestId('toggle-button-1D')).toBeTruthy();
		expect(getByTestId('toggle-button-4H')).toBeTruthy();

		expect(await findByText(`About ${mockInitialCoin.name}`)).toBeTruthy();

		expect(getByText('Trade')).toBeTruthy();
	});

	it('displays coin information correctly', async () => {
		const { findByTestId, findByText } = render(<CoinDetailScreen />);

		await waitFor(() => expect(mockFetchPriceHistory).toHaveBeenCalled());

		const coinInfoMock = await findByTestId('mock-CoinInfo');
		expect(coinInfoMock.props.metadata).toEqual({
			name: mockInitialCoin.name,
			description: mockInitialCoin.description,
			website: mockInitialCoin.website,
			twitter: mockInitialCoin.twitter,
			telegram: mockInitialCoin.telegram,
			daily_volume: mockInitialCoin.daily_volume,
			tags: mockInitialCoin.tags,
			symbol: mockInitialCoin.symbol
		});
	});

	it('does not display social/website links when not provided', async () => {
		const mockCoinWithoutLinks: Coin = {
			...mockInitialCoin,
			website: "",
			twitter: "",
			telegram: "",
		};
		mockRoute.params.coin = mockCoinWithoutLinks;

		const { queryByText, findByTestId, queryByTestId } = render(<CoinDetailScreen />);

		await waitFor(() => expect(mockFetchPriceHistory).toHaveBeenCalled());

		const coinInfoMock = await findByTestId('mock-CoinInfo');
		expect(coinInfoMock.props.metadata).toEqual({
			name: mockCoinWithoutLinks.name,
			description: mockCoinWithoutLinks.description,
			website: "",
			twitter: "",
			telegram: "",
			daily_volume: mockCoinWithoutLinks.daily_volume,
			tags: mockCoinWithoutLinks.tags,
			symbol: mockCoinWithoutLinks.symbol
		});
	});

	it('displays holdings information when token is in portfolio', async () => {
		const mockHolding: PortfolioToken = {
			id: mockInitialCoin.id,
			amount: 10000,
			value: 10000 * mockInitialCoin.price,
			coin: mockInitialCoin,
			price: mockInitialCoin.price,
		};

		mockPortfolioStoreReturn.tokens = [mockHolding];

		const { findByText } = render(<CoinDetailScreen />);

		await waitFor(() => expect(mockFetchPriceHistory).toHaveBeenCalled());

		expect(await findByText('Your Holdings')).toBeTruthy();

		expect(await findByText(`$${mockHolding.value.toFixed(4)}`)).toBeTruthy();

		expect(await findByText(`${mockHolding.amount.toFixed(4)} ${mockInitialCoin.symbol}`)).toBeTruthy();
	});

	it('does not display holdings information when token is not in portfolio', async () => {
		const { queryByText } = render(<CoinDetailScreen />);

		await waitFor(() => expect(mockFetchPriceHistory).toHaveBeenCalled());

		expect(queryByText('Your Holdings')).toBeNull();
	});

	it('calls store hooks correct number of times', async () => {
		const { getByText } = render(<CoinDetailScreen />);

		expect(mocked(usePortfolioStore)).toHaveBeenCalledTimes(1);
		expect(mocked(useCoinStore)).toHaveBeenCalledTimes(1);
		expect(mockCoinStoreReturn.getCoinByID).not.toHaveBeenCalled();

		const tradeButton = getByText('Trade');
		fireEvent.press(tradeButton);

		await waitFor(() => {
			// we shouldn't call any extra
			expect(mockCoinStoreReturn.getCoinByID).not.toHaveBeenCalled()
		});
	});

	it('navigates to Trade screen with correct parameters on Trade button press', async () => {
		const { getByText } = render(<CoinDetailScreen />);

		await waitFor(() => expect(mockFetchPriceHistory).toHaveBeenCalled());

		const tradeButton = getByText('Trade');
		fireEvent.press(tradeButton);

		await waitFor(() => {
			expect(mockGetCoinByID).not.toHaveBeenCalled();
		});

		expect(mockedHandleTradeNavigation).toHaveBeenCalledTimes(1);
		expect(mockedHandleTradeNavigation).toHaveBeenCalledWith(
			mockInitialCoin,
			null,
			mockShowToast,
			mockNavigate
		);
	});

	it('calls fetchPriceHistory with correct arguments on timeframe change', async () => {
		const { getByTestId } = render(<CoinDetailScreen />);

		// 1. Wait for the initial fetch to complete and verify it was called with initial load true
		await waitFor(() => {
			expect(mockFetchPriceHistory).toHaveBeenCalledWith(
				'15m',
				expect.any(Function),
				expect.any(Function),
				mockInitialCoin,
				true
			);
		});

		// Wait for state updates to complete
		await act(async () => {
			await new Promise(resolve => setTimeout(resolve, 100));
		});

		// 2. Clear mocks AFTER initial load to focus on the click trigger
		mockFetchPriceHistory.mockClear();

		// 3. Find and press the '1D' button
		const button1D = getByTestId('toggle-button-1D');
		fireEvent.press(button1D);

		// 4. Wait for the new fetch triggered by the press
		await waitFor(() => expect(mockFetchPriceHistory).toHaveBeenCalledTimes(1));

		// 5. Assert the arguments of the call
		expect(mockFetchPriceHistory).toHaveBeenCalledWith(
			'1D',                 // Expected timeframe
			expect.any(Function), // setLoading state setter
			expect.any(Function), // setPriceHistory state setter
			mockInitialCoin,      // The coin object
			false                 // isInitialLoad should be false since priceHistory is not empty
		);
	});
}); 
