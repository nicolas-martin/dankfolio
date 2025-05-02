import { mockFromCoin, mockToCoin } from '../testData';
import { SOLANA_ADDRESS } from '@/utils/constants';

export const mockCoinStoreReturn = {
	availableCoins: [mockFromCoin, mockToCoin],
	coinMap: {
		[mockFromCoin.mintAddress]: mockFromCoin,
		[mockToCoin.mintAddress]: mockToCoin,
	},
	isLoading: false,
	error: null,
	setAvailableCoins: jest.fn(),
	setCoin: jest.fn(),
	fetchAvailableCoins: jest.fn(),
	getCoinByID: jest.fn().mockImplementation(async (mintAddress: string) => {
		if (mintAddress === mockFromCoin.mintAddress) return mockFromCoin;
		if (mintAddress === mockToCoin.mintAddress) return mockToCoin;
		if (mintAddress === SOLANA_ADDRESS) return { ...mockFromCoin, mintAddress: SOLANA_ADDRESS, name: 'Solana', symbol: 'SOL' };
		return null;
	}),
};

export const useCoinStore = jest.fn(() => mockCoinStoreReturn); 