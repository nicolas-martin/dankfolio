import { mockFromCoin, mockToCoin } from '../testData';
import { SOLANA_ADDRESS } from '@/utils/constants';

export const mockCoinStoreReturn = {
	availableCoins: [mockFromCoin, mockToCoin],
	coinMap: {
		[mockFromCoin.id]: mockFromCoin,
		[mockToCoin.id]: mockToCoin,
	},
	isLoading: false,
	error: null,
	setAvailableCoins: jest.fn(),
	setCoin: jest.fn(),
	fetchAvailableCoins: jest.fn(),
	getCoinByID: jest.fn().mockImplementation(async (id: string) => {
		if (id === mockFromCoin.id) return mockFromCoin;
		if (id === mockToCoin.id) return mockToCoin;
		if (id === SOLANA_ADDRESS) return { ...mockFromCoin, id: SOLANA_ADDRESS, name: 'Solana', symbol: 'SOL' };
		return null;
	}),
};

export const useCoinStore = jest.fn(() => mockCoinStoreReturn); 