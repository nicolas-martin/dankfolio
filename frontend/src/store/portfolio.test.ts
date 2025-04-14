import { act } from '@testing-library/react-native';
import { usePortfolioStore } from './portfolio';
import { Wallet, Coin } from '@/types';
import { WalletBalanceResponse } from '@/services/api';
import api from '@/services/api';

jest.mock('@/services/api');
const mockedApi = api as jest.Mocked<typeof api>;

// Mock the coin store module to export an object with the mocked getState
const mockGetCoinByID = jest.fn();
jest.mock('./coins', () => ({
	useCoinStore: {
		getState: jest.fn(() => ({
			getCoinByID: mockGetCoinByID,
		})),
	},
}));

const mockWalletData: Wallet = { address: 'wallet123', balance: 1000, privateKey: 'privKey', publicKey: 'pubKey' };
const mockSolCoin: Coin = { id: 'solana', symbol: 'SOL', name: 'Solana', price: 150, decimals: 9, description: '', icon_url: '', tags: [], daily_volume: 0, created_at: '' };
const mockUsdcCoin: Coin = { id: 'usd-coin', symbol: 'USDC', name: 'USD Coin', price: 1, decimals: 6, description: '', icon_url: '', tags: [], daily_volume: 0, created_at: '' };

const mockApiBalanceResponse: WalletBalanceResponse = {
	balances: [
		{ id: 'solana', amount: 5 },
		{ id: 'usd-coin', amount: 250 },
		{ id: 'unknown-coin', amount: 100 },
	]
};

describe('Zustand Portfolio Store', () => {
	let consoleErrorSpy: jest.SpyInstance;
	const initialState = usePortfolioStore.getState();

	beforeEach(() => {
		usePortfolioStore.setState(initialState, true);
		jest.clearAllMocks();
		mockGetCoinByID.mockClear();
		consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
	});

	afterEach(() => {
		consoleErrorSpy.mockRestore();
	});

	describe('Wallet Management', () => {
		it('handles wallet state operations correctly', () => {
			// Test initial state
			expect(initialState.wallet).toBeNull();
			expect(initialState.isLoading).toBe(false);
			expect(initialState.error).toBeNull();
			expect(initialState.tokens).toEqual([]);

			// Test setWallet
			act(() => {
				usePortfolioStore.getState().setWallet(mockWalletData);
			});
			expect(usePortfolioStore.getState().wallet).toEqual(mockWalletData);

			// Test clearWallet with populated state
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
	});

	describe('Portfolio Balance Operations', () => {
		it('handles successful portfolio balance fetch and updates', async () => {
			// Test loading state transitions
			expect(usePortfolioStore.getState().isLoading).toBe(false);

			mockedApi.getWalletBalance.mockResolvedValue(mockApiBalanceResponse);
			mockGetCoinByID.mockImplementation(async (id) => {
				if (id === 'solana') return mockSolCoin;
				if (id === 'usd-coin') return mockUsdcCoin;
				if (id === 'unknown-coin') return null;
				return null;
			});

			const fetchPromise = act(async () => {
				await usePortfolioStore.getState().fetchPortfolioBalance(mockWalletData.address);
			});

			// Verify loading state during fetch
			expect(usePortfolioStore.getState().isLoading).toBe(true);
			await fetchPromise;

			// Verify final state
			const state = usePortfolioStore.getState();
			expect(state.isLoading).toBe(false);
			expect(state.error).toBeNull();
			expect(mockedApi.getWalletBalance).toHaveBeenCalledWith(mockWalletData.address);
			expect(mockGetCoinByID).toHaveBeenCalledTimes(3);

			// Verify token calculations
			expect(state.tokens).toHaveLength(2);
			expect(state.tokens).toEqual(expect.arrayContaining([
				expect.objectContaining({
					id: 'solana',
					amount: 5,
					price: 150,
					value: 750,
					coin: mockSolCoin
				}),
				expect.objectContaining({
					id: 'usd-coin',
					amount: 250,
					price: 1,
					value: 250,
					coin: mockUsdcCoin
				})
			]));
		});

		it('handles various error scenarios in portfolio operations', async () => {
			// Test API fetch error
			mockedApi.getWalletBalance.mockRejectedValue(new Error('Failed to fetch balance'));
			await act(async () => {
				await usePortfolioStore.getState().fetchPortfolioBalance(mockWalletData.address);
			});

			let state = usePortfolioStore.getState();
			expect(state.error).toBe('Failed to fetch balance');
			expect(state.tokens).toEqual([]);
			expect(mockGetCoinByID).not.toHaveBeenCalled();
			expect(mockedApi.getWalletBalance).toHaveBeenCalledTimes(1);

			// Test partial coin fetch failure
			mockedApi.getWalletBalance.mockResolvedValue(mockApiBalanceResponse);
			mockGetCoinByID.mockImplementation(async (id) => {
				if (id === 'solana') return mockSolCoin;
				if (id === 'usd-coin') throw new Error('Error fetching coin details');
				return null;
			});

			await act(async () => {
				await usePortfolioStore.getState().fetchPortfolioBalance(mockWalletData.address);
			});

			state = usePortfolioStore.getState();
			expect(state.error).toBe('Error fetching coin details');
			expect(state.tokens).toHaveLength(0);
			expect(mockGetCoinByID).toHaveBeenCalledTimes(3);
			expect(mockedApi.getWalletBalance).toHaveBeenCalledTimes(2);

			// Reset mock counters for the next test
			jest.clearAllMocks();

			// Test complete coin fetch failure
			mockedApi.getWalletBalance.mockResolvedValue(mockApiBalanceResponse);
			mockGetCoinByID.mockRejectedValue(new Error('Error fetching coin details'));
			await act(async () => {
				await usePortfolioStore.getState().fetchPortfolioBalance(mockWalletData.address);
			});

			state = usePortfolioStore.getState();
			expect(state.error).toBe('Error fetching coin details');
			expect(state.tokens).toEqual([]);
			expect(mockGetCoinByID).toHaveBeenCalledTimes(3);
			expect(mockedApi.getWalletBalance).toHaveBeenCalledTimes(1);
		});
	});
}); 
