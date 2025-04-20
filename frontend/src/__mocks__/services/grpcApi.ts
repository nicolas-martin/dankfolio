const grpcApi = {
	submitSwap: jest.fn(),
	getSwapStatus: jest.fn(),
	getAvailableCoins: jest.fn(),
	getSwapQuote: jest.fn().mockResolvedValue({
		estimatedAmount: "1000000",
		exchangeRate: "1.5",
		fee: "0.1",
		priceImpact: "0.05",
		routePlan: "Direct",
		inputMint: "SOL",
		outputMint: "USDC"
	}),
	getPriceHistory: jest.fn(),
	getWalletBalance: jest.fn(),
	getCoinByID: jest.fn(),
	getTokenPrices: jest.fn(),
	prepareTokenTransfer: jest.fn(),
	submitTokenTransfer: jest.fn(),
};

export default grpcApi; 