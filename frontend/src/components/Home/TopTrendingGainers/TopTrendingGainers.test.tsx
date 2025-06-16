import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import TopTrendingGainers from './TopTrendingGainers';
import { useCoinStore } from '@/store/coins';
import { useNavigation } from '@react-navigation/native';
import { Coin } from '@/types';
import { SCREENS } from '@/utils/constants';

// Mock constants
const MOCK_CARD_WIDTH = 140;
const MOCK_CARD_MARGIN_RIGHT = 8;
const MOCK_SNAP_INTERVAL = MOCK_CARD_WIDTH + MOCK_CARD_MARGIN_RIGHT;

// Mock child components and hooks
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

jest.mock('@/store/coins', () => ({
  useCoinStore: jest.fn(),
}));

jest.mock('@/components/Cards/HorizontalTickerCard', () => {
  const { Text, TouchableOpacity } = require('react-native');
  return jest.fn(({ coin, onPress, testIdPrefix = 'trending-coin' }) => (
    <TouchableOpacity onPress={onPress} testID={`${testIdPrefix}-${coin.symbol}`}>
      <Text>{coin.symbol}</Text>
    </TouchableOpacity>
  ));
});

jest.mock('@/components/Common/ShimmerPlaceholder', () => {
  const { View } = require('react-native');
  return jest.fn(({ style }) => <View style={style} testID="shimmer-placeholder" />);
});

jest.mock('./TopTrendingGainers.styles', () => ({
  useStyles: () => ({
    container: {},
    titleContainer: {},
    title: { fontSize: 18 }, // For title text check
    listContentContainer: {},
    cardWrapper: {},
    emptyText: { fontSize: 14 }, // For empty text check
    placeholderCard: { width: MOCK_CARD_WIDTH, height: 100 },
    placeholderIconShimmer: { width: 40, height: 40 },
    placeholderTextShimmerLine1: { width: '80%', height: 10 },
    placeholderTextShimmerLine2: { width: '60%', height: 10 },
    titleShimmer: { width: 200, height: 22 },
    trendingCardStyle: {}, // Added this line
  }),
}));


const mockNavigate = jest.fn();
const mockFetchTopTrendingGainers = jest.fn();

const mockCoins: Coin[] = [
  { mintAddress: '1', symbol: 'COIN1', name: 'Coin One', price: 10, priceChangePercentage24h: 5, resolvedIconUrl: 'url1', jupiterListedAt: new Date() },
  { mintAddress: '2', symbol: 'COIN2', name: 'Coin Two', price: 20, priceChangePercentage24h: -2, resolvedIconUrl: 'url2', jupiterListedAt: new Date() },
];

describe('TopTrendingGainers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({ navigate: mockNavigate });
    (useCoinStore as jest.Mock).mockReturnValue({
      topTrendingGainers: [],
      isLoadingTopTrendingGainers: false,
      fetchTopTrendingGainers: mockFetchTopTrendingGainers,
      lastFetchedTopTrendingGainersAt: 0,
    });
  });

  it('renders correctly', () => {
    render(<TopTrendingGainers />);
  });

  it('displays the title', () => {
    const { getByText } = render(<TopTrendingGainers />);
    expect(getByText('🚀 Top Trending Gainers')).toBeTruthy();
  });

  it('shows loading state (shimmer placeholders)', () => {
    (useCoinStore as jest.Mock).mockReturnValue({
      topTrendingGainers: [],
      isLoadingTopTrendingGainers: true,
      fetchTopTrendingGainers: mockFetchTopTrendingGainers,
      lastFetchedTopTrendingGainersAt: 0,
    });
    const { getAllByTestId, getByTestId } = render(<TopTrendingGainers />);
    // Check for title shimmer
    expect(getByTestId('shimmer-placeholder')).toHaveStyle(useStyles().titleShimmer);
    // Check for card placeholders (icon, line1, line2 for each of NUM_PLACEHOLDERS)
    // NUM_PLACEHOLDERS is 5 in the component
    expect(getAllByTestId('shimmer-placeholder').length).toBeGreaterThanOrEqual(5 * 3 + 1); // 3 shimmers per card + 1 for title
  });

  it('shows empty state message', () => {
    (useCoinStore as jest.Mock).mockReturnValue({
      topTrendingGainers: [],
      isLoadingTopTrendingGainers: false,
      fetchTopTrendingGainers: mockFetchTopTrendingGainers,
      lastFetchedTopTrendingGainersAt: 0,
    });
    const { getByText } = render(<TopTrendingGainers />);
    expect(getByText('No trending gainers in the past 24h.')).toBeTruthy();
  });

  it('renders list of coins', () => {
    (useCoinStore as jest.Mock).mockReturnValue({
      topTrendingGainers: mockCoins,
      isLoadingTopTrendingGainers: false,
      fetchTopTrendingGainers: mockFetchTopTrendingGainers,
      lastFetchedTopTrendingGainersAt: Date.now(),
    });
    const { getByText } = render(<TopTrendingGainers />);
    expect(getByText('COIN1')).toBeTruthy();
    expect(getByText('COIN2')).toBeTruthy();
  });

  it('calls fetch function on mount', async () => {
    render(<TopTrendingGainers />);
    await waitFor(() => {
      expect(mockFetchTopTrendingGainers).toHaveBeenCalledTimes(1);
      expect(mockFetchTopTrendingGainers).toHaveBeenCalledWith(10, false);
    });
  });

  it('handles coin press (navigation)', async () => {
    (useCoinStore as jest.Mock).mockReturnValue({
      topTrendingGainers: [mockCoins[0]],
      isLoadingTopTrendingGainers: false,
      fetchTopTrendingGainers: mockFetchTopTrendingGainers,
      lastFetchedTopTrendingGainersAt: Date.now(),
    });
    const { getByTestId } = render(<TopTrendingGainers />);

    const coinCard = getByTestId(`trending-coin-${mockCoins[0].symbol}`);
    fireEvent.press(coinCard);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(SCREENS.COIN_DETAIL, { coin: mockCoins[0] });
    });
  });
});
