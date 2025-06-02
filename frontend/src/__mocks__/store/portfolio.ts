import { mockFromPortfolioToken } from '../testData';
import { Wallet } from '@/types';

const mockWallet: Wallet = {
	address: 'TestWalletAddress12345',
};

export const mockPortfolioStoreReturn = {
	wallet: mockWallet as Wallet | null,
	isLoading: false,
	error: null,
	tokens: [mockFromPortfolioToken],
	setWallet: jest.fn(),
	clearWallet: jest.fn(),
	fetchPortfolioBalance: jest.fn(),
	getState: jest.fn(),
};

// Set up the getState method to return the store itself
mockPortfolioStoreReturn.getState.mockReturnValue(mockPortfolioStoreReturn);

export const usePortfolioStore = Object.assign(
	jest.fn(() => mockPortfolioStoreReturn),
	{
		getState: jest.fn(() => mockPortfolioStoreReturn)
	}
); 