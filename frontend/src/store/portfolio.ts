import { create } from 'zustand';
import { Wallet, Coin, Base58PrivateKey } from '@/types';
import { useCoinStore } from './coins';
import { grpcApi } from '@/services/grpcApi';
import * as Keychain from 'react-native-keychain';
import { getKeypairFromPrivateKey } from '@/services/solana';
const KEYCHAIN_SERVICE = 'com.dankfolio.wallet';

export interface PortfolioToken {
	mintAddress: string;
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
	setWallet: (publicKey: string) => Promise<void>;
	clearWallet: () => void;
	fetchPortfolioBalance: (address: string) => Promise<void>;
}

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
	wallet: null,
	isLoading: false,
	error: null,
	tokens: [],

	setWallet: async (publicKey: string) => {
		console.log('🔐 Loading wallet credentials...');

		try {
			const credentials = await Keychain.getGenericPassword({
				service: KEYCHAIN_SERVICE
			});

			if (!credentials) {
				throw new Error('No credentials found in keychain');
			}

			try {
				const parsedCredentials = JSON.parse(credentials.password);
				const privateKey = parsedCredentials.privateKey;
				const mnemonic = parsedCredentials.mnemonic;

				if (!privateKey) {
					throw new Error('No private key found in stored credentials');
				}

				const newWallet: Wallet = {
					address: publicKey,
					privateKey: privateKey as Base58PrivateKey,
					mnemonic: mnemonic || ''
				};

				// Verify the private key format
				try {
					const keypair = getKeypairFromPrivateKey(newWallet.privateKey);
					if (keypair.publicKey.toString() !== newWallet.address) {
						throw new Error('Public key mismatch');
					}
				} catch (error) {
					console.error('❌ Invalid private key format');
					throw new Error('Invalid private key format');
				}

				set({ wallet: newWallet });
				console.log('✅ Wallet loaded successfully');
			} catch (error) {
				console.error('❌ Error parsing credentials:', error);
				throw new Error('Invalid credentials format in keychain');
			}
		} catch (error) {
			console.error('❌ Error loading wallet:', error);
			set({ error: error instanceof Error ? error.message : 'Unknown error loading wallet' });
			throw error;
		}
	},

	clearWallet: () => {
		set({ wallet: null, tokens: [], error: null });
	},

	fetchPortfolioBalance: async (address: string) => {
		console.log('🔄 [PortfolioStore] fetchPortfolioBalance called for address:', address);
		if (address === '') {
			console.warn('⚠️ [PortfolioStore] fetchPortfolioBalance called with empty address');
			throw new Error('Address is empty');
		}
		try {
			set({ isLoading: true, error: null });
			console.log('⏳ [PortfolioStore] Calling grpcApi.getWalletBalance...');
			const balance = await grpcApi.getWalletBalance(address);
			console.log('✅ [PortfolioStore] Received balance data:', balance);

			const coinStore = useCoinStore.getState();
			let coinMap = coinStore.coinMap;

			const balanceIds = balance.balances.map((b: { id: string }) => b.id);
			console.log('📊 [PortfolioStore] Balance IDs:', balanceIds);

			const missingIds = balanceIds.filter((id: string) => !coinMap[id]);
			console.log('🔍 [PortfolioStore] Missing coin IDs in CoinStore cache:', missingIds);

			const missingCoinIds: string[] = [];
			const fetchPromises = missingIds.map(async (id: string) => {
				console.log(`⏳ [PortfolioStore] Attempting to fetch missing coin details for ${id}`);
				try {
					const coin = await coinStore.getCoinByID(id);
					if (!coin) {
						missingCoinIds.push(id);
					}
				} catch (err) {
					console.warn(`⚠️ [PortfolioStore] Error fetching coin details for id: ${id}`, err);
					missingCoinIds.push(id);
				}
			});

			await Promise.all(fetchPromises);

			// Re-read coinMap after fetching missing coins
			coinMap = useCoinStore.getState().coinMap;

			const tokens = balance.balances.map((balance: { id: string; amount: number }) => {
				const coin = coinMap[balance.id];
				if (!coin) {
					console.warn(`⚠️ [PortfolioStore] Skipping token for balance ID ${balance.id} because coin data is missing.`);
					return null;
				}
				return {
					mintAddress: balance.id,
					amount: balance.amount,
					price: coin.price,
					value: balance.amount * coin.price,
					coin: coin
				} as PortfolioToken;
			});

			console.log('📈 [PortfolioStore] Processed tokens before filtering:', tokens.length);
			const filteredTokens = tokens.filter((token: PortfolioToken | null): token is PortfolioToken => token !== null);
			console.log('📊 [PortfolioStore] Filtered tokens (displayed in portfolio):', filteredTokens.map(t => ({ symbol: t.coin.symbol, mintAddress: t.mintAddress, value: t.value })));

			set({
				tokens: filteredTokens,
				isLoading: false,
				error: missingCoinIds.length > 0 ? `Some coins could not be loaded: [${missingCoinIds.join(', ')}]` : null
			});
			console.log('✅ [PortfolioStore] fetchPortfolioBalance finished.');
		} catch (error) {
			console.error("❌ [PortfolioStore] Failed to fetch portfolio balance:", error);
			set({ error: (error as Error).message, isLoading: false, tokens: [] });
		}
	},
}));

