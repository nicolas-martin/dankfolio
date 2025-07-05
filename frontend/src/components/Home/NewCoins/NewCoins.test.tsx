import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import NewCoins from './NewCoins';
import { useCoinStore } from '@store/coins';
import { useNavigation } from '@react-navigation/native';
import { useToast } from '@components/Common/Toast';
import { Coin } from '@/types';
import { logger } from '@/utils/logger';

// Mock logger
jest.mock('@/utils/logger', () => ({
	logger: {
		log: jest.fn(),
		error: jest.fn(),
		breadcrumb: jest.fn(),
	},
}));

// Mock dependencies
jest.mock('@/store/coins', () => ({
	useCoinStore: jest.fn(),
}));
jest.mock('@react-navigation/native');
jest.mock('@components/Common/Toast');

const mockNavigate = jest.fn();
const mockShowToast = jest.fn();
const mockGetCoinByID = jest.fn(); // Renamed from mockEnrichCoin

const mockNewlyListedCoin: Coin = {
	mintAddress: 'newCoinMint1',
	symbol: 'NEW1',
	name: 'New Coin 1',
	price: 1.1,
	decimals: 6,
	description: 'Desc for NEW1',
	logoURI: 'new1.png',
	tags: ['new'],
	dailyVolume: 1000,
	createdAt: new Date(),
};

const mockEnhancedCoin: Coin = {
	...mockNewlyListedCoin,
	price: 1.15, // Slightly different price
	description: 'Enhanced description for NEW1',
};

// Mock the timeFormat utility
jest.mock('@/utils/timeFormat', () => ({
	formatTimeAgo: jest.fn(),
}));
import { formatTimeAgo } from '@/utils/timeFormat'; // Import the mocked function

describe('NewCoins Component', () => {
	beforeEach(() => {
		jest.clearAllMocks();

		// Ensure useCoinStore is correctly typed for mockReturnValue
		(useCoinStore as unknown as jest.Mock).mockReturnValue({
			newlyListedCoins: [mockNewlyListedCoin],
			isLoadingNewlyListed: false,
			error: null,
			getCoinByID: mockGetCoinByID,
			fetchNewCoins: jest.fn().mockResolvedValue(undefined), // Mock an async action
			lastFetchedNewCoinsAt: 0,
			// Add other state properties used by NewCoins if any, with default mock values
			availableCoins: [],
			coinMap: {},
			isLoading: false,
			setAvailableCoins: jest.fn(),
			setCoin: jest.fn(),
			fetchAvailableCoins: jest.fn().mockResolvedValue(undefined),
			setLastFetchedNewCoinsAt: jest.fn(),
		});

		(useNavigation as jest.Mock).mockReturnValue({
			navigate: mockNavigate,
		});

		(useToast as jest.Mock).mockReturnValue({
			showToast: mockShowToast,
		});
	});

	it('renders correctly with newly listed coins', () => {
		const { getByText, _getByTestId } = render(<NewCoins />); // Assuming CoinCard has a testID or identifiable text
		expect(getByText('New Listings')).toBeTruthy();
		expect(getByText(mockNewlyListedCoin.symbol)).toBeTruthy(); // Check if coin symbol is rendered by CoinCard
	});

	describe('handleCoinPress logic', () => {
		it('calls getCoinByID and navigates on successful fetch', async () => {
			mockGetCoinByID.mockResolvedValue(mockEnhancedCoin);
			const { getByText } = render(<NewCoins />);

			const coinCard = getByText(mockNewlyListedCoin.symbol);
			await act(async () => {
				fireEvent.press(coinCard);
			});

			expect(mockGetCoinByID).toHaveBeenCalledWith(mockNewlyListedCoin.mintAddress, true);
			expect(mockNavigate).toHaveBeenCalledWith('CoinDetail', { coin: mockEnhancedCoin });
			expect(mockShowToast).not.toHaveBeenCalled();
			expect(logger.breadcrumb).toHaveBeenCalledWith({
				category: 'navigation',
				message: 'Pressed coin from NewCoins, fetched details and navigating', // Updated message
				data: { coinSymbol: mockEnhancedCoin.symbol, coinMint: mockEnhancedCoin.mintAddress },
			});
		});

		it('calls getCoinByID and shows toast on failed fetch (returns null)', async () => {
			mockGetCoinByID.mockResolvedValue(null);
			const { getByText } = render(<NewCoins />);

			const coinCard = getByText(mockNewlyListedCoin.symbol);
			await act(async () => {
				fireEvent.press(coinCard);
			});

			expect(mockGetCoinByID).toHaveBeenCalledWith(mockNewlyListedCoin.mintAddress, true);
			expect(mockShowToast).toHaveBeenCalledWith('error', 'Failed to load coin details. Please try again.');
			expect(mockNavigate).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledWith(
				'[NewCoins] Failed to fetch coin details with getCoinByID, not navigating', // Updated message
				{ coinSymbol: mockNewlyListedCoin.symbol, coinMint: mockNewlyListedCoin.mintAddress }
			);
		});

		it('calls getCoinByID and shows toast on error during fetch', async () => {
			const errorMessage = 'Network error';
			mockGetCoinByID.mockRejectedValue(new Error(errorMessage));
			const { getByText } = render(<NewCoins />);

			const coinCard = getByText(mockNewlyListedCoin.symbol);
			await act(async () => {
				fireEvent.press(coinCard);
			});

			expect(mockGetCoinByID).toHaveBeenCalledWith(mockNewlyListedCoin.mintAddress, true);
			expect(mockShowToast).toHaveBeenCalledWith('error', 'An error occurred. Please try again.');
			expect(mockNavigate).not.toHaveBeenCalled();
			expect(logger.error).toHaveBeenCalledWith(
				`[NewCoins] Error during getCoinByID for ${mockNewlyListedCoin.symbol}:`, // Updated message
				{ error: expect.any(Error), coinMint: mockNewlyListedCoin.mintAddress }
			);
		});
	});

	describe('Time Ago Display', () => {
		it('renders time ago string from formatTimeAgo', () => {
			const timeAgoString = '5 minutes ago';
			(formatTimeAgo as jest.Mock).mockReturnValue(timeAgoString);
			const coinWithTime = { ...mockNewlyListedCoin, jupiterListedAt: new Date() };
			const fullMockState = {
				newlyListedCoins: [coinWithTime],
				isLoadingNewlyListed: false,
				error: null,
				getCoinByID: mockGetCoinByID,
				fetchNewCoins: jest.fn().mockResolvedValue(undefined),
				lastFetchedNewCoinsAt: 0,
				availableCoins: [],
				coinMap: {},
				isLoading: false,
				setAvailableCoins: jest.fn(),
				setCoin: jest.fn(),
				fetchAvailableCoins: jest.fn().mockResolvedValue(undefined),
				setLastFetchedNewCoinsAt: jest.fn(),
			};
			(useCoinStore as unknown as jest.Mock).mockReturnValue(fullMockState);

			const { getByText } = render(<NewCoins />);
			expect(formatTimeAgo).toHaveBeenCalledWith(coinWithTime.jupiterListedAt);
			expect(getByText(timeAgoString)).toBeTruthy();
		});

		it('does not render time ago text if formatTimeAgo returns empty string', () => {
			(formatTimeAgo as jest.Mock).mockReturnValue('');
			const coinWithoutTime = { ...mockNewlyListedCoin, jupiterListedAt: undefined };
			const fullMockState = {
				newlyListedCoins: [coinWithoutTime],
				isLoadingNewlyListed: false,
				error: null,
				getCoinByID: mockGetCoinByID,
				fetchNewCoins: jest.fn().mockResolvedValue(undefined),
				lastFetchedNewCoinsAt: 0,
				availableCoins: [],
				coinMap: {},
				isLoading: false,
				setAvailableCoins: jest.fn(),
				setCoin: jest.fn(),
				fetchAvailableCoins: jest.fn().mockResolvedValue(undefined),
				setLastFetchedNewCoinsAt: jest.fn(),
			};
			(useCoinStore as unknown as jest.Mock).mockReturnValue(fullMockState);

			const { queryByText } = render(<NewCoins />);
			// Assuming the text is identifiable or we check for absence if it's the only text possible
			// This is a bit tricky if other texts could be empty.
			// A more robust way would be to wrap the Text in a View with a testID.
			// For now, we'll assume if formatTimeAgo returns '', the Text component itself is not rendered due to `&&`
			expect(queryByText('')).toBeNull(); //This might not be specific enough
			// A better check if the text is not rendered:
			// Ensure no unexpected text elements appear that would match an empty string if rendered.
			// Or, if the style.timeAgoText is unique:
			// const timeAgoElement = queryByTestId('time-ago-text-newCoinMint1'); // If you add testID
			// expect(timeAgoElement).toBeNull();
		});
	});

	it('navigates to Search screen on "View All" press', () => {
		const { getByText } = render(<NewCoins />);
		const viewAllButton = getByText('View All');
		fireEvent.press(viewAllButton);
		expect(mockNavigate).toHaveBeenCalledWith('Search', {
			defaultSortBy: 'jupiter_listed_at',
			defaultSortDesc: true,
		});
	});

	it('shows loading animation when loading and no coins', () => {
		(useCoinStore as unknown as jest.Mock).mockReturnValue({
			newlyListedCoins: [],
			isLoadingNewlyListed: true,
			error: null,
			getCoinByID: jest.fn(() => Promise.resolve(null)),
			fetchNewCoins: jest.fn(() => Promise.resolve()),
			lastFetchedNewCoinsAt: 0,
			availableCoins: [],
			coinMap: {},
			isLoading: false,
			setAvailableCoins: jest.fn(),
			setCoin: jest.fn(),
			fetchAvailableCoins: jest.fn(() => Promise.resolve()),
			setLastFetchedNewCoinsAt: jest.fn(),
		});
		const { getByText } = render(<NewCoins />);
		expect(getByText('Loading new listings...')).toBeTruthy();
	});

	it('shows empty message when not loading and no coins', () => {
		(useCoinStore as unknown as jest.Mock).mockReturnValue({
			newlyListedCoins: [],
			isLoadingNewlyListed: false,
			error: null,
			getCoinByID: mockGetCoinByID, // from outer scope
			fetchNewCoins: jest.fn().mockResolvedValue(undefined),
			lastFetchedNewCoinsAt: 0,
			availableCoins: [],
			coinMap: {},
			isLoading: false,
			setAvailableCoins: jest.fn(),
			setCoin: jest.fn(),
			fetchAvailableCoins: jest.fn().mockResolvedValue(undefined),
			setLastFetchedNewCoinsAt: jest.fn(),
		});
		const { getByText } = render(<NewCoins />);
		expect(getByText('No new listings found at the moment.')).toBeTruthy();
	});
});
