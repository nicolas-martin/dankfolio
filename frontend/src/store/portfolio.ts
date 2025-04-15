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
			let coinMap = coinStore.coinMap; // Use coinMap as the source of truth for all loaded coins

			const balanceIds = balance.balances.map(b => b.id);
			const missingIds = balanceIds.filter(id => !coinMap[id]);

			let missingCount = 0;
			const missingCoinIds: string[] = [];
			// Fetch missing coins in parallel, but allow partial success
			await Promise.all(
				missingIds.map(async (id) => {
					try {
						const coin = await coinStore.getCoinByID(id);
						if (coin) {
							coinStore.setCoin(coin);
						} else {
							missingCount++;
							missingCoinIds.push(id);
							console.warn(`⚠️ Could not fetch coin details for id: ${id}`);
						}
					} catch (err) {
						missingCount++;
						missingCoinIds.push(id);
						console.warn(`⚠️ Error fetching coin details for id: ${id}`, err);
					}
				})
			);
			// Refresh coinMap after updates
			coinMap = useCoinStore.getState().coinMap;

			// Build tokens using the up-to-date coinMap
			const tokens = balance.balances.map((balance) => {
				const coin = coinMap[balance.id];
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
				isLoading: false,
				error: missingCount > 0 ? `Some coins could not be loaded: [${missingCoinIds.join(', ')}]` : null
			});
		} catch (error) {
			set({ error: (error as Error).message, isLoading: false, tokens: [] });
		}
	},
}));

