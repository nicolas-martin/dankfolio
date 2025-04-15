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

			const coinStore = useCoinStore.getState();
			const coinMap = coinStore.coinMap; // Use coinMap as the source of truth for all loaded coins

			const balanceIds = balance.balances.map(b => b.id);
			const missingIds = balanceIds.filter(id => !coinMap[id]);

			// Fetch missing coins in parallel and update coinMap as needed
			const fetchedCoins = await Promise.all(
				missingIds.map(async (id) => {
					const coin = await coinStore.getCoinByID(id);
					return coin;
				})
			);

			// After fetching missing coins, update the coinMap in the store
			fetchedCoins.forEach(coin => {
				if (coin) {
					coinStore.setCoin(coin);
				}
			});

			// Always use the up-to-date coinStore.coinMap for lookups
			const updatedCoinMap = useCoinStore.getState().coinMap;

			// Build tokens using the global coinMap
			const tokens = balance.balances.map((balance) => {
				const coin = updatedCoinMap[balance.id];
				if (!coin) return null;
				return {
					id: balance.id,
					amount: balance.amount,
					price: coin.price,
					value: balance.amount * coin.price,
					coin: coin
				};
			});

			set({
				tokens: tokens.filter((token): token is PortfolioToken => token !== null),
				isLoading: false
			});
		} catch (error) {
			set({ error: (error as Error).message, isLoading: false });
		}
	},
}));

