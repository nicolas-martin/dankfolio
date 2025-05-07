import { create } from 'zustand';
import { Wallet, Coin, Base58PrivateKey } from '@/types';
import { Keypair } from '@solana/web3.js';
import { useCoinStore } from './coins';
import { grpcApi } from '@/services/grpcApi';
import { SOLANA_ADDRESS } from '@/utils/constants';
import * as Keychain from 'react-native-keychain';
import bs58 from 'bs58';
import { Buffer } from 'buffer';
import { getKeypairFromPrivateKey } from '@/services/solana';

const KEYCHAIN_SERVICE = 'com.dankfolio.wallet';
const KEYCHAIN_USERNAME_PRIVATE_KEY = 'userPrivateKey';
const KEYCHAIN_USERNAME_MNEMONIC = 'userMnemonic';

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
		console.log('🔐 Setting wallet with public key:', publicKey);

		try {
			// Get credentials from keychain
			console.log('📥 Retrieving credentials from keychain...');
			const credentials = await Keychain.getGenericPassword({
				service: KEYCHAIN_SERVICE
			});

			if (!credentials) {
				console.error('❌ No credentials found in keychain');
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

				console.log('💼 Setting wallet in store:', {
					address: newWallet.address,
					privateKeyFormat: 'base58',
					privateKeyLength: newWallet.privateKey.length,
					privateKeyPreview: newWallet.privateKey.substring(0, 10) + '...',
					hasMnemonic: !!newWallet.mnemonic
				});

				// Verify the private key format
				try {
					const keypair = getKeypairFromPrivateKey(newWallet.privateKey);
					console.log('✅ Verified private key format:', {
						derivedPublicKey: keypair.publicKey.toString(),
						matchesAddress: keypair.publicKey.toString() === newWallet.address
					});
				} catch (error) {
					console.error('❌ Error verifying private key format:', error);
					throw new Error('Invalid private key format');
				}

				set({ wallet: newWallet });
			} catch (error) {
				console.error('❌ Error parsing stored credentials:', error);
				throw new Error('Invalid credentials format in keychain');
			}
		} catch (error) {
			console.error('❌ Error setting wallet:', error);
			set({ error: error instanceof Error ? error.message : 'Unknown error setting wallet' });
			throw error;
		}
	},

	clearWallet: () => {
		set({ wallet: null, tokens: [], error: null });
	},

	fetchPortfolioBalance: async (address: string) => {
		if (address === '') {
			throw new Error('Address is empty');
		}
		try {
			set({ isLoading: true, error: null });
			const balance = await grpcApi.getWalletBalance(address);

			const coinStore = useCoinStore.getState();
			let coinMap = coinStore.coinMap;

			const balanceIds = balance.balances.map((b: { id: string }) => b.id);
			const missingIds = balanceIds.filter((id: string) => !coinMap[id]);

			let missingCount = 0;
			const missingCoinIds: string[] = [];
			await Promise.all(
				missingIds.map(async (id: string) => {
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
			coinMap = useCoinStore.getState().coinMap;

			const tokens = balance.balances.map((balance: { id: string; amount: number }) => {
				const coin = coinMap[balance.id];
				if (!coin) return null;
				return {
					mintAddress: balance.id,
					amount: balance.amount,
					price: coin.price,
					value: balance.amount * coin.price,
					coin: coin
				} as PortfolioToken;
			});

			set({
				tokens: tokens.filter((token: PortfolioToken | null): token is PortfolioToken => token !== null),
				isLoading: false,
				error: missingCount > 0 ? `Some coins could not be loaded: [${missingCoinIds.join(', ')}]` : null
			});
		} catch (error) {
			console.error("Failed to fetch portfolio balance:", error);
			set({ error: (error as Error).message, isLoading: false, tokens: [] });
		}
	},
}));

