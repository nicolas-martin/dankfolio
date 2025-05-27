import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react-native';
import CoinChart from './index'; // Removed TIMEFRAME_CONFIG import
// import usePriceHistoryCacheStore from '@/store/priceHistoryCache'; // Cache store no longer used by component
import { logger } from '@/utils/logger';

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
        {children && children({ points: { y: data.map((d: any) => ({ x: d.x, y: d.y })) }, chartBounds: { bottom: 0, top: 100, left: 0, right: 100 }})}
        {renderOutside && renderOutside({ chartBounds: { bottom: 0, top: 100, left: 0, right: 100 }})}
      </RNView>
    )),
    useChartPressState: jest.fn(() => ({ 
      state: { x: { value: { value: 0 }, position: {value: 0} }, y: { y: { value: { value: 0 }, position: { value: 0 } } } }, 
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
  useFocusEffect: jest.fn(React.useCallback), 
}));


// Mock the Zustand store - No longer needed as component doesn't use it
// const mockGetCache = jest.fn();
// const mockSetCache = jest.fn();
// const mockClearExpiredCache = jest.fn();

// const actualStore = jest.requireActual('@/store/priceHistoryCache').default;
// const originalStoreState = actualStore.getState();


interface PricePoint { 
  timestamp: number;
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
  { timestamp: Date.now() - 100000, price: 100, value: 100, x: Date.now() - 100000, y: 100 },
  { timestamp: Date.now(), price: 102, value: 102, x: Date.now(), y: 102 },
];

const sampleData2: PricePoint[] = [
  { timestamp: Date.now() - 100000, price: 200, value: 200, x: Date.now() - 100000, y: 200 },
  { timestamp: Date.now(), price: 202, value: 202, x: Date.now(), y: 202 },
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

  it('should render chart when data is provided and loading is false', async () => {
    render(<CoinChart {...defaultProps} data={sampleData1} loading={false} />);
    
    expect(screen.queryByTestId('loading-text')).toBeNull(); // Loading text should not be present
    
    const chart = screen.getByTestId('mock-cartesian-chart');
    expect(chart).toBeTruthy();
    // Verify data is passed to the mock chart
    // The data in processedChartData is mapped to x and y for the chart component.
    // The PricePoint type includes timestamp and value.
    // The component maps point.timestamp to x and point.value to y.
    const expectedChartData = sampleData1.map(p => ({
      timestamp: p.timestamp,
      price: p.price, // price is used for hover, value for y-axis
      value: p.value,
      x: p.timestamp, // Mapped from point.timestamp
      y: p.value      // Mapped from point.value
    }));
    expect(JSON.parse(chart.props['data-points'])).toEqual(expectedChartData);
  });
});
