import { act } from '@testing-library/react-native';
import { usePortfolioStore } from './portfolio';
import { RawWalletData, Wallet, Coin, Base58PrivateKey } from '@/types'; // Import RawWalletData
import { grpcApi } from '@/services/grpcApi';
import * as coinStoreModule from './coins';
import * as Keychain from 'react-native-keychain';

// Mock solana service
jest.mock('@/services/solana', () => ({
	getKeypairFromPrivateKey: jest.fn().mockImplementation(() => ({
		publicKey: {
			toString: () => 'wallet123'
		}
	}))
}));

// Mock grpcApi
jest.mock('@/services/grpcApi', () => ({
	grpcApi: {
		getWalletBalance: jest.fn(),
	},
}));

// Mock Keychain
jest.mock('react-native-keychain');

let coinMap: Record<string, Coin>;
const mockGetCoinByID = jest.fn();
const mockSetCoin = jest.fn((coin: Coin) => {
	coinMap[coin.mintAddress] = coin;
});

const mockWalletData: RawWalletData = { // Changed type to RawWalletData
	address: 'wallet123',
	privateKey: 'privKey' as Base58PrivateKey,
	mnemonic: 'mnemonic'
};
const mockSolCoin: Coin = { mintAddress: 'solana', symbol: 'SOL', name: 'Solana', price: 150, decimals: 9, description: '', resolvedIconUrl: '', tags: [], dailyVolume: 0, createdAt: new Date() };
const mockUsdcCoin: Coin = { mintAddress: 'usd-coin', symbol: 'USDC', name: 'USD Coin', price: 1, decimals: 6, description: '', resolvedIconUrl: '', tags: [], dailyVolume: 0, createdAt: new Date() };

const mockApiBalanceResponseSuccess = {
	balances: [
		{ id: 'solana', amount: 5 },
		{ id: 'usd-coin', amount: 250 },
	]
};
const mockApiBalanceResponseWithUnknown = {
	balances: [
		{ id: 'solana', amount: 5 },
		{ id: 'usd-coin', amount: 250 },
		{ id: 'unknown-coin', amount: 100 },
	]
};

// Mock keychain responses
beforeEach(() => {
	(Keychain.getGenericPassword as jest.Mock).mockResolvedValue({
		password: JSON.stringify({
			privateKey: mockWalletData.privateKey,
			mnemonic: mockWalletData.mnemonic
		})
	});
});

// Helper for tests where all coins are missing
const mockAllCoinsMissing = () => mockGetCoinByID.mockImplementation(async () => null);

describe('Zustand Portfolio Store', () => {
	let consoleErrorSpy: jest.SpyInstance;
	const initialState = usePortfolioStore.getState();

	beforeEach(() => {
		usePortfolioStore.setState(initialState, true);
		jest.clearAllMocks();
		mockGetCoinByID.mockClear();
		mockSetCoin.mockClear();
		coinMap = { solana: mockSolCoin };

		const baseMockCoinState = {
			availableCoins: [],
			isLoading: false,
			error: null,
			setAvailableCoins: jest.fn(),
			fetchAvailableCoins: jest.fn(),
			newlyListedCoins: [],
			isLoadingNewlyListed: false,
			fetchNewCoins: jest.fn().mockResolvedValue(undefined),
			lastFetchedNewCoinsAt: 0,
			setLastFetchedNewCoinsAt: jest.fn(),
		};

		jest.spyOn(coinStoreModule.useCoinStore, 'getState').mockImplementation(() => ({
			...baseMockCoinState,
			getCoinByID: mockGetCoinByID,
			setCoin: mockSetCoin,
			clearNewCoinsCache: jest.fn(),
			get coinMap() { return coinMap; },
		}));
		consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
	});

	afterEach(() => {
		consoleErrorSpy.mockRestore();
	});

	describe('Wallet Management', () => {
		it('handles wallet state operations correctly', async () => {
			await act(async () => {
				await usePortfolioStore.getState().setWallet(mockWalletData.address);
			});
			expect(usePortfolioStore.getState().wallet).toEqual({ address: mockWalletData.address });
		});
	});

	describe('Portfolio Balance Operations', () => {
		it('handles successful portfolio balance fetch and updates', async () => {
			// Set up coinMap for this test
			coinMap = { solana: mockSolCoin };
			mockGetCoinByID.mockClear();
			mockSetCoin.mockClear();
			// This specific test requires a fresh coinMap setup
			coinMap = { solana: mockSolCoin };
			// Ensure the mock for this test includes all necessary fields
			const currentTestMockState = {
				availableCoins: [],
				isLoading: false,
				error: null,
				setAvailableCoins: jest.fn(),
				fetchAvailableCoins: jest.fn(),
				newlyListedCoins: [],
				isLoadingNewlyListed: false,
				fetchNewCoins: jest.fn().mockResolvedValue(undefined),
				lastFetchedNewCoinsAt: 0,
				setLastFetchedNewCoinsAt: jest.fn(),
				getCoinByID: mockGetCoinByID,
				setCoin: mockSetCoin,
				clearNewCoinsCache: jest.fn(),
				get coinMap() { return coinMap; },
			};
			jest.spyOn(coinStoreModule.useCoinStore, 'getState').mockReturnValue(currentTestMockState);


			(grpcApi.getWalletBalance as jest.Mock).mockResolvedValue(mockApiBalanceResponseSuccess);
			mockGetCoinByID.mockImplementation(async (id) => {
				if (id === 'usd-coin') {
					mockSetCoin(mockUsdcCoin);
					return mockUsdcCoin;
				}
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
			
			// IMPORTANT: Keep API call count assertion for performance monitoring
			expect(grpcApi.getWalletBalance).toHaveBeenCalledWith(mockWalletData.address);
			expect(mockGetCoinByID).toHaveBeenCalledTimes(1);
			expect(mockGetCoinByID).toHaveBeenCalledWith('usd-coin');

			// Verify token structure (don't assert exact values)
			expect(state.tokens).toHaveLength(2);
			expect(state.tokens).toEqual(expect.arrayContaining([
				expect.objectContaining({
					mintAddress: 'solana',
					amount: expect.any(Number),
					price: expect.any(Number),
					value: expect.any(Number),
					coin: mockSolCoin
				}),
				expect.objectContaining({
					mintAddress: 'usd-coin',
					amount: expect.any(Number),
					price: expect.any(Number),
					value: expect.any(Number),
					coin: mockUsdcCoin
				})
			]));
		});

		it('handles error if any coin cannot be fetched', async () => {
			coinMap = { solana: mockSolCoin }; // Reset coinMap for this test
			mockGetCoinByID.mockClear();
			mockSetCoin.mockClear();
			const currentTestMockState = {
				availableCoins: [],
				isLoading: false,
				error: null,
				setAvailableCoins: jest.fn(),
				fetchAvailableCoins: jest.fn(),
				newlyListedCoins: [],
				isLoadingNewlyListed: false,
				fetchNewCoins: jest.fn().mockResolvedValue(undefined),
				lastFetchedNewCoinsAt: 0,
				setLastFetchedNewCoinsAt: jest.fn(),
				getCoinByID: mockGetCoinByID,
				setCoin: mockSetCoin,
				clearNewCoinsCache: jest.fn(),
				get coinMap() { return coinMap; },
			};
			jest.spyOn(coinStoreModule.useCoinStore, 'getState').mockReturnValue(currentTestMockState);

			(grpcApi.getWalletBalance as jest.Mock).mockResolvedValue(mockApiBalanceResponseWithUnknown);
			mockGetCoinByID.mockImplementation(async (id) => {
				if (id === 'usd-coin') {
					mockSetCoin(mockUsdcCoin);
					return mockUsdcCoin;
				}
				if (id === 'unknown-coin') return null; // Simulate missing coin
				return null;
			});

			await act(async () => {
				await usePortfolioStore.getState().fetchPortfolioBalance(mockWalletData.address);
			});

			const state = usePortfolioStore.getState();
			// Error should include the missing coin id
			expect(state.error).toEqual(expect.stringContaining('Some coins could not be loaded: [unknown-coin]'));
			
			// Verify token structure (don't assert exact values)
			expect(state.tokens).toHaveLength(2);
			expect(state.tokens).toEqual(expect.arrayContaining([
				expect.objectContaining({
					mintAddress: 'solana',
					amount: expect.any(Number),
					price: expect.any(Number),
					value: expect.any(Number),
					coin: mockSolCoin
				}),
				expect.objectContaining({
					mintAddress: 'usd-coin',
					amount: expect.any(Number),
					price: expect.any(Number),
					value: expect.any(Number),
					coin: mockUsdcCoin
				})
			]));
			
			// IMPORTANT: Keep API call count assertion for performance monitoring
			expect(mockGetCoinByID).toHaveBeenCalledWith('usd-coin');
			expect(mockGetCoinByID).toHaveBeenCalledWith('unknown-coin');
			expect(mockGetCoinByID).toHaveBeenCalledTimes(2);
		});

		it('handles API fetch error', async () => {
			(grpcApi.getWalletBalance as jest.Mock).mockRejectedValue(new Error('Failed to fetch balance'));
			await act(async () => {
				await usePortfolioStore.getState().fetchPortfolioBalance(mockWalletData.address);
			});

			const state = usePortfolioStore.getState();
			expect(state.error).toBe('Failed to fetch balance');
			expect(state.tokens).toEqual([]);
			
			// IMPORTANT: Keep API call count assertion for performance monitoring
			expect(mockGetCoinByID).not.toHaveBeenCalled();
			expect(grpcApi.getWalletBalance).toHaveBeenCalledTimes(1);
		});

		it('handles all coins missing (partial coin fetch failure)', async () => {
			coinMap = {}; // Reset coinMap for this test
			mockGetCoinByID.mockClear();
			mockSetCoin.mockClear();
			const currentTestMockState = {
				availableCoins: [],
				isLoading: false,
				error: null,
				setAvailableCoins: jest.fn(),
				fetchAvailableCoins: jest.fn(),
				newlyListedCoins: [],
				isLoadingNewlyListed: false,
				fetchNewCoins: jest.fn().mockResolvedValue(undefined),
				lastFetchedNewCoinsAt: 0,
				setLastFetchedNewCoinsAt: jest.fn(),
				getCoinByID: mockGetCoinByID,
				setCoin: mockSetCoin,
				clearNewCoinsCache: jest.fn(),
				get coinMap() { return coinMap; },
			};
			jest.spyOn(coinStoreModule.useCoinStore, 'getState').mockReturnValue(currentTestMockState);

			(grpcApi.getWalletBalance as jest.Mock).mockResolvedValue(mockApiBalanceResponseSuccess);
			mockAllCoinsMissing();

			await act(async () => {
				await usePortfolioStore.getState().fetchPortfolioBalance(mockWalletData.address);
			});

			const state = usePortfolioStore.getState();
			expect(state.error).toContain('solana');
			expect(state.error).toContain('usd-coin');
			expect(state.error).toContain('Some coins could not be loaded');
			expect(state.tokens).toEqual([]);
			
			// IMPORTANT: Keep API call count assertion for performance monitoring
			expect(mockGetCoinByID).toHaveBeenCalledWith('solana');
			expect(mockGetCoinByID).toHaveBeenCalledWith('usd-coin');
			expect(mockGetCoinByID).toHaveBeenCalledTimes(2);
			expect(grpcApi.getWalletBalance).toHaveBeenCalledTimes(1);
		});

		it('handles all coins missing (complete coin fetch failure)', async () => {
			coinMap = {}; // Reset coinMap for this test
			mockGetCoinByID.mockClear();
			mockSetCoin.mockClear();
			const currentTestMockState = {
				availableCoins: [],
				isLoading: false,
				error: null,
				setAvailableCoins: jest.fn(),
				fetchAvailableCoins: jest.fn(),
				newlyListedCoins: [],
				isLoadingNewlyListed: false,
				fetchNewCoins: jest.fn().mockResolvedValue(undefined),
				lastFetchedNewCoinsAt: 0,
				setLastFetchedNewCoinsAt: jest.fn(),
				getCoinByID: mockGetCoinByID,
				setCoin: mockSetCoin,
				clearNewCoinsCache: jest.fn(),
				get coinMap() { return coinMap; },
			};
			jest.spyOn(coinStoreModule.useCoinStore, 'getState').mockReturnValue(currentTestMockState);

			(grpcApi.getWalletBalance as jest.Mock).mockResolvedValue(mockApiBalanceResponseSuccess);
			mockAllCoinsMissing();

			await act(async () => {
				await usePortfolioStore.getState().fetchPortfolioBalance(mockWalletData.address);
			});

			const state = usePortfolioStore.getState();
			expect(state.error).toContain('solana');
			expect(state.error).toContain('usd-coin');
			expect(state.error).toContain('Some coins could not be loaded');
			expect(state.tokens).toEqual([]);
			
			// IMPORTANT: Keep API call count assertion for performance monitoring
			expect(mockGetCoinByID).toHaveBeenCalledWith('solana');
			expect(mockGetCoinByID).toHaveBeenCalledWith('usd-coin');
			expect(mockGetCoinByID).toHaveBeenCalledTimes(2);
			expect(grpcApi.getWalletBalance).toHaveBeenCalledTimes(1);
		});
	});
}); 
