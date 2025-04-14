// frontend/src/services/api.test.ts
import axios from 'axios';
import api, { Coin, TradePayload, TradeQuoteResponse, WalletBalanceResponse, PriceHistoryResponse } from './api'; // Import the default export and types

// --- Mock axios using the factory pattern --- 
jest.mock('axios', () => {
	// Define the mock instance structure first
	const mockAxiosInstance = {
		get: jest.fn(),
		post: jest.fn(),
		interceptors: {
			request: { use: jest.fn() },
			response: { use: jest.fn() },
		},
		defaults: { headers: { common: {} } },
	};
	// Return the mocked module structure
	return {
		// Mock the 'create' method to return our instance
		create: jest.fn(() => mockAxiosInstance),
		// You might need to mock other axios static methods if api.ts uses them (e.g., isCancel, CancelToken)
		// isCancel: jest.fn(),
		// CancelToken: { source: jest.fn(() => ({ token: 'mockToken', cancel: jest.fn() })) }
	};
});

// Get a typed reference to the mocked functions AFTER mocking
const mockedAxiosCreate = axios.create as jest.Mock;
// Retrieve the mock instance returned by the mocked create
const mockAxiosInstance = mockedAxiosCreate();


describe('API Service', () => {

	let consoleLogSpy: jest.SpyInstance; // Declare the spy variable for log
	let consoleErrorSpy: jest.SpyInstance; // Declare the spy variable for error

	// Define mock data structures based on interfaces in api.ts
	const mockCoin: Coin = {
		id: 'mockCoinId',
		name: 'Mock Coin',
		symbol: 'MCK',
		decimals: 8,
		description: 'A mock coin for testing',
		icon_url: 'http://example.com/icon.png',
		tags: ['mock', 'test'],
		price: 100,
		daily_volume: 1000000,
		website: 'http://example.com',
		created_at: new Date().toISOString(),
	};

	const mockTradePayload: TradePayload = {
		from_coin_id: 'coin1',
		to_coin_id: 'coin2',
		amount: 1.5,
		signed_transaction: 'mockSignedTx',
	};

	const mockResponses = {
		submitTrade: { transaction_hash: 'txHash456' },
		tradeQuote: {
			estimatedAmount: '150.5',
			exchangeRate: '100.33',
			fee: '0.01',
			priceImpact: '0.05',
			routePlan: ['RouteA', 'RouteB'],
			inputMint: 'inputMintAddress',
			outputMint: 'outputMintAddress',
		} as TradeQuoteResponse,
		walletBalance: {
			balances: [{ id: 'mockCoinId', amount: 10 }],
		} as WalletBalanceResponse,
		priceHistory: {
			data: {
				items: [{ unixTime: Date.now() / 1000, value: 100 }],
			},
			success: true,
		} as PriceHistoryResponse,
		tradeStatus: {
			status: 'completed',
			transaction_hash: 'txHash456',
			timestamp: new Date().toISOString(),
			from_amount: '1.5',
			to_amount: '100.5',
			error_message: null
		},
		tokenPrices: { coin1: 10, coin2: 20, coin3: 30 }
	};

	beforeEach(() => {
		// Silence console.log and console.error before each test
		consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
		consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

		// Clear calls on the *instance's* methods
		mockAxiosInstance.get.mockClear();
		mockAxiosInstance.post.mockClear();
		// Clear calls on the create method itself if needed
		mockedAxiosCreate.mockClear();
	});

	// Add afterEach to restore the original console methods
	afterEach(() => {
		consoleLogSpy.mockRestore();
		consoleErrorSpy.mockRestore(); // Restore error spy
	});

	describe('Token-related endpoints', () => {
		it('handles token operations successfully', async () => {
			// Test getAvailableCoins with trending
			mockAxiosInstance.get.mockResolvedValueOnce({ data: [{ ...mockCoin, tags: ['trending'] }] });
			const trendingResult = await api.getAvailableCoins(true);
			expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/tokens', { params: { trending: 'true' } });
			expect(trendingResult[0].tags).toContain('trending');

			// Test getCoinByID
			mockAxiosInstance.get.mockResolvedValueOnce({ data: mockCoin });
			const coinResult = await api.getCoinByID('mockCoinId');
			expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/tokens/mockCoinId');
			expect(coinResult).toEqual(mockCoin);

			// Test getTokenPrices
			const tokenIds = ['coin1', 'coin2', 'coin3'];
			mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponses.tokenPrices });
			const pricesResult = await api.getTokenPrices(tokenIds);
			expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/tokens/prices', {
				params: { ids: tokenIds.join(',') }
			});
			expect(pricesResult).toEqual(mockResponses.tokenPrices);
		});

		it('handles token operation errors', async () => {
			// Test getAvailableCoins error
			mockAxiosInstance.get.mockRejectedValueOnce({ response: { status: 404 }, message: 'Not Found' });
			await expect(api.getAvailableCoins()).rejects.toMatchObject({
				message: 'Not Found',
				status: 404,
			});

			// Test getCoinByID error
			mockAxiosInstance.get.mockRejectedValueOnce({ response: { status: 404 }, message: 'Not Found' });
			await expect(api.getCoinByID('invalidId')).rejects.toMatchObject({
				message: 'Not Found',
				status: 404,
			});

			// Test getTokenPrices error
			mockAxiosInstance.get.mockRejectedValueOnce({ response: { status: 503 }, message: 'Service Unavailable' });
			await expect(api.getTokenPrices(['coin1'])).rejects.toMatchObject({
				message: 'Service Unavailable',
				status: 503,
			});
		});
	});

	describe('Trade-related endpoints', () => {
		it('handles trade operations successfully', async () => {
			// Test submitTrade
			mockAxiosInstance.post.mockResolvedValueOnce({ data: mockResponses.submitTrade });
			const submitResult = await api.submitTrade(mockTradePayload);
			expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/trades/submit', mockTradePayload);
			expect(submitResult).toEqual(mockResponses.submitTrade);

			// Test getTradeQuote
			mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponses.tradeQuote });
			const quoteResult = await api.getTradeQuote('coin1', 'coin2', '10');
			expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/trades/quote', {
				params: {
					from_coin_id: 'coin1',
					to_coin_id: 'coin2',
					amount: '10'
				}
			});
			expect(quoteResult).toEqual(mockResponses.tradeQuote);

			// Test getTradeStatus
			mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponses.tradeStatus });
			const statusResult = await api.getTradeStatus('txHash456');
			expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/trades/status/txHash456');
			expect(statusResult).toEqual(mockResponses.tradeStatus);
		});

		it('handles trade operation errors', async () => {
			// Test submitTrade error
			mockAxiosInstance.post.mockRejectedValueOnce({
				response: { status: 500, data: { message: 'Server Error' } },
				message: 'Request failed'
			});
			await expect(api.submitTrade(mockTradePayload)).rejects.toMatchObject({
				message: 'Request failed',
				status: 500,
				data: { message: 'Server Error' }
			});

			// Test getTradeQuote error
			mockAxiosInstance.get.mockRejectedValueOnce({ response: { status: 400 }, message: 'Bad Request' });
			await expect(api.getTradeQuote('c1', 'c2', '1')).rejects.toMatchObject({
				message: 'Bad Request',
				status: 400,
			});

			// Test getTradeStatus error
			mockAxiosInstance.get.mockRejectedValueOnce({
				response: { status: 404, data: { message: 'Transaction not found' } },
				message: 'Not Found'
			});
			await expect(api.getTradeStatus('invalidTxHash')).rejects.toMatchObject({
				message: 'Not Found',
				status: 404,
				data: { message: 'Transaction not found' }
			});
		});
	});

	describe('Wallet and Price History endpoints', () => {
		it('handles wallet and price operations successfully', async () => {
			// Test getWalletBalance
			mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponses.walletBalance });
			const balanceResult = await api.getWalletBalance('wallet123');
			expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/wallets/wallet123/balance');
			expect(balanceResult).toEqual(mockResponses.walletBalance);

			// Test getPriceHistory
			mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponses.priceHistory });
			const historyResult = await api.getPriceHistory('addr1', 'daily', 't1', 't2', 'wallet');
			expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/price/history', {
				params: {
					address: 'addr1',
					type: 'daily',
					time_from: 't1',
					time_to: 't2',
					address_type: 'wallet'
				}
			});
			expect(historyResult).toEqual(mockResponses.priceHistory);
		});

		it('handles wallet and price operation errors', async () => {
			// Test getWalletBalance error
			mockAxiosInstance.get.mockRejectedValueOnce({ response: { status: 401 }, message: 'Unauthorized' });
			await expect(api.getWalletBalance('wallet123')).rejects.toMatchObject({
				message: 'Unauthorized',
				status: 401,
			});

			// Test getPriceHistory error
			mockAxiosInstance.get.mockRejectedValueOnce({ message: 'Network Error' });
			await expect(api.getPriceHistory('a', 't', 't1', 't2', 'at')).rejects.toMatchObject({
				message: 'Network Error',
				status: undefined,
			});
		});
	});

}); 
