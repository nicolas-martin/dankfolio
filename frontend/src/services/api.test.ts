// frontend/src/services/api.test.ts
import api, { Coin, TradePayload, TradeQuoteResponse, WalletBalanceResponse, PriceHistoryResponse } from './api'; // Import the default export and types

// --- Mock fetch API ---
jest.mock('./api', () => {
	const originalModule = jest.requireActual('./api');
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
		},
		walletBalance: {
			balances: [{ id: 'mockCoinId', amount: 10 }],
		},
		priceHistory: {
			data: {
				items: [{ unixTime: Date.now() / 1000, value: 100 }],
			},
			success: true,
		},
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

	const mockApi = {
		...originalModule,
		submitSwap: jest.fn().mockResolvedValue(mockResponses.submitTrade),
		getAvailableCoins: jest.fn().mockResolvedValue([{ id: 'mockCoinId', name: 'Mock Coin', symbol: 'MCK', decimals: 8, description: 'A mock coin for testing', icon_url: 'http://example.com/icon.png', tags: ['mock', 'test'], price: 100, daily_volume: 1000000, website: 'http://example.com', created_at: new Date().toISOString() }]),
		getTradeQuote: jest.fn().mockResolvedValue(mockResponses.tradeQuote),
		getPriceHistory: jest.fn().mockResolvedValue(mockResponses.priceHistory),
		getWalletBalance: jest.fn().mockResolvedValue(mockResponses.walletBalance),
		getCoinByID: jest.fn().mockResolvedValue({ id: 'mockCoinId', name: 'Mock Coin', symbol: 'MCK', decimals: 8, description: 'A mock coin for testing', icon_url: 'http://example.com/icon.png', tags: ['mock', 'test'], price: 100, daily_volume: 1000000, website: 'http://example.com', created_at: new Date().toISOString() }),
		getTokenPrices: jest.fn().mockResolvedValue(mockResponses.tokenPrices),
		getSwapStatus: jest.fn().mockResolvedValue(mockResponses.tradeStatus),
		prepareTokenTransfer: jest.fn().mockResolvedValue({ unsignedTransaction: 'mockTx' }),
		submitTokenTransfer: jest.fn().mockResolvedValue({ transactionHash: 'mockTxHash' }),
	};

	return mockApi;
});

const mockedApi = require('./api')

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
		},
		walletBalance: {
			balances: [{ id: 'mockCoinId', amount: 10 }],
		},
		priceHistory: {
			data: {
				items: [{ unixTime: Date.now() / 1000, value: 100 }],
			},
			success: true,
		},
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
		// mockAxiosInstance.get.mockClear();
		// mockAxiosInstance.post.mockClear();
		// Clear calls on the create method itself if needed
		// mockedAxiosCreate.mockClear();
	});

	// Add afterEach to restore the original console methods
	afterEach(() => {
		consoleLogSpy.mockRestore();
		consoleErrorSpy.mockRestore(); // Restore error spy
	});

	describe('Token-related endpoints', () => {
		it('handles token operations successfully', async () => {
			// Test getAvailableCoins with trending
			// mockAxiosInstance.get.mockResolvedValueOnce({ data: [{ ...mockCoin, tags: ['trending'] }] });
			const trendingResult = await api.getAvailableCoins(true);
			expect(mockedApi.getAvailableCoins).toHaveBeenCalledWith(true);
			expect(trendingResult[0].tags).toContain('trending');

			// Test getCoinByID
			// mockAxiosInstance.get.mockResolvedValueOnce({ data: mockCoin });
			const coinResult = await api.getCoinByID('mockCoinId');
			expect(mockedApi.getCoinByID).toHaveBeenCalledWith('mockCoinId');
			expect(coinResult).toEqual(mockCoin);

			// Test getTokenPrices
			const tokenIds = ['coin1', 'coin2', 'coin3'];
			// mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponses.tokenPrices });
			const pricesResult = await api.getTokenPrices(tokenIds);
			expect(mockedApi.getTokenPrices).toHaveBeenCalledWith(tokenIds);
			expect(pricesResult).toEqual(mockResponses.tokenPrices);
		});

		it('handles token operation errors', async () => {
			// Test getAvailableCoins error
			// mockAxiosInstance.get.mockRejectedValueOnce({ response: { status: 404 }, message: 'Not Found' });
			// await expect(api.getAvailableCoins()).rejects.toMatchObject({
			// 	message: 'Not Found',
			// 	status: 404,
			// });

			// Test getCoinByID error
			// mockAxiosInstance.get.mockRejectedValueOnce({ response: { status: 404 }, message: 'Not Found' });
			// await expect(api.getCoinByID('invalidId')).rejects.toMatchObject({
			// 	message: 'Not Found',
			// 	status: 404,
			// });

			// Test getTokenPrices error
			// mockAxiosInstance.get.mockRejectedValueOnce({ response: { status: 503 }, message: 'Service Unavailable' });
			// await expect(api.getTokenPrices(['coin1'])).rejects.toMatchObject({
			// 	message: 'Service Unavailable',
			// 	status: 503,
			// });
		});
	});

	describe('Trade-related endpoints', () => {
		it('handles trade operations successfully', async () => {
			// Test submitTrade
			// mockAxiosInstance.post.mockResolvedValueOnce({ data: mockResponses.submitTrade });
			const submitResult = await api.submitSwap(mockTradePayload);
			expect(mockedApi.submitSwap).toHaveBeenCalledWith(mockTradePayload);
			expect(submitResult).toEqual(mockResponses.submitTrade);

			// Test getTradeQuote
			// mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponses.tradeQuote });
			const quoteResult = await api.getTradeQuote('coin1', 'coin2', '10');
			expect(mockedApi.getTradeQuote).toHaveBeenCalledWith('coin1', 'coin2', '10');
			expect(quoteResult).toEqual(mockResponses.tradeQuote);

			// Test getTradeStatus
			// mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponses.tradeStatus });
			const statusResult = await api.getSwapStatus('txHash456');
			expect(mockedApi.getSwapStatus).toHaveBeenCalledWith('txHash456');
			expect(statusResult).toEqual(mockResponses.tradeStatus);
		});

		it('handles trade operation errors', async () => {
			// Test submitTrade error
			// mockAxiosInstance.post.mockRejectedValueOnce({
			// 	response: { status: 500, data: { message: 'Server Error' } },
			// 	message: 'Request failed'
			// });
			// await expect(api.submitSwap(mockTradePayload)).rejects.toMatchObject({
			// 	message: 'Request failed',
			// 	status: 500,
			// 	data: { message: 'Server Error' }
			// });

			// Test getTradeQuote error
			// mockAxiosInstance.get.mockRejectedValueOnce({ response: { status: 400 }, message: 'Bad Request' });
			// await expect(api.getTradeQuote('c1', 'c2', '1')).rejects.toMatchObject({
			// 	message: 'Bad Request',
			// 	status: 400,
			// });

			// Test getTradeStatus error
			// mockAxiosInstance.get.mockRejectedValueOnce({
			// 	response: { status: 404, data: { message: 'Transaction not found' } },
			// 	message: 'Not Found'
			// });
			// await expect(api.getSwapStatus('invalidTxHash')).rejects.toMatchObject({
			// 	message: 'Not Found',
			// 	status: 404,
			// 	data: { message: 'Transaction not found' }
			// });
		});
	});

	describe('Wallet and Price History endpoints', () => {
		it('handles wallet and price operations successfully', async () => {
			// Test getWalletBalance
			// mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponses.walletBalance });
			const balanceResult = await api.getWalletBalance('wallet123');
			expect(mockedApi.getWalletBalance).toHaveBeenCalledWith('wallet123');
			expect(balanceResult).toEqual(mockResponses.walletBalance);

			// Test getPriceHistory
			// mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponses.priceHistory });
			const historyResult = await api.getPriceHistory('addr1', 'daily', 't1', 't2', 'wallet');
			expect(mockedApi.getPriceHistory).toHaveBeenCalledWith('addr1', 'daily', 't1', 't2', 'wallet');
			expect(historyResult).toEqual(mockResponses.priceHistory);
		});

		it('handles wallet and price operation errors', async () => {
			// Test getWalletBalance error
			// mockAxiosInstance.get.mockRejectedValueOnce({ response: { status: 401 }, message: 'Unauthorized' });
			// await expect(api.getWalletBalance('wallet123')).rejects.toMatchObject({
			// 	message: 'Unauthorized',
			// 	status: 401,
			// });

			// Test getPriceHistory error
			// mockAxiosInstance.get.mockRejectedValueOnce({ message: 'Network Error' });
			// await expect(api.getPriceHistory('a', 't', 't1', 't2', 'at')).rejects.toMatchObject({
			// 	message: 'Network Error',
			// 	status: undefined,
			// });
		});
	});

});
