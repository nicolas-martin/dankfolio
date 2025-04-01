import { create } from 'zustand';
import { StateCreator } from 'zustand';
import { TokenInfo, WalletBalanceResponse } from '../services/api';
import { Wallet, Coin } from '../types';
import api from '../services/api';
import { secureStorage } from '../services/solana';

interface PortfolioState {
  wallet: Wallet | null;
  walletBalance: WalletBalanceResponse | null;
  solCoin: Coin | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setWallet: (wallet: Wallet | null) => void;
  setWalletBalance: (balance: WalletBalanceResponse | null) => void;
  setSolCoin: (coin: Coin | null) => void;
  fetchWalletBalance: (address: string) => Promise<void>;
  loadWallet: () => Promise<void>;
  clearWallet: () => Promise<void>;
}

export const usePortfolioStore = create<PortfolioState>((set: any, get: any) => ({
  wallet: null,
  walletBalance: null,
  solCoin: null,
  isLoading: false,
  error: null,

  setWallet: (wallet: Wallet | null) => set({ wallet }),
  setWalletBalance: (balance: WalletBalanceResponse | null) => set({ walletBalance: balance }),
  setSolCoin: (coin: Coin | null) => set({ solCoin: coin }),

  fetchWalletBalance: async (address: string) => {
    try {
      set({ isLoading: true, error: null });
      const balance = await api.getWalletBalance(address);
      
      // Fetch SOL coin data if not already available
      const { solCoin } = get();
      if (!solCoin) {
        const solCoinData = await api.getCoinByID('So11111111111111111111111111111111111111112');
        set({ solCoin: solCoinData });
      }
      
      set({ walletBalance: balance });
    } catch (error) {
      set({ error: (error as Error).message });
      console.error('❌ Error fetching wallet balance:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  loadWallet: async () => {
    try {
      set({ isLoading: true, error: null });
      const savedWallet = await secureStorage.getWallet();
      set({ wallet: savedWallet });
      
      if (savedWallet?.address) {
        await get().fetchWalletBalance(savedWallet.address);
      }
    } catch (error) {
      set({ error: (error as Error).message });
      console.error('Error loading wallet:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  clearWallet: async () => {
    try {
      await secureStorage.deleteWallet();
      set({ wallet: null, walletBalance: null });
    } catch (error) {
      set({ error: (error as Error).message });
      console.error('Error clearing wallet:', error);
    }
  },
})); 