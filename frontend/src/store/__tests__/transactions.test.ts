import { useTransactionsStore } from '@/store/transactions';
import { grpcApi } from '@/services/grpcApi';
import { Transaction } from '@/types'; // Assuming Transaction type is available

// Mock grpcApi
jest.mock('@/services/grpcApi', () => ({
  grpcApi: {
    listTrades: jest.fn(),
  },
}));

// Helper to get a clean initial state for the store before each test
const getInitialState = () => {
  useTransactionsStore.setState({
    transactions: [],
    isLoading: false,
    error: null,
    totalCount: 0,
    hasFetched: false,
  });
  return useTransactionsStore.getState();
};


describe('useTransactionsStore', () => {
  beforeEach(() => {
    // Reset the store to its initial state before each test
    getInitialState();
    // Clear mock call history
    (grpcApi.listTrades as jest.Mock).mockClear();
  });

  it('should have correct initial state', () => {
    const state = useTransactionsStore.getState();
    expect(state.transactions).toEqual([]);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.totalCount).toBe(0);
    expect(state.hasFetched).toBe(false);
  });

  describe('fetchRecentTransactions', () => {
    const mockUserId = 'user1';
    const mockTransactions: Transaction[] = [
      { id: '1', type: 'SWAP', fromCoinSymbol: 'BTC', toCoinSymbol: 'ETH', amount: 1, status: 'COMPLETED', date: new Date().toISOString(), transactionHash: 'tx1' },
      { id: '2', type: 'TRANSFER', fromCoinSymbol: 'SOL', toCoinSymbol: '', amount: 10, status: 'PENDING', date: new Date().toISOString(), transactionHash: 'tx2' },
    ];
    const mockTotalCount = mockTransactions.length;

    it('should set isLoading to true, then false, and update state on successful fetch', async () => {
      (grpcApi.listTrades as jest.Mock).mockResolvedValueOnce({
        transactions: mockTransactions,
        totalCount: mockTotalCount,
      });

      const fetchPromise = useTransactionsStore.getState().fetchRecentTransactions(mockUserId);

      // Check isLoading is true immediately after call (before await)
      expect(useTransactionsStore.getState().isLoading).toBe(true);
      expect(useTransactionsStore.getState().error).toBeNull();

      await fetchPromise;

      const state = useTransactionsStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.transactions).toEqual(mockTransactions);
      expect(state.totalCount).toBe(mockTotalCount);
      expect(state.hasFetched).toBe(true);
      expect(state.error).toBeNull();
      expect(grpcApi.listTrades).toHaveBeenCalledWith({
        userId: mockUserId,
        offset: 0,
        sortBy: 'created_at',
        sortDesc: true,
      });
    });

    it('should set error and isLoading to false, hasFetched to true on fetch failure', async () => {
      const errorMessage = 'Network Error';
      (grpcApi.listTrades as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      const fetchPromise = useTransactionsStore.getState().fetchRecentTransactions(mockUserId);

      expect(useTransactionsStore.getState().isLoading).toBe(true);

      await fetchPromise;

      const state = useTransactionsStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe(errorMessage);
      expect(state.transactions).toEqual([]); // Should remain empty or be reset
      expect(state.totalCount).toBe(0); // Should remain 0 or be reset
      expect(state.hasFetched).toBe(true);
    });

    it('should set a generic error message if error is not an instance of Error', async () => {
        (grpcApi.listTrades as jest.Mock).mockRejectedValueOnce('A string error');
        await useTransactionsStore.getState().fetchRecentTransactions(mockUserId);
        const state = useTransactionsStore.getState();
        expect(state.error).toBe('An unknown error occurred');
      });
  });
});
