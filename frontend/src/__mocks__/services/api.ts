const api = {
	submitTrade: jest.fn().mockResolvedValue({ transaction_hash: 'mock_tx_hash' }),
	getTradeStatus: jest.fn().mockResolvedValue({
		status: 'completed',
		transaction_hash: 'mock_tx_hash',
		timestamp: new Date().toISOString(),
		from_amount: '1.5',
		to_amount: '100.5'
	}),
	getTokenPrices: jest.fn().mockResolvedValue({}),
	getTradeQuote: jest.fn().mockResolvedValue({
		estimatedAmount: '0',
		fee: '0',
		priceImpact: '0',
		exchangeRate: '0',
		routePlan: []
	}),
};

export default api; 