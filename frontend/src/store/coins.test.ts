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
				[mockSolCoin.id]: mockSolCoin,
				[mockWenCoin.id]: mockWenCoin,
			});

			// Test setCoin functionality
			const updatedSolCoin = { ...mockSolCoin, price: 160 };
			act(() => {
				useCoinStore.getState().setCoin(updatedSolCoin);
			});
			state = useCoinStore.getState();
			expect(state.coinMap[mockSolCoin.id]).toEqual(updatedSolCoin);

			// Test adding another coin
			act(() => {
				useCoinStore.getState().setCoin(mockOtherCoin);
			});
			state = useCoinStore.getState();
			expect(state.coinMap[mockOtherCoin.id]).toEqual(mockOtherCoin);
			expect(Object.keys(state.coinMap).length).toBe(3);
		});
	});

	describe('API Integration', () => {
		it('handles fetchAvailableCoins operations correctly', async () => {
			// Test loading state
			const fetchPromise = act(async () => {
				mockedApi.getAvailableCoins.mockResolvedValue([mockWenCoin, mockOtherCoin]);
				mockedApi.getCoinByID.mockResolvedValue(mockSolCoin);
				await useCoinStore.getState().fetchAvailableCoins();
			});

			// Verify loading state during fetch
			expect(useCoinStore.getState().isLoading).toBe(true);
			await fetchPromise;

			// Verify final state after fetch
			const state = useCoinStore.getState();
			expect(state.isLoading).toBe(false);
			expect(state.error).toBeNull();
			expect(mockedApi.getAvailableCoins).toHaveBeenCalledTimes(1);
			expect(mockedApi.getCoinByID).toHaveBeenCalledWith(mockSolCoin.id);
			expect(state.availableCoins).toEqual([mockSolCoin, mockWenCoin, mockOtherCoin]);

			// Test error handling
			mockedApi.getAvailableCoins.mockRejectedValue(new Error('Network Error'));
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
				return await useCoinStore.getState().getCoinByID(mockWenCoin.id);
			});
			expect(coin).toEqual(mockWenCoin);
			expect(mockedApi.getCoinByID).not.toHaveBeenCalled();

			// Test force refresh
			const updatedWenCoin = { ...mockWenCoin, price: 0.0002 };
			mockedApi.getCoinByID.mockResolvedValue(updatedWenCoin);
			coin = await act(async () => {
				return await useCoinStore.getState().getCoinByID(mockWenCoin.id, true);
			});
			expect(coin).toEqual(updatedWenCoin);
			expect(mockedApi.getCoinByID).toHaveBeenCalledWith(mockWenCoin.id);

			// Test error handling
			mockedApi.getCoinByID.mockRejectedValue(new Error('Coin Not Found'));
			coin = await act(async () => {
				return await useCoinStore.getState().getCoinByID('nonExistentId');
			});
			expect(coin).toBeNull();
			expect(useCoinStore.getState().error).toBe('Coin Not Found');
		});
	});
}); 
