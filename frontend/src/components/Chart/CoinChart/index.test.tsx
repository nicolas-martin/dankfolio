import { render, screen } from '@testing-library/react-native';
import CoinChart from './index';

// Mock logger to avoid console noise during tests
jest.mock('@/utils/logger', () => ({
	logger: {
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	},
}));

// Mock @shopify/react-native-skia and other UI related modules
jest.mock('@shopify/react-native-skia', () => ({
	useFont: jest.fn().mockReturnValue(null),
	Skia: {
		Path: {
			Make: jest.fn(() => ({
				moveTo: jest.fn(),
				lineTo: jest.fn(),
				close: jest.fn(),
				interpolate: jest.fn(),
			})),
		},
	},
	Path: jest.fn(),
	Circle: jest.fn(() => null),
	Line: jest.fn(() => null), // This is Skia's Line
	Text: jest.fn(() => null), // This is Skia's Text
}));

jest.mock('victory-native', () => {
	const RNView = jest.requireActual('react-native').View;
	return {
		CartesianChart: jest.fn(({ data, children, renderOutside, ...props }) => (
			<RNView {...props} testID="mock-cartesian-chart" data-points={JSON.stringify(data)}>
				{children && children({ points: { y: data.map((d: any) => ({ x: d.x, y: d.y })) }, chartBounds: { bottom: 0, top: 100, left: 0, right: 100 } })}
				{renderOutside && renderOutside({ chartBounds: { bottom: 0, top: 100, left: 0, right: 100 } })}
			</RNView>
		)),
		useChartPressState: jest.fn(() => ({
			state: { x: { value: { value: 0 }, position: { value: 0 } }, y: { y: { value: { value: 0 }, position: { value: 0 } } } },
			isActive: false
		})),
		Area: jest.fn(() => <RNView testID="mock-area" />),
		Line: jest.fn(() => <RNView testID="mock-line" />), // This is victory-native's Line
	};
});

jest.mock('react-native-reanimated', () => {
	const actualReanimated = jest.requireActual('react-native-reanimated/mock');
	return {
		...actualReanimated,
		useDerivedValue: jest.fn((fn) => {
			const sharedValueMock = { value: fn() };
			return sharedValueMock;
		}),
		runOnJS: jest.fn((fn) => fn),
		cancelAnimation: jest.fn(),
	};
});

jest.mock('expo-haptics', () => ({
	impactAsync: jest.fn(),
	ImpactFeedbackStyle: {
		Light: 'Light',
	}
}));

jest.mock('@react-navigation/native', () => ({
	useFocusEffect: jest.fn((callback) => callback()),
}));


// Mock the Zustand store - No longer needed as component doesn't use it
// const mockGetCache = jest.fn();
// const mockSetCache = jest.fn();
// const mockClearExpiredCache = jest.fn();

// const actualStore = jest.requireActual('@/store/priceHistoryCache').default;
// const originalStoreState = actualStore.getState();


interface PricePoint {
	timestamp: string;
	price: number;
	value: number;
	x: number;
	y: number;
}

// const mockFetchPriceHistory = jest.fn(); // No longer a prop

// Updated defaultProps for the reverted component
const defaultProps = {
	data: [],
	loading: true,
	onHover: jest.fn(),
};

const sampleData1: PricePoint[] = [ // This can still be used for providing data to the 'data' prop
	{ timestamp: new Date(1000000).toISOString(), price: 100, value: 100, x: 1000000, y: 100 },
	{ timestamp: new Date(2000000).toISOString(), price: 102, value: 102, x: 2000000, y: 102 },
];

const sampleData2: PricePoint[] = [
	{ timestamp: new Date(1000000).toISOString(), price: 200, value: 200, x: 1000000, y: 200 },
	{ timestamp: new Date(2000000).toISOString(), price: 202, value: 202, x: 2000000, y: 202 },
];


describe('CoinChart Basic Rendering', () => { // Renamed describe block
	beforeEach(() => {
		jest.clearAllMocks();
		// No need to mock usePriceHistoryCacheStore anymore
		// jest.useFakeTimers(); // Still useful if any part of component uses timers, but not for caching
	});

	afterEach(() => {
		// jest.useRealTimers();
	});

	it('should render loading state when loading is true', () => {
		render(<CoinChart {...defaultProps} loading={true} data={[]} />);
		expect(screen.getByTestId('loading-text')).toBeTruthy();
	});

	it('should render loading state when data is empty (even if loading is false)', () => {
		// This behavior (showing loading when data is empty) was part of the original component logic
		render(<CoinChart {...defaultProps} loading={false} data={[]} />);
		expect(screen.getByTestId('loading-text')).toBeTruthy();
	});

});
