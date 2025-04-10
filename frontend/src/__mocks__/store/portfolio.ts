import { mockWallet, mockFromPortfolioToken } from '../testData';

export const mockPortfolioStoreReturn = {
	wallet: mockWallet,
	isLoading: false,
	error: null,
	tokens: [mockFromPortfolioToken],
	setWallet: jest.fn(),
	clearWallet: jest.fn(),
	fetchPortfolioBalance: jest.fn(),
};

export const usePortfolioStore = jest.fn(() => mockPortfolioStoreReturn); 