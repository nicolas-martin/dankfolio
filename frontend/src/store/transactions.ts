import { create } from 'zustand';
import { Transaction } from '@/types';
import { grpcApi } from '@/services/grpcApi';

interface TransactionsState {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  hasFetched: boolean;
  fetchRecentTransactions: (userId: string, limit?: number) => Promise<void>;
  clearTransactions: () => void;
}

const initialState = {
  transactions: [],
  isLoading: false,
  error: null,
  totalCount: 0,
  hasFetched: false,
};

export const useTransactionsStore = create<TransactionsState>((set) => ({
  ...initialState,
  fetchRecentTransactions: async (userId: string, limit: number = 10) => {
    set({ isLoading: true, error: null });
    try {
      const response = await grpcApi.listTrades({
        userId,
        limit,
        offset: 0,
        sortBy: 'created_at',
        sortDesc: true,
      });
      set({
        transactions: response.transactions,
        totalCount: response.totalCount,
        isLoading: false,
        hasFetched: true,
      });
    } catch (err) {
      let errorMessage = 'Failed to fetch recent transactions.';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      set({ error: errorMessage, isLoading: false, hasFetched: true });
    }
  },
  clearTransactions: () => {
    set(initialState);
  },
}));
