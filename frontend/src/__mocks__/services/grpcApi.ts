const grpcApi = {
	submitSwap: jest.fn(),
	getSwapStatus: jest.fn(),
	getAvailableCoins: jest.fn(),
	getTradeQuote: jest.fn(),
	getPriceHistory: jest.fn(),
	getWalletBalance: jest.fn(),
	getCoinByID: jest.fn(),
	getTokenPrices: jest.fn(),
	prepareTokenTransfer: jest.fn(),
	submitTokenTransfer: jest.fn(),
};

export default grpcApi; 