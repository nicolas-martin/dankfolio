import { create } from 'zustand';
import { Wallet, Coin } from '@/types';
import { useCoinStore } from './coins';
import grpcApi from '@/services/grpcApi';
import { SOLANA_ADDRESS } from '@/utils/constants';

export interface PortfolioToken {
	id: string;
	amount: number;
	price: number;
	value: number;
	coin: Coin;
}

interface PortfolioState {
	wallet: Wallet | null;
	isLoading: boolean;
	error: string | null;
	tokens: PortfolioToken[];
	setWallet: (wallet: Wallet | null) => void;
	clearWallet: () => void;
	fetchPortfolioBalance: (address: string) => Promise<void>;
}

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
	wallet: null,
	isLoading: false,
	error: null,
	tokens: [],

	setWallet: (wallet) => {
		set({ wallet });
	},

	clearWallet: () => {
		set({ wallet: null, tokens: [], error: null });
	},

	fetchPortfolioBalance: async (address: string) => {
		try {
			set({ isLoading: true, error: null });
			const balance = await grpcApi.getWalletBalance(address);

			// Pre-fetch and transform API response into our internal PortfolioToken format
			const coinStore = useCoinStore.getState();
			const tokens = await Promise.all(
				balance.balances.map(async (balance) => {
					const coin = await coinStore.getCoinByID(balance.id);
					if (!coin) return null;

					return {
						id: balance.id,
						amount: balance.amount,
						price: coin.price,
						value: balance.amount * coin.price,
						coin: coin
					};
				})
			);

			set({
				tokens: tokens.filter((token): token is PortfolioToken => token !== null),
				isLoading: false
			});
		} catch (error) {
			set({ error: (error as Error).message, isLoading: false });
		}
	},
}));

