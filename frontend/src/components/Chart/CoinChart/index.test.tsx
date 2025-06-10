import { render, screen, fireEvent } from '@testing-library/react-native';
import CoinChart from './index';
import { CHART_COLORS, determineChartColor, getTimeFormat } from './scripts';
import { CHART_CONSTANTS } from './styles';

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
	useFont: jest.fn().mockReturnValue({
		measureText: jest.fn().mockReturnValue({ width: 50, height: 12 })
	}),
	Skia: {
		Path: {
			Make: jest.fn(() => ({
				moveTo: jest.fn(),
				lineTo: jest.fn(),
				close: jest.fn(),
				interpolate: jest.fn(),
				addPath: jest.fn(),
			})),
		},
	},
import type { ViewProps } from 'react-native'; // Import ViewProps
import React from 'react'; // Import React for ReactNode

// ... (other imports)

// Mock @shopify/react-native-skia and other UI related modules
// ... (existing mock setup)
	Path: jest.fn(({ children, ...props }: { children?: React.ReactNode } & Omit<ViewProps, 'children'>) => {
		const RNView = jest.requireActual('react-native').View;
		return <RNView {...props} testID="mock-skia-path">{children}</RNView>;
	}),
	Circle: jest.fn((props: ViewProps) => { // Assuming Circle props are similar to ViewProps for the mock
		const RNView = jest.requireActual('react-native').View;
		return <RNView {...props} testID="mock-skia-circle" />;
	}),
	Line: jest.fn((props: ViewProps) => { // Assuming Line props are similar to ViewProps for the mock
		const RNView = jest.requireActual('react-native').View;
		return <RNView {...props} testID="mock-skia-line" />;
	}),
	Text: jest.fn((props: ViewProps) => { // Assuming Text props are similar to ViewProps for the mock
		const RNView = jest.requireActual('react-native').View;
		return <RNView {...props} testID="mock-skia-text" />;
	}),
	Group: jest.fn(({ children, ...props }: { children?: React.ReactNode } & Omit<ViewProps, 'children'>) => {
		const RNView = jest.requireActual('react-native').View;
		return <RNView {...props} testID="mock-skia-group">{children}</RNView>;
	}),
	LinearGradient: jest.fn(({ children, ...props }: { children?: React.ReactNode } & Omit<ViewProps, 'children'>) => {
		const RNView = jest.requireActual('react-native').View;
		return <RNView {...props} testID="mock-linear-gradient">{children}</RNView>;
	}),
	vec: jest.fn((x: number, y: number) => ({ x, y })), // Added types for x and y
}));

interface MockChartPoint { x: number; y: number; }
interface MockChartBounds { bottom: number; top: number; left: number; right: number; }
interface MockChartPressStateItemValue { value: number; }
interface MockChartPressStateItem { value: MockChartPressStateItemValue; position?: MockChartPressStateItemValue } // position is optional based on usage
interface MockChartPressState {
	x: MockChartPressStateItem;
	y: { y: MockChartPressStateItem }; // Nested 'y' seems specific to this mock's structure
}
interface CartesianChartRenderProps {
	points: { y: MockChartPoint[] }; // Assuming points.y is the structure
	chartBounds: MockChartBounds;
}
interface CartesianChartProps extends Omit<ViewProps, 'children' | 'data'> {
	data: MockChartPoint[];
	children?: React.ReactNode | ((opts: CartesianChartRenderProps) => React.ReactNode);
	renderOutside?: (opts: { chartBounds: MockChartBounds }) => React.ReactNode;
	chartPressState?: [MockChartPressState]; // Array with one item based on usage
}


// Enhanced victory-native mock with better interaction support
jest.mock('victory-native', () => {
	const RNView = jest.requireActual('react-native').View;
	return {
		CartesianChart: jest.fn(({ data, children, renderOutside, chartPressState, ...props }: CartesianChartProps) => {
			const mockChartBounds: MockChartBounds = { bottom: 250, top: 0, left: 0, right: 300 };
			const mockPoints = { y: data.map((d: MockChartPoint) => ({ x: d.x, y: d.y })) };
			
			return (
				<RNView 
					{...props} 
					testID="mock-cartesian-chart" 
					data-points={JSON.stringify(data)}
					data-chart-bounds={JSON.stringify(mockChartBounds)}
					onTouchStart={() => {
						// Simulate chart press activation
						if (chartPressState && chartPressState[0]) {
							chartPressState[0].x.value.value = 150; // Middle of chart
							if (chartPressState[0].y && chartPressState[0].y.y) { // Added null check for y.y
								chartPressState[0].y.y.value.value = 125; // Middle height
							}
						}
					}}
				>
					{typeof children === 'function' ? children({ points: mockPoints, chartBounds: mockChartBounds }) : children}
					{renderOutside && renderOutside({ chartBounds: mockChartBounds })}
				</RNView>
			);
		}),
		useChartPressState: jest.fn((_initialState: unknown) => ({ // initialState marked as unused and typed
			state: {
				x: { 
					value: { value: 0 }, 
					position: { value: 0 } 
				}, 
				y: { 
					y: { 
						value: { value: 0 }, 
						position: { value: 0 } 
					} 
				} 
			},
			isActive: false
		})),
		useLinePath: jest.fn(() => ({ // Return type of useLinePath can be more specific if known
			path: {
				addPath: jest.fn(),
				lineTo: jest.fn(),
				close: jest.fn(),
			}
		})),
		Area: jest.fn(() => <RNView testID="mock-area" />),
		Line: jest.fn(() => <RNView testID="mock-line" />),
	};
});

// Enhanced reanimated mock with better animation support
jest.mock('react-native-reanimated', () => {
	const actualReanimated = jest.requireActual('react-native-reanimated/mock');
	return {
		...actualReanimated,
		useSharedValue: jest.fn((initial: unknown) => ({ value: initial })), // initial can be any type
		useDerivedValue: jest.fn(<T>(fn: () => T) => { // Made generic
			const sharedValueMock = { value: fn() };
			return sharedValueMock;
		}),
		useAnimatedReaction: jest.fn(<P>(prepare: () => P, react: (preparedValue: P, previousValue: P | null) => void) => {
			// Simulate the reaction running
			const preparedValue = prepare();
			react(preparedValue, null); // Mocking previousValue as null
		}),
		runOnJS: jest.fn(<T extends (...args: any[]) => any>(fn: T): T => fn), // Made generic
		cancelAnimation: jest.fn(),
		withSpring: jest.fn((value) => value),
		withRepeat: jest.fn((animation) => animation),
		useAnimatedStyle: jest.fn(() => ({})),
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

// Mock react-native-paper theme
jest.mock('react-native-paper', () => ({
	useTheme: jest.fn(() => ({
		colors: {
			onSurface: '#FFFFFF',
			onSurfaceVariant: '#CCCCCC',
			background: '#000000',
		}
	})),
	ActivityIndicator: jest.fn((props) => {
		const RNView = jest.requireActual('react-native').View;
		return <RNView {...props} testID="loading-indicator" />;
	}),
}));

interface PricePoint {
	timestamp: string;
	price: number;
	value: number;
	x: number;
	y: number;
}

// Test data for different scenarios
const defaultProps = {
	data: [],
	loading: true,
	onHover: jest.fn(),
	period: "4H",
};

const positiveData: PricePoint[] = [
	{ timestamp: new Date(1000000).toISOString(), price: 100, value: 100, x: 1000000, y: 100 },
	{ timestamp: new Date(2000000).toISOString(), price: 110, value: 110, x: 2000000, y: 110 },
	{ timestamp: new Date(3000000).toISOString(), price: 120, value: 120, x: 3000000, y: 120 },
];

const negativeData: PricePoint[] = [
	{ timestamp: new Date(1000000).toISOString(), price: 120, value: 120, x: 1000000, y: 120 },
	{ timestamp: new Date(2000000).toISOString(), price: 110, value: 110, x: 2000000, y: 110 },
	{ timestamp: new Date(3000000).toISOString(), price: 100, value: 100, x: 3000000, y: 100 },
];

const flatData: PricePoint[] = [
	{ timestamp: new Date(1000000).toISOString(), price: 100, value: 100, x: 1000000, y: 100 },
	{ timestamp: new Date(2000000).toISOString(), price: 100, value: 100, x: 2000000, y: 100 },
	{ timestamp: new Date(3000000).toISOString(), price: 100, value: 100, x: 3000000, y: 100 },
];

describe('CoinChart Basic Rendering', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should render loading state when loading is true', () => {
		render(<CoinChart {...defaultProps} loading={true} data={[]} />);
		expect(screen.getByTestId('loading-indicator')).toBeTruthy();
	});

	it('should render loading state when data is empty (even if loading is false)', () => {
		render(<CoinChart {...defaultProps} loading={false} data={[]} />);
		expect(screen.getByTestId('loading-indicator')).toBeTruthy();
	});

	it('should render chart when data is provided and not loading', () => {
		render(<CoinChart {...defaultProps} loading={false} data={positiveData} />);
		expect(screen.getByTestId('coin-chart-container')).toBeTruthy();
		expect(screen.getByTestId('mock-cartesian-chart')).toBeTruthy();
	});
});

describe('CoinChart Color Logic', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should determine green color for positive trend data', () => {
		const processedData = positiveData.map(d => ({
			timestamp: new Date(d.timestamp).getTime(),
			price: d.price,
			value: d.value,
			x: new Date(d.timestamp).getTime(),
			y: d.value
		}));
		
		const color = determineChartColor(processedData);
		expect(color).toBe('green');
	});

	it('should determine red color for negative trend data', () => {
		const processedData = negativeData.map(d => ({
			timestamp: new Date(d.timestamp).getTime(),
			price: d.price,
			value: d.value,
			x: new Date(d.timestamp).getTime(),
			y: d.value
		}));
		
		const color = determineChartColor(processedData);
		expect(color).toBe('red');
	});

	it('should determine green color for flat data (no change)', () => {
		const processedData = flatData.map(d => ({
			timestamp: new Date(d.timestamp).getTime(),
			price: d.price,
			value: d.value,
			x: new Date(d.timestamp).getTime(),
			y: d.value
		}));
		
		const color = determineChartColor(processedData);
		expect(color).toBe('green'); // Equal values default to green
	});

	it('should have correct color values in CHART_COLORS', () => {
		expect(CHART_COLORS.green.line).toBe('#0BA360');
		expect(CHART_COLORS.red.line).toBe('#E04E4A');
		expect(CHART_COLORS.green.gradient).toHaveLength(3);
		expect(CHART_COLORS.red.gradient).toHaveLength(3);
	});
});

describe('CoinChart Time Formatting', () => {
	it('should format 1H period correctly', () => {
		const format = getTimeFormat('1H');
		expect(format.tickCount).toBe(4);
		expect(typeof format.axis).toBe('function');
		expect(typeof format.tooltip).toBe('function');
	});

	it('should format 1D period correctly', () => {
		const format = getTimeFormat('1D');
		expect(format.tickCount).toBe(4);
		expect(typeof format.axis).toBe('function');
		expect(typeof format.tooltip).toBe('function');
	});

	it('should format 1W period correctly', () => {
		const format = getTimeFormat('1W');
		expect(format.tickCount).toBe(4);
		expect(typeof format.axis).toBe('function');
		expect(typeof format.tooltip).toBe('function');
	});

	it('should format 1M period correctly', () => {
		const format = getTimeFormat('1M');
		expect(format.tickCount).toBe(4);
		expect(typeof format.axis).toBe('function');
		expect(typeof format.tooltip).toBe('function');
	});

	it('should have default format for unknown periods', () => {
		const format = getTimeFormat('UNKNOWN');
		expect(format.tickCount).toBe(4);
		expect(typeof format.axis).toBe('function');
		expect(typeof format.tooltip).toBe('function');
	});
});

describe('CoinChart Interaction and Hover', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should call onHover when chart is interacted with', () => {
		const mockOnHover = jest.fn();
		render(<CoinChart {...defaultProps} loading={false} data={positiveData} onHover={mockOnHover} />);
		
		const chart = screen.getByTestId('mock-cartesian-chart');
		fireEvent(chart, 'touchStart');
		
		// The onHover should be called through the mocked interaction
		// Note: In real implementation, this would be called via useDerivedValue
		expect(mockOnHover).toHaveBeenCalled();
	});

	it('should render hover elements when chart is pressed', () => {
		render(<CoinChart {...defaultProps} loading={false} data={positiveData} />);
		
		const chart = screen.getByTestId('mock-cartesian-chart');
		expect(chart).toBeTruthy();
		
		// Check that the chart can render interactive elements
		// The actual hover line and circle are rendered in renderOutside
		fireEvent(chart, 'touchStart');
		
		// Verify chart bounds are passed correctly
		const chartBounds = JSON.parse(chart.props['data-chart-bounds']);
		expect(chartBounds).toEqual({ bottom: 250, top: 0, left: 0, right: 300 });
	});

	it('should handle chart data correctly', () => {
		render(<CoinChart {...defaultProps} loading={false} data={positiveData} />);
		
		const chart = screen.getByTestId('mock-cartesian-chart');
		const dataPoints = JSON.parse(chart.props['data-points']);
		
		expect(dataPoints).toHaveLength(3);
		expect(dataPoints[0]).toHaveProperty('x');
		expect(dataPoints[0]).toHaveProperty('y');
	});
});

describe('CoinChart Constants and Settings', () => {
	it('should have correct chart constants', () => {
		expect(CHART_CONSTANTS.dotSize.inner).toBe(4);
		expect(CHART_CONSTANTS.dotSize.outer).toBe(6);
		expect(CHART_CONSTANTS.dotSize.pulse.min).toBe(4);
		expect(CHART_CONSTANTS.dotSize.pulse.max).toBe(5.5);
		expect(CHART_CONSTANTS.line.width.main).toBe(2);
		expect(CHART_CONSTANTS.line.width.indicator).toBe(1);
	});

	it('should have correct animation settings', () => {
		expect(CHART_CONSTANTS.animation.duration).toBe(300);
		expect(CHART_CONSTANTS.animation.stiffness.normal).toBe(100);
		expect(CHART_CONSTANTS.animation.stiffness.responsive).toBe(120);
		expect(CHART_CONSTANTS.animation.damping.normal).toBe(15);
		expect(CHART_CONSTANTS.animation.damping.responsive).toBe(20);
		expect(CHART_CONSTANTS.animation.mass.light).toBe(0.8);
	});

	it('should have correct spacing and throttle settings', () => {
		expect(CHART_CONSTANTS.dotSpacing).toBe(6);
		expect(CHART_CONSTANTS.hapticThrottle).toBe(150);
	});
});

describe('CoinChart Period-Specific Behavior', () => {
	const periods = ['1H', '4H', '1D', '1W', '1M'];

	periods.forEach(period => {
		it(`should render correctly for ${period} period`, () => {
			render(<CoinChart {...defaultProps} loading={false} data={positiveData} period={period} />);
			
			const chart = screen.getByTestId('mock-cartesian-chart');
			expect(chart).toBeTruthy();
			
			// Verify data is processed correctly for each period
			const dataPoints = JSON.parse(chart.props['data-points']);
			expect(dataPoints).toHaveLength(3);
		});
	});
});

describe('CoinChart Data Processing', () => {
	it('should handle large datasets by sampling', () => {
		// Create a large dataset (more than 150 points)
		const largeData = Array.from({ length: 200 }, (_, i) => ({
			timestamp: new Date(1000000 + i * 10000).toISOString(),
			price: 100 + Math.random() * 10,
			value: 100 + Math.random() * 10,
			x: 1000000 + i * 10000,
			y: 100 + Math.random() * 10,
		}));

		render(<CoinChart {...defaultProps} loading={false} data={largeData} />);
		
		const chart = screen.getByTestId('mock-cartesian-chart');
		const dataPoints = JSON.parse(chart.props['data-points']);
		
		// Should be sampled down for performance
		expect(dataPoints.length).toBeLessThanOrEqual(150);
	});

	it('should handle empty data gracefully', () => {
		render(<CoinChart {...defaultProps} loading={false} data={[]} />);
		expect(screen.getByTestId('loading-indicator')).toBeTruthy();
	});

	it('should handle malformed data gracefully', () => {
		const malformedData = [
			{ timestamp: 'invalid', price: NaN, value: null, x: undefined, y: 'not-a-number' },
		] as any; // 'as any' is intentional here for testing malformed data

		// Should not crash
		expect(() => {
			render(<CoinChart {...defaultProps} loading={false} data={malformedData as PricePoint[]} />); // Cast to PricePoint[] to satisfy component props
		}).not.toThrow();
	});
});

describe('CoinChart Accessibility and Performance', () => {
	it('should have proper test IDs for accessibility', () => {
		render(<CoinChart {...defaultProps} loading={false} data={positiveData} />);
		
		expect(screen.getByTestId('coin-chart-container')).toBeTruthy();
		expect(screen.getByTestId('mock-cartesian-chart')).toBeTruthy();
	});

	it('should render loading state with proper test ID', () => {
		render(<CoinChart {...defaultProps} loading={true} data={[]} />);
		expect(screen.getByTestId('loading-indicator')).toBeTruthy();
	});

	it('should handle rapid period changes without crashing', () => {
		const { rerender } = render(<CoinChart {...defaultProps} loading={false} data={positiveData} period="1H" />);
		
		// Rapidly change periods
		rerender(<CoinChart {...defaultProps} loading={false} data={positiveData} period="1D" />);
		rerender(<CoinChart {...defaultProps} loading={false} data={positiveData} period="1W" />);
		rerender(<CoinChart {...defaultProps} loading={false} data={positiveData} period="1M" />);
		
		expect(screen.getByTestId('coin-chart-container')).toBeTruthy();
	});
});
