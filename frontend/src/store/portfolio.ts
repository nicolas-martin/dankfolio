import { create } from 'zustand';
import { StateCreator } from 'zustand';
import { TokenInfo, WalletBalanceResponse } from '../services/api';
import { Wallet, Coin } from '../types';
import api from '../services/api';
import { secureStorage } from '../services/solana';
import { useCoinStore } from './coins';

interface PortfolioState {
	wallet: Wallet | null;
	porfolio: WalletBalanceResponse | null;
	isLoading: boolean;
	error: string | null;

	// Actions
	setWallet: (wallet: Wallet | null) => void;
	setPortfolio: (balance: WalletBalanceResponse | null) => void;
	fetchPorfolioBalance: (address: string) => Promise<void>;
}

export const usePortfolioStore = create<PortfolioState>((set: any, get: any) => ({
	wallet: null,
	porfolio: null,
	isLoading: false,
	error: null,

	setWallet: (wallet: Wallet | null) => set({ wallet }),
	setPortfolio: (portfolio: WalletBalanceResponse | null) => set({ portfolio: portfolio }),

	fetchPorfolioBalance: async (address: string) => {
		try {
			set({ isLoading: true, error: null });
			const balance = await api.getWalletBalance(address);

			// Pre-fetch token data for all tokens, including SOL
			const coinStore = useCoinStore.getState();
			await Promise.all(balance.tokens.map(token => coinStore.getCoinByID(token.id)));

			set({ porfolio: balance });
		} catch (error) {
			set({ error: (error as Error).message });
			console.error('❌ Error fetching wallet balance:', error);
		} finally {
			set({ isLoading: false });
		}
	},
	clearWallet: async () => {
		try {
			await secureStorage.deleteWallet();
			set({ wallet: null, porfolio: null });
		} catch (error) {
			set({ error: (error as Error).message });
			console.error('Error clearing wallet:', error);
		} finally {
			set({ isLoading: false });
		}
	},
}))