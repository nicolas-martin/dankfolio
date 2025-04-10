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

	const mockSubmitTradeResponse = {
		transaction_hash: 'txHash456',
	};

	const mockTradeQuoteResponse: TradeQuoteResponse = {
		estimatedAmount: '150.5',
		exchangeRate: '100.33',
		fee: '0.01',
		priceImpact: '0.05',
		routePlan: ['RouteA', 'RouteB'],
		inputMint: 'inputMintAddress',
		outputMint: 'outputMintAddress',
	};

	const mockWalletBalanceResponse: WalletBalanceResponse = {
		balances: [{ id: 'mockCoinId', amount: 10 }],
	};

	const mockPriceHistoryResponse: PriceHistoryResponse = {
		data: {
			items: [{ unixTime: Date.now() / 1000, value: 100 }],
		},
		success: true,
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

	it('submitTrade successfully calls POST /api/trades/submit', async () => {
		mockAxiosInstance.post.mockResolvedValue({ data: mockSubmitTradeResponse });

		const result = await api.submitTrade(mockTradePayload);

		expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
		expect(mockAxiosInstance.post).toHaveBeenCalledWith(
			'/api/trades/submit',
			mockTradePayload,
			expect.objectContaining({ headers: expect.any(Object) })
		);
		expect(result).toEqual(mockSubmitTradeResponse);
	});

	it('submitTrade handles API errors', async () => {
		const mockError = { response: { status: 500, data: { message: 'Server Error' } }, message: 'Request failed' };
		mockAxiosInstance.post.mockRejectedValue(mockError);

		await expect(api.submitTrade(mockTradePayload)).rejects.toMatchObject({
			message: 'Request failed',
			status: 500,
			data: { message: 'Server Error' }
		});
		expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
	});

	it('getAvailableCoins successfully calls GET /api/tokens with trending=true param when trendingOnly is true', async () => {
		const mockTrendingCoins: Coin[] = [{ ...mockCoin, tags: ['trending'] }];
		mockAxiosInstance.get.mockResolvedValue({ data: mockTrendingCoins });

		const result = await api.getAvailableCoins(true);

		expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
		expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/tokens', { params: { trending: 'true' } });
		expect(result).toEqual(mockTrendingCoins);
	});

	it('getAvailableCoins handles API errors', async () => {
		const mockError = { response: { status: 404 }, message: 'Not Found' };
		mockAxiosInstance.get.mockRejectedValue(mockError);

		await expect(api.getAvailableCoins()).rejects.toMatchObject({
			message: 'Not Found',
			status: 404,
		});
		// Check it was called with empty params when no argument provided
		expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/tokens', { params: {} });
	});


	it('getTradeQuote successfully calls GET /api/trades/quote with params', async () => {
		mockAxiosInstance.get.mockResolvedValue({ data: mockTradeQuoteResponse });
		const fromCoin = 'coin1';
		const toCoin = 'coin2';
		const amount = '10';

		const result = await api.getTradeQuote(fromCoin, toCoin, amount);

		expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
		expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/trades/quote', {
			params: {
				from_coin_id: fromCoin,
				to_coin_id: toCoin,
				amount
			}
		});
		expect(result).toEqual(mockTradeQuoteResponse);
	});

	it('getTradeQuote handles API errors', async () => {
		const mockError = { response: { status: 400 }, message: 'Bad Request' };
		mockAxiosInstance.get.mockRejectedValue(mockError);

		await expect(api.getTradeQuote('c1', 'c2', '1')).rejects.toMatchObject({
			message: 'Bad Request',
			status: 400,
		});
		expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/trades/quote', expect.any(Object));
	});


	it('getPriceHistory successfully calls GET /api/price/history with params', async () => {
		mockAxiosInstance.get.mockResolvedValue({ data: mockPriceHistoryResponse });
		const address = 'addr1';
		const type = 'daily';
		const timeFrom = 't1';
		const timeTo = 't2';
		const addressType = 'wallet';

		const result = await api.getPriceHistory(address, type, timeFrom, timeTo, addressType);

		expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
		expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/price/history', {
			params: {
				address,
				type,
				time_from: timeFrom,
				time_to: timeTo,
				address_type: addressType
			}
		});
		expect(result).toEqual(mockPriceHistoryResponse);
	});

	it('getPriceHistory handles API errors', async () => {
		const mockError = { message: 'Network Error' }; // No response object
		mockAxiosInstance.get.mockRejectedValue(mockError);

		await expect(api.getPriceHistory('a', 't', 't1', 't2', 'at')).rejects.toMatchObject({
			message: 'Network Error',
			status: undefined, // No status if response is missing
		});
		expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/price/history', expect.any(Object));
	});


	it('getWalletBalance successfully calls GET /api/wallets/{address}/balance', async () => {
		const address = 'wallet123';
		mockAxiosInstance.get.mockResolvedValue({ data: mockWalletBalanceResponse });

		const result = await api.getWalletBalance(address);

		expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
		expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/api/wallets/${address}/balance`);
		expect(result).toEqual(mockWalletBalanceResponse);
	});

	it('getWalletBalance handles API errors', async () => {
		const address = 'wallet123';
		const mockError = { response: { status: 401 }, message: 'Unauthorized' };
		mockAxiosInstance.get.mockRejectedValue(mockError);

		await expect(api.getWalletBalance(address)).rejects.toMatchObject({
			message: 'Unauthorized',
			status: 401,
		});
		expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/api/wallets/${address}/balance`);
	});


	it('getCoinByID successfully calls GET /api/tokens/{id}', async () => {
		const id = 'mockCoinId';
		mockAxiosInstance.get.mockResolvedValue({ data: mockCoin });

		const result = await api.getCoinByID(id);

		expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
		expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/api/tokens/${id}`);
		expect(result).toEqual(mockCoin);
	});

	it('getCoinByID handles API errors', async () => {
		const id = 'mockCoinId';
		const mockError = { response: { status: 404 }, message: 'Not Found' };
		mockAxiosInstance.get.mockRejectedValue(mockError);

		await expect(api.getCoinByID(id)).rejects.toMatchObject({
			message: 'Not Found',
			status: 404,
		});
		expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/api/tokens/${id}`);
	});


	it('getTokenPrices successfully calls GET /api/tokens/prices with joined IDs', async () => {
		const tokenIds = ['coin1', 'coin2', 'coin3'];
		const mockPrices: Record<string, number> = { coin1: 10, coin2: 20, coin3: 30 };
		mockAxiosInstance.get.mockResolvedValue({ data: mockPrices });

		const result = await api.getTokenPrices(tokenIds);

		expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
		expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/tokens/prices', {
			params: {
				ids: tokenIds.join(',')
			}
		});
		expect(result).toEqual(mockPrices);
	});

	it('getTokenPrices handles API errors', async () => {
		const tokenIds = ['coin1', 'coin2'];
		const mockError = { response: { status: 503 }, message: 'Service Unavailable' };
		mockAxiosInstance.get.mockRejectedValue(mockError);

		await expect(api.getTokenPrices(tokenIds)).rejects.toMatchObject({
			message: 'Service Unavailable',
			status: 503,
		});
		expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/tokens/prices', expect.any(Object));
	});

	it('should execute a trade successfully', async () => {
		const mockTradePayload: TradePayload = {
			from_coin_id: 'SOL',
			to_coin_id: 'WEN',
			amount: 1000000000,
			signed_transaction: 'mock_signed_tx'
		};

		const result = await api.submitTrade(mockTradePayload);
		expect(result).toEqual({ transaction_hash: 'mock_tx_hash' });
	});

	it('should handle trade execution errors', async () => {
		const mockTradePayload: TradePayload = {
			from_coin_id: 'SOL',
			to_coin_id: 'WEN',
			amount: 1000000000,
			signed_transaction: 'mock_signed_tx'
		};

		await expect(api.submitTrade(mockTradePayload)).rejects.toMatchObject({
			message: 'Trade execution failed'
		});
	});

}); 
