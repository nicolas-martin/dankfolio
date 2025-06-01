import { mockSolCoin, mockWenCoin } from '../testData';
import { SOLANA_ADDRESS } from '@/utils/constants';

export const mockCoinStoreReturn = {
	availableCoins: [mockSolCoin, mockWenCoin],
	coinMap: {
		[mockSolCoin.mintAddress]: mockSolCoin,
		[mockWenCoin.mintAddress]: mockWenCoin,
	},
	isLoading: false,
	error: null,
	setAvailableCoins: jest.fn(),
	setCoin: jest.fn(),
	fetchAvailableCoins: jest.fn(),
	getCoinByID: jest.fn().mockImplementation(async (mintAddress: string) => {
		if (mintAddress === mockSolCoin.mintAddress) return mockSolCoin;
		if (mintAddress === mockWenCoin.mintAddress) return mockWenCoin;
		if (mintAddress === SOLANA_ADDRESS) return { ...mockSolCoin, mintAddress: SOLANA_ADDRESS, name: 'Solana', symbol: 'SOL' };
		return null;
	}),
};

export const useCoinStore = jest.fn(() => mockCoinStoreReturn); 