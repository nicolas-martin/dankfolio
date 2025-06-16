// frontend/src/store/coins.test.ts
import { act } from '@testing-library/react-native';
import { useCoinStore } from '@/store/coins';
import { grpcApi } from '@/services/grpcApi';
import { Coin } from '@/types';

// Mock the API service
jest.mock('@/services/grpcApi');

// Mock Coin Data
const mockSolCoin: Coin = { mintAddress: 'So11111111111111111111111111111111111111112', symbol: 'SOL', name: 'Solana', price: 150, decimals: 9, description: 'Solana', resolvedIconUrl: 'sol.png', tags: ['platform'], dailyVolume: 1000000, createdAt: new Date() };
const mockWenCoin: Coin = { mintAddress: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzL7xiH5HwMJI', symbol: 'WEN', name: 'Wen', price: 0.0001, decimals: 5, description: 'Wen WEN', resolvedIconUrl: 'wen.png', tags: ['meme'], dailyVolume: 50000, createdAt: new Date() };
const mockOtherCoin: Coin = { mintAddress: 'otherCoinId', symbol: 'OTH', name: 'Other', price: 10, decimals: 6, description: 'Other coin', resolvedIconUrl: 'other.png', tags: [], dailyVolume: 10000, createdAt: new Date() };
const mockNewlyListedCoin: Coin = { mintAddress: 'newCoinMint', symbol: 'NEW', name: 'New Coin', price: 1, decimals: 6, description: 'A new coin', resolvedIconUrl: 'new.png', tags: ['new'], dailyVolume: 500, createdAt: new Date() };


describe('Zustand Coin Store', () => {
	let consoleLogSpy: jest.SpyInstance;
	let consoleErrorSpy: jest.SpyInstance;
	const initialState = useCoinStore.getState();

	beforeEach(() => {
		useCoinStore.setState(initialState, true);
		jest.clearAllMocks();
		consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
		consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
	});

	afterEach(() => {
		consoleLogSpy.mockRestore();
		consoleErrorSpy.mockRestore();
	});

	describe('Store Management', () => {
		it('handles store initialization and coin management correctly', () => {
			// Test initial state
			expect(initialState.availableCoins).toEqual([]);
			expect(initialState.coinMap).toEqual({});
			expect(initialState.isLoading).toBe(false);
			expect(initialState.error).toBeNull();

			// Test setAvailableCoins
			const coins = [mockSolCoin, mockWenCoin];
			act(() => {
				useCoinStore.getState().setAvailableCoins(coins);
			});

			let state = useCoinStore.getState();
			expect(state.availableCoins).toEqual(coins);
			expect(state.coinMap).toEqual({
				[mockSolCoin.mintAddress]: mockSolCoin,
				[mockWenCoin.mintAddress]: mockWenCoin,
			});

			// Test setCoin functionality
			const updatedSolCoin = { ...mockSolCoin, price: 160 };
			act(() => {
				useCoinStore.getState().setCoin(updatedSolCoin);
			});
			state = useCoinStore.getState();
			expect(state.coinMap[mockSolCoin.mintAddress]).toEqual(updatedSolCoin);

			// Test adding another coin
			act(() => {
				useCoinStore.getState().setCoin(mockOtherCoin);
			});
			state = useCoinStore.getState();
			expect(state.coinMap[mockOtherCoin.mintAddress]).toEqual(mockOtherCoin);
			expect(Object.keys(state.coinMap).length).toBe(3);
		});

		it('updates lastFetchedNewCoinsAt correctly', () => {
			const timestamp = Date.now();
			act(() => {
				useCoinStore.getState().setLastFetchedNewCoinsAt(timestamp);
			});
			expect(useCoinStore.getState().lastFetchedNewCoinsAt).toBe(timestamp);
		});
	});

	describe('API Integration and Actions', () => {
		it('handles fetchAvailableCoins operations correctly', async () => {
			// Test loading state
			const fetchPromise = act(async () => {
				(grpcApi.getAvailableCoins as jest.Mock).mockResolvedValue([mockSolCoin, mockWenCoin, mockOtherCoin]);
				await useCoinStore.getState().fetchAvailableCoins();
			});

			// Verify loading state during fetch
			expect(useCoinStore.getState().isLoading).toBe(true);
			await fetchPromise;

			// Verify final state after fetch
			const state = useCoinStore.getState();
			expect(state.isLoading).toBe(false);
			expect(state.error).toBeNull();
			expect(grpcApi.getAvailableCoins).toHaveBeenCalledTimes(1);
			expect(state.availableCoins).toEqual([mockSolCoin, mockWenCoin, mockOtherCoin]);
			expect(state.coinMap).toEqual({
				[mockSolCoin.mintAddress]: mockSolCoin,
				[mockWenCoin.mintAddress]: mockWenCoin,
				[mockOtherCoin.mintAddress]: mockOtherCoin,
			});

			// Test error handling
			(grpcApi.getAvailableCoins as jest.Mock).mockRejectedValue(new Error('Network Error'));
			await act(async () => {
				await useCoinStore.getState().fetchAvailableCoins();
			});

			expect(useCoinStore.getState().error).toBe('Network Error');
			expect(useCoinStore.getState().isLoading).toBe(false);
		});

		it('handles getCoinByID operations correctly', async () => {
			// Test cache behavior
			act(() => {
				useCoinStore.getState().setCoin(mockWenCoin);
			});

			// Test cached retrieval
			let coin = await act(async () => {
				return await useCoinStore.getState().getCoinByID(mockWenCoin.mintAddress);
			});
			expect(coin).toEqual(mockWenCoin);
			expect(grpcApi.getCoinByID).not.toHaveBeenCalled();

			// Test force refresh
			const updatedWenCoin = { ...mockWenCoin, price: 0.0002 };
			(grpcApi.getCoinByID as jest.Mock).mockResolvedValue(updatedWenCoin);
			coin = await act(async () => {
				return await useCoinStore.getState().getCoinByID(mockWenCoin.mintAddress, true);
			});
			expect(coin).toEqual(updatedWenCoin);
			expect(grpcApi.getCoinByID).toHaveBeenCalledWith(mockWenCoin.mintAddress);

			// Test error handling
			(grpcApi.getCoinByID as jest.Mock).mockRejectedValue(new Error('Coin Not Found'));
			coin = await act(async () => {
				return await useCoinStore.getState().getCoinByID('nonExistentId');
			});
			expect(coin).toBeNull();
			expect(useCoinStore.getState().error).toBe('Coin Not Found');
		});

		// Removed describe('enrichCoin', ...) block

		describe('fetchNewCoins filtering logic', () => {
			const existingCoinInMap: Coin = { ...mockSolCoin, description: 'Full SOL', dailyVolume: 12345 }; // Already enhanced
			const existingAvailableCoin: Coin = { ...mockWenCoin, description: 'Full WEN' }; // Already in available

			beforeEach(() => {
				act(() => {
					// Setup: one coin in coinMap (simulating enhanced), one in availableCoins
					useCoinStore.getState().setCoin(existingCoinInMap); // Adds to coinMap and availableCoins if setAvailableCoins was used, let's ensure it's in coinMap
					useCoinStore.getState().availableCoins = [existingAvailableCoin, existingCoinInMap];
					// Ensure coinMap also has the availableCoin if it's supposed to be "enhanced"
					useCoinStore.getState().coinMap = {
						[existingCoinInMap.mintAddress]: existingCoinInMap,
						[existingAvailableCoin.mintAddress]: existingAvailableCoin
					};
					useCoinStore.getState().newlyListedCoins = [];
				});
			});

			it('filters out coins already in coinMap or availableCoins from newlyListedCoins', async () => {
				// Fetched data includes:
				// 1. A truly new coin
				// 2. A coin that's already in coinMap (mockSolCoin with potentially different, lesser details)
				// 3. A coin that's already in availableCoins (mockWenCoin with potentially different, lesser details)
				const fetchedNewSimpleSol = { ...mockSolCoin, price: mockSolCoin.price + 10 }; // Same mint, different data
				const fetchedNewSimpleWen = { ...mockWenCoin, price: mockWenCoin.price + 0.0001 }; // Same mint, different data

				(grpcApi.search as jest.Mock).mockResolvedValue({
					coins: [mockNewlyListedCoin, fetchedNewSimpleSol, fetchedNewSimpleWen],
					totalCount: 3,
				});

				await act(async () => {
					await useCoinStore.getState().fetchNewCoins();
				});

				const state = useCoinStore.getState();

				// Check newlyListedCoins
				expect(state.newlyListedCoins.length).toBe(1);
				expect(state.newlyListedCoins).toContainEqual(mockNewlyListedCoin);
				expect(state.newlyListedCoins).not.toContainEqual(expect.objectContaining({ mintAddress: existingCoinInMap.mintAddress }));
				expect(state.newlyListedCoins).not.toContainEqual(expect.objectContaining({ mintAddress: existingAvailableCoin.mintAddress }));


				// Check coinMap: should not overwrite existing more detailed coins with simpler fetched versions
				expect(state.coinMap[existingCoinInMap.mintAddress]).toEqual(existingCoinInMap); // Should remain the original enhanced version
				expect(state.coinMap[existingAvailableCoin.mintAddress]).toEqual(existingAvailableCoin); // Should remain the original
				expect(state.coinMap[mockNewlyListedCoin.mintAddress]).toEqual(mockNewlyListedCoin); // New coin added
			});

			it('adds new coins to coinMap if they are not already present', async () => {
				(grpcApi.search as jest.Mock).mockResolvedValue({
					coins: [mockNewlyListedCoin],
					totalCount: 1,
				});
				// Initial state: coinMap has existingCoinInMap and existingAvailableCoin
				// newlyListedCoins is empty

				await act(async () => {
					await useCoinStore.getState().fetchNewCoins();
				});

				const state = useCoinStore.getState();
				expect(state.newlyListedCoins).toContainEqual(mockNewlyListedCoin);
				expect(state.coinMap[mockNewlyListedCoin.mintAddress]).toEqual(mockNewlyListedCoin);
				expect(state.coinMap[existingCoinInMap.mintAddress]).toEqual(existingCoinInMap); // Ensure existing ones are still there
			});
		});
	});
});
