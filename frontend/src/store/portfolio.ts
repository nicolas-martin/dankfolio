import { create } from 'zustand';
import { WalletBalanceResponse } from '../services/api';
import { Wallet } from '../types';
import api from '../services/api';
import { secureStorage } from '../services/solana';
import { useCoinStore } from './coins';

interface PortfolioState {
	wallet: Wallet | null;
	portfolio: WalletBalanceResponse | null;
	isLoading: boolean;
	error: string | null;

	// Actions
	setWallet: (wallet: Wallet | null) => void;
	setPortfolio: (portfolio: WalletBalanceResponse | null) => void;
	fetchPortfolioBalance: (address: string) => Promise<void>;
	clearWallet: () => Promise<void>;
}

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
	wallet: null,
	portfolio: null,
	isLoading: false,
	error: null,

	setWallet: (wallet: Wallet | null) => set({ wallet }),
	setPortfolio: (portfolio: WalletBalanceResponse | null) => set({ portfolio }),

	fetchPortfolioBalance: async (address: string) => {
		try {
			set({ isLoading: true, error: null });
			const balance = await api.getWalletBalance(address);

			// Pre-fetch token data for all tokens, including SOL
			const coinStore = useCoinStore.getState();
			await Promise.all(balance.balances.map(token => coinStore.getCoinByID(token.id)));

			set({ portfolio: balance });
		} catch (error) {
			set({ error: (error as Error).message });
			console.error('❌ Error fetching wallet balance:', error);
		} finally {
			set({ isLoading: false });
		}
	},

	clearWallet: async () => {
		try {
			set({ isLoading: true });
			await secureStorage.deleteWallet();
			set({ wallet: null, portfolio: null });
		} catch (error) {
			set({ error: (error as Error).message });
			console.error('Error clearing wallet:', error);
		} finally {
			set({ isLoading: false });
		}
	},
}));

