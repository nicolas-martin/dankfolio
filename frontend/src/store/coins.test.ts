// frontend/src/store/coins.test.ts
import { act } from '@testing-library/react-native';
import { useCoinStore } from './coins';
import api from '@/services/api';
import { Coin } from '@/types';

// Mock the API service
jest.mock('@/services/api');
const mockedApi = api as jest.Mocked<typeof api>;

// Mock Coin Data
const mockSolCoin: Coin = { id: 'So11111111111111111111111111111111111111112', symbol: 'SOL', name: 'Solana', price: 150, decimals: 9, description: '', icon_url: '', tags: [], daily_volume: 0, created_at: '' };
const mockWenCoin: Coin = { id: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzL7xiH5HwMJI', symbol: 'WEN', name: 'Wen', price: 0.0001, decimals: 5, description: '', icon_url: '', tags: [], daily_volume: 0, created_at: '' };
const mockOtherCoin: Coin = { id: 'otherCoinId', symbol: 'OTH', name: 'Other', price: 10, decimals: 6, description: '', icon_url: '', tags: [], daily_volume: 0, created_at: '' };

describe('Zustand Coin Store', () => {
	let consoleLogSpy: jest.SpyInstance;
	let consoleErrorSpy: jest.SpyInstance;
	const initialState = useCoinStore.getState();

	beforeEach(() => {
		// Reset store state before each test
		useCoinStore.setState(initialState, true);
		// Reset mocks
		jest.clearAllMocks();
		// Silence console logs/errors for cleaner test output
		consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
		consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
	});

	afterEach(() => {
		// Restore console methods
		consoleLogSpy.mockRestore();
		consoleErrorSpy.mockRestore();
	});

	it('should have correct initial state', () => {
		expect(initialState.availableCoins).toEqual([]);
		expect(initialState.coinMap).toEqual({});
		expect(initialState.isLoading).toBe(false);
		expect(initialState.error).toBeNull();
	});

	it('setAvailableCoins updates state correctly', () => {
		const coins = [mockSolCoin, mockWenCoin];
		act(() => {
			useCoinStore.getState().setAvailableCoins(coins);
		});

		const state = useCoinStore.getState();
		expect(state.availableCoins).toEqual(coins);
		expect(state.coinMap).toEqual({
			[mockSolCoin.id]: mockSolCoin,
			[mockWenCoin.id]: mockWenCoin,
		});
	});

	it('setCoin adds or updates a coin in coinMap', () => {
		// Add initial coin
		act(() => {
			useCoinStore.getState().setCoin(mockSolCoin);
		});
		expect(useCoinStore.getState().coinMap[mockSolCoin.id]).toEqual(mockSolCoin);

		// Update the coin
		const updatedSolCoin = { ...mockSolCoin, price: 160 };
		act(() => {
			useCoinStore.getState().setCoin(updatedSolCoin);
		});
		expect(useCoinStore.getState().coinMap[mockSolCoin.id]).toEqual(updatedSolCoin);

		// Add another coin
		act(() => {
			useCoinStore.getState().setCoin(mockWenCoin);
		});
		expect(useCoinStore.getState().coinMap[mockWenCoin.id]).toEqual(mockWenCoin);
		expect(Object.keys(useCoinStore.getState().coinMap).length).toBe(2);
	});

	describe('fetchAvailableCoins', () => {
		it('fetches coins successfully and updates state', async () => {
			mockedApi.getAvailableCoins.mockResolvedValue([mockWenCoin, mockOtherCoin]); // SOL missing initially
			mockedApi.getCoinByID.mockResolvedValue(mockSolCoin); // Mock fetching SOL separately

			await act(async () => {
				await useCoinStore.getState().fetchAvailableCoins();
			});

			const state = useCoinStore.getState();
			expect(state.isLoading).toBe(false);
			expect(state.error).toBeNull();
			expect(mockedApi.getAvailableCoins).toHaveBeenCalledTimes(1);
			expect(mockedApi.getCoinByID).toHaveBeenCalledWith(mockSolCoin.id); // Check SOL fetch
			expect(state.availableCoins).toEqual([mockSolCoin, mockWenCoin, mockOtherCoin]); // SOL should be prepended
			expect(state.coinMap[mockSolCoin.id]).toEqual(mockSolCoin);
			expect(state.coinMap[mockWenCoin.id]).toEqual(mockWenCoin);
			expect(state.coinMap[mockOtherCoin.id]).toEqual(mockOtherCoin);
		});

		it('fetches coins successfully when SOL is already present', async () => {
			mockedApi.getAvailableCoins.mockResolvedValue([mockSolCoin, mockWenCoin]); // SOL included

			await act(async () => {
				await useCoinStore.getState().fetchAvailableCoins();
			});

			const state = useCoinStore.getState();
			expect(state.isLoading).toBe(false);
			expect(state.error).toBeNull();
			expect(mockedApi.getAvailableCoins).toHaveBeenCalledTimes(1);
			expect(mockedApi.getCoinByID).not.toHaveBeenCalled(); // SOL shouldn't be fetched separately
			expect(state.availableCoins).toEqual([mockSolCoin, mockWenCoin]);
			expect(state.coinMap[mockSolCoin.id]).toEqual(mockSolCoin);
			expect(state.coinMap[mockWenCoin.id]).toEqual(mockWenCoin);
		});

		it('handles errors during fetch', async () => {
			const errorMessage = 'Network Error';
			mockedApi.getAvailableCoins.mockRejectedValue(new Error(errorMessage));

			await act(async () => {
				await useCoinStore.getState().fetchAvailableCoins();
			});

			const state = useCoinStore.getState();
			expect(state.isLoading).toBe(false);
			expect(state.error).toBe(errorMessage);
			expect(state.availableCoins).toEqual([]);
			expect(state.coinMap).toEqual({});
			expect(mockedApi.getAvailableCoins).toHaveBeenCalledTimes(1);
		});

		it('sets loading state correctly', async () => {
			mockedApi.getAvailableCoins.mockResolvedValue([]); // Resolve immediately

			// Check initial state is not loading
			expect(useCoinStore.getState().isLoading).toBe(false);

			const promise = act(async () => {
				await useCoinStore.getState().fetchAvailableCoins();
			});

			// Check loading state immediately after calling (before await finishes)
			expect(useCoinStore.getState().isLoading).toBe(true);

			await promise; // Wait for the fetch to complete

			// Check loading state after completion
			expect(useCoinStore.getState().isLoading).toBe(false);
		});
	});

	describe('getCoinByID', () => {
		it('returns cached coin if available and forceRefresh is false', async () => {
			// Pre-populate cache
			act(() => {
				useCoinStore.getState().setCoin(mockWenCoin);
			});

			const coin = await act(async () => {
				return await useCoinStore.getState().getCoinByID(mockWenCoin.id);
			});

			expect(coin).toEqual(mockWenCoin);
			expect(mockedApi.getCoinByID).not.toHaveBeenCalled();
		});

		it('fetches coin from API if not cached', async () => {
			mockedApi.getCoinByID.mockResolvedValue(mockWenCoin);

			const coin = await act(async () => {
				return await useCoinStore.getState().getCoinByID(mockWenCoin.id);
			});

			expect(coin).toEqual(mockWenCoin);
			expect(mockedApi.getCoinByID).toHaveBeenCalledTimes(1);
			expect(mockedApi.getCoinByID).toHaveBeenCalledWith(mockWenCoin.id);
			// Check if it was added to cache
			expect(useCoinStore.getState().coinMap[mockWenCoin.id]).toEqual(mockWenCoin);
		});

		it('fetches coin from API if forceRefresh is true', async () => {
			// Pre-populate cache
			act(() => {
				useCoinStore.getState().setCoin(mockWenCoin);
			});

			const updatedWenCoin = { ...mockWenCoin, price: 0.0002 };
			mockedApi.getCoinByID.mockResolvedValue(updatedWenCoin);

			const coin = await act(async () => {
				return await useCoinStore.getState().getCoinByID(mockWenCoin.id, true); // forceRefresh = true
			});

			expect(coin).toEqual(updatedWenCoin);
			expect(mockedApi.getCoinByID).toHaveBeenCalledTimes(1);
			expect(mockedApi.getCoinByID).toHaveBeenCalledWith(mockWenCoin.id);
			// Check if cache was updated
			expect(useCoinStore.getState().coinMap[mockWenCoin.id]).toEqual(updatedWenCoin);
		});

		it('handles errors during fetch and returns null', async () => {
			const errorMessage = 'Coin Not Found';
			mockedApi.getCoinByID.mockRejectedValue(new Error(errorMessage));

			const coin = await act(async () => {
				return await useCoinStore.getState().getCoinByID('nonExistentId');
			});

			expect(coin).toBeNull();
			expect(useCoinStore.getState().error).toBe(errorMessage);
			expect(mockedApi.getCoinByID).toHaveBeenCalledTimes(1);
			expect(mockedApi.getCoinByID).toHaveBeenCalledWith('nonExistentId');
		});
	});
}); 