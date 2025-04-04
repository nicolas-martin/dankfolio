// frontend/src/store/portfolio.test.ts
import { act } from '@testing-library/react-native';
import { usePortfolioStore } from './portfolio';
import { useCoinStore } from './coins';
import api from '@/services/api';
import { Wallet, Coin } from '@/types'; // Assuming Coin is in @/types
import { WalletBalanceResponse } from '@/services/api'; // Import specific type

// --- Mocks ---
jest.mock('@/services/api');
const mockedApi = api as jest.Mocked<typeof api>;

// Mock the coin store module to export an object with the mocked getState
const mockGetCoinByID = jest.fn();
jest.mock('./coins', () => ({
	useCoinStore: {
		// Mock the getState method directly on the exported object
		getState: jest.fn(() => ({
			getCoinByID: mockGetCoinByID,
			// Add other coin state properties if portfolio store uses them directly
			// coinMap: {}, 
			// availableCoins: [],
		})),
		// Mock other store methods/properties if needed (e.g., subscribe)
		// subscribe: jest.fn(), 
	},
}));

// --- Mock Data ---
const mockWalletData: Wallet = { address: 'wallet123', balance: 1000, privateKey: 'privKey', publicKey: 'pubKey' };
const mockSolCoin: Coin = { id: 'solana', symbol: 'SOL', name: 'Solana', price: 150, decimals: 9, description: '', icon_url: '', tags: [], daily_volume: 0, created_at: '' };
const mockUsdcCoin: Coin = { id: 'usd-coin', symbol: 'USDC', name: 'USD Coin', price: 1, decimals: 6, description: '', icon_url: '', tags: [], daily_volume: 0, created_at: '' };

const mockApiBalanceResponse: WalletBalanceResponse = {
	balances: [
		{ id: 'solana', amount: 5 },
		{ id: 'usd-coin', amount: 250 },
		{ id: 'unknown-coin', amount: 100 }, // Coin that might not be found in coinStore
	]
};

// --- Test Suite ---
describe('Zustand Portfolio Store', () => {
	let consoleErrorSpy: jest.SpyInstance;
	const initialState = usePortfolioStore.getState();

	beforeEach(() => {
		// Reset store state
		usePortfolioStore.setState(initialState, true);
		// Reset mocks
		jest.clearAllMocks();
		mockGetCoinByID.mockClear(); // Clear coin store mock specifically
		// Silence console errors
		consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
	});

	afterEach(() => {
		consoleErrorSpy.mockRestore();
	});

	it('should have correct initial state', () => {
		expect(initialState.wallet).toBeNull();
		expect(initialState.isLoading).toBe(false);
		expect(initialState.error).toBeNull();
		expect(initialState.tokens).toEqual([]);
	});

	it('setWallet updates the wallet state', () => {
		expect(usePortfolioStore.getState().wallet).toBeNull();
		act(() => {
			usePortfolioStore.getState().setWallet(mockWalletData);
		});
		expect(usePortfolioStore.getState().wallet).toEqual(mockWalletData);
		act(() => {
			usePortfolioStore.getState().setWallet(null);
		});
		expect(usePortfolioStore.getState().wallet).toBeNull();
	});

	it('clearWallet resets wallet, tokens, and error', () => {
		// Set some initial state
		act(() => {
			usePortfolioStore.setState({
				wallet: mockWalletData,
				tokens: [{ id: 'solana', amount: 5, price: 150, value: 750, coin: mockSolCoin }],
				error: 'Some error'
			});
		});

		act(() => {
			usePortfolioStore.getState().clearWallet();
		});

		const state = usePortfolioStore.getState();
		expect(state.wallet).toBeNull();
		expect(state.tokens).toEqual([]);
		expect(state.error).toBeNull();
	});

	describe('fetchPortfolioBalance', () => {
		it('fetches balance, gets coin data, calculates value, and updates state', async () => {
			mockedApi.getWalletBalance.mockResolvedValue(mockApiBalanceResponse);
			// Mock coin store responses for the balances received
			mockGetCoinByID.mockImplementation(async (id) => {
				if (id === 'solana') return mockSolCoin;
				if (id === 'usd-coin') return mockUsdcCoin;
				if (id === 'unknown-coin') return null; // Simulate coin not found
				return null;
			});

			await act(async () => {
				await usePortfolioStore.getState().fetchPortfolioBalance(mockWalletData.address);
			});

			const state = usePortfolioStore.getState();
			expect(state.isLoading).toBe(false);
			expect(state.error).toBeNull();

			// Check API call
			expect(mockedApi.getWalletBalance).toHaveBeenCalledTimes(1);
			expect(mockedApi.getWalletBalance).toHaveBeenCalledWith(mockWalletData.address);

			// Check coin store calls
			expect(mockGetCoinByID).toHaveBeenCalledTimes(3); // Called for each balance item
			expect(mockGetCoinByID).toHaveBeenCalledWith('solana');
			expect(mockGetCoinByID).toHaveBeenCalledWith('usd-coin');
			expect(mockGetCoinByID).toHaveBeenCalledWith('unknown-coin');

			// Check final tokens state (should exclude unknown-coin)
			expect(state.tokens).toHaveLength(2);
			expect(state.tokens).toEqual(expect.arrayContaining([
				expect.objectContaining({
					id: 'solana',
					amount: 5,
					price: 150,
					value: 750, // 5 * 150
					coin: mockSolCoin
				}),
				expect.objectContaining({
					id: 'usd-coin',
					amount: 250,
					price: 1,
					value: 250, // 250 * 1
					coin: mockUsdcCoin
				})
			]));
		});

		it('handles errors during fetch', async () => {
			const errorMessage = 'Failed to fetch balance';
			mockedApi.getWalletBalance.mockRejectedValue(new Error(errorMessage));

			await act(async () => {
				await usePortfolioStore.getState().fetchPortfolioBalance(mockWalletData.address);
			});

			const state = usePortfolioStore.getState();
			expect(state.isLoading).toBe(false);
			expect(state.error).toBe(errorMessage);
			expect(state.tokens).toEqual([]);
			expect(mockedApi.getWalletBalance).toHaveBeenCalledTimes(1);
			expect(mockGetCoinByID).not.toHaveBeenCalled(); // Should not be called if balance fetch fails
		});

		it('handles errors when getCoinByID fails for some tokens', async () => {
			const balanceError = 'Error fetching coin details';
			mockedApi.getWalletBalance.mockResolvedValue(mockApiBalanceResponse);
			// Fail for USDC, succeed for SOL
			mockGetCoinByID.mockImplementation(async (id) => {
				if (id === 'solana') return mockSolCoin;
				if (id === 'usd-coin') throw new Error(balanceError); // Simulate error for USDC
				return null;
			});

			await act(async () => {
				await usePortfolioStore.getState().fetchPortfolioBalance(mockWalletData.address);
			});

			const state = usePortfolioStore.getState();
			expect(state.isLoading).toBe(false);
			expect(state.error).toBe(balanceError);

			expect(mockedApi.getWalletBalance).toHaveBeenCalledTimes(1);
			expect(mockGetCoinByID).toHaveBeenCalledTimes(3); // Still called for all balances

			// Check final tokens state (should be empty because Promise.all rejects on first error)
			expect(state.tokens).toHaveLength(0);
			expect(state.tokens).toEqual([]);
		});

		it('sets loading state correctly', async () => {
			mockedApi.getWalletBalance.mockResolvedValue({ balances: [] }); // Resolve quickly
			mockGetCoinByID.mockResolvedValue(null); // Coins don't matter here

			expect(usePortfolioStore.getState().isLoading).toBe(false);

			const promise = act(async () => {
				await usePortfolioStore.getState().fetchPortfolioBalance(mockWalletData.address);
			});

			expect(usePortfolioStore.getState().isLoading).toBe(true); // Should be loading immediately after call

			await promise; // Wait for completion

			expect(usePortfolioStore.getState().isLoading).toBe(false); // Should not be loading after completion
		});

		it('handles errors when getCoinByID fails for all tokens', async () => {
			const errorMessage = 'Error fetching coin details';
			mockedApi.getWalletBalance.mockResolvedValue(mockApiBalanceResponse);
			// Fail for all coins
			mockGetCoinByID.mockImplementation(() => { throw new Error(errorMessage); });

			await act(async () => {
				await usePortfolioStore.getState().fetchPortfolioBalance(mockWalletData.address);
			});

			const state = usePortfolioStore.getState();
			expect(state.isLoading).toBe(false);
			expect(state.error).toBe(errorMessage);
			expect(state.tokens).toEqual([]);
			expect(mockedApi.getWalletBalance).toHaveBeenCalledTimes(1);
			expect(mockGetCoinByID).toHaveBeenCalledTimes(3); // Still called for all balances

			// Check final tokens state (should be empty because Promise.all rejects on first error)
			expect(state.tokens).toHaveLength(0);
			// expect(state.tokens[0]).toEqual(
			//     expect.objectContaining({ id: 'solana', coin: mockSolCoin })
			// );
		});
	});
}); 