import { create } from 'zustand';
import { RawWalletData, Wallet, Coin, Base58PrivateKey } from '@/types';
import { useCoinStore } from './coins';
import { grpcApi } from '@/services/grpcApi';
import { logger as log } from '@/utils/logger';
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
	wallet: Wallet | null; // Changed to new non-sensitive Wallet type
	isLoading: boolean;
	error: string | null;
	tokens: PortfolioToken[];
	setWallet: (publicKey: string) => Promise<void>;
	clearWallet: () => void;
	fetchPortfolioBalance: (address: string) => Promise<void>;
}

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
	wallet: null, // Initialized with null
	isLoading: false,
	error: null,
	tokens: [],

	setWallet: async (publicKey: string) => {
		log.info('🔐 Loading wallet credentials...');

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

				// Create RawWalletData object with sensitive data
				const rawWalletData: RawWalletData = {
					address: publicKey,
					privateKey: privateKey as Base58PrivateKey,
					mnemonic: mnemonic || ''
				};

				// Verify the private key format using RawWalletData
				try {
					const keypair = getKeypairFromPrivateKey(rawWalletData.privateKey);
					if (keypair.publicKey.toString() !== rawWalletData.address) {
						throw new Error('Public key mismatch');
					}
				} catch (error) {
					// console.error('❌ Invalid private key format'); // Sensitive data removed
					throw new Error('Invalid private key format');
				}

				// Store only non-sensitive data in the state
				set({ wallet: { address: publicKey } });
				log.info('✅ Wallet loaded successfully');
			} catch (error) {
				// log.error('❌ Error parsing credentials:', error); // Sensitive data removed
				throw new Error('Invalid credentials format in keychain');
			}
		} catch (error) {
			// console.error('❌ Error loading wallet:', error); // Sensitive data removed
			set({ error: error instanceof Error ? error.message : 'Unknown error loading wallet' });
			throw error;
		}
	},

	clearWallet: () => {
		set({ wallet: null, tokens: [], error: null });
	},

	fetchPortfolioBalance: async (address: string) => {
		log.info('🔄 [PortfolioStore] fetchPortfolioBalance called for address:', address);
		if (address === '') {
			log.warn('⚠️ [PortfolioStore] fetchPortfolioBalance called with empty address');
			throw new Error('Address is empty');
		}

		try {
			set({ isLoading: true, error: null });
			log.log('⏳ [PortfolioStore] Calling grpcApi.getWalletBalance...');
			const balance = await grpcApi.getWalletBalance(address);
			log.log('✅ [PortfolioStore] Received balance data:', balance);

			const coinStore = useCoinStore.getState();
			let coinMap = coinStore.coinMap;

			const balanceIds = balance.balances.map((b: { id: string }) => b.id);
			log.log('📊 [PortfolioStore] Balance IDs:', balanceIds);

			const missingIds = balanceIds.filter((id: string) => !coinMap[id]);
			log.log('🔍 [PortfolioStore] Missing coin IDs in CoinStore cache:', missingIds);

			const missingCoinIds: string[] = [];
			const fetchPromises = missingIds.map(async (id: string) => {
				log.log(`⏳ [PortfolioStore] Attempting to fetch missing coin details for ${id}`);
				try {
					const coin = await coinStore.getCoinByID(id);
					if (!coin) {
						missingCoinIds.push(id);
					}
				} catch (err) {
					log.warn(`⚠️ [PortfolioStore] Error fetching coin details for id: ${id}`, err);
					missingCoinIds.push(id);
				}
			});

			await Promise.all(fetchPromises);

			// Re-read coinMap after fetching missing coins
			coinMap = useCoinStore.getState().coinMap;

			const tokens = balance.balances.map((balance: { id: string; amount: number }) => {
				const coin = coinMap[balance.id];
				if (!coin) {
					log.warn(`⚠️ [PortfolioStore] Skipping token for balance ID ${balance.id} because coin data is missing.`);
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

			log.log('📈 [PortfolioStore] Processed tokens before filtering:', tokens.length);
			const filteredTokens = tokens.filter((token: PortfolioToken | null): token is PortfolioToken => token !== null);
			log.log('📊 [PortfolioStore] Filtered tokens (displayed in portfolio):', filteredTokens.map(t => ({ symbol: t.coin.symbol, mintAddress: t.mintAddress, value: t.value })));

			set({
				tokens: filteredTokens,
				isLoading: false,
				error: missingCoinIds.length > 0 ? `Some coins could not be loaded: [${missingCoinIds.join(', ')}]` : null
			});
			log.info('✅ [PortfolioStore] fetchPortfolioBalance finished.');
			return; // Success - exit retry loop
		} catch (error) {
			const errorMessage = (error as Error).message;
			const isRateLimited = errorMessage.includes('429') || errorMessage.includes('Too many requests');
			const isNetworkError = errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('connection');

			log.error(`❌ [PortfolioStore] Failed to fetch portfolio balance (attempt ${attempt + 1}/${MAX_RETRIES + 1}):`, error);

			// If this is the last attempt or it's not a retryable error, fail
			if (attempt === MAX_RETRIES || (!isRateLimited && !isNetworkError)) {
				let userFriendlyError = errorMessage;
				if (isRateLimited) {
					userFriendlyError = 'Service temporarily unavailable due to high demand. Please try again later.';
				} else if (isNetworkError) {
					userFriendlyError = 'Network connection issue. Please check your internet connection.';
				}

				set({
					error: userFriendlyError,
					isLoading: false,
					tokens: []
				});
				throw error;
			}

			// Wait before retrying
			const delay = RETRY_DELAYS[attempt];
			log.info(`⏳ [PortfolioStore] Retrying in ${delay}ms...`);
			await new Promise(resolve => setTimeout(resolve, delay));
		}
	},
}));

export const getActiveWalletKeys = async (): Promise<{ publicKey: string; privateKey: Base58PrivateKey } | null> => {
	const currentWallet = usePortfolioStore.getState().wallet;
	if (!currentWallet || !currentWallet.address) {
		log.warn('[getActiveWalletKeys] No active wallet address in store.');
		return null;
	}
	const walletAddress = currentWallet.address;

	try {
		const credentials = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE });
		if (!credentials) {
			log.error('[getActiveWalletKeys] No credentials found in keychain.');
			return null;
		}
		const parsedCredentials = JSON.parse(credentials.password) as Partial<RawWalletData>;
		if (!parsedCredentials.privateKey) {
			log.error('[getActiveWalletKeys] Private key not found in stored credentials.');
			return null;
		}

		// Omit getKeypairFromPrivateKey verification for now to prevent new cycle with solana.ts
		// If solana.ts's getKeypairFromPrivateKey is moved to a common util, this check can be added:
		// import { getKeypairFromPrivateKey } from '@/utils/solanaUtils'; // Example if moved
		// const keypair = getKeypairFromPrivateKey(parsedCredentials.privateKey as Base58PrivateKey);
		// if (keypair.publicKey.toString() !== walletAddress) {
		//   log.error('[getActiveWalletKeys] Keychain public key does not match stored wallet address.');
		//   return null;
		// }

		return { publicKey: walletAddress, privateKey: parsedCredentials.privateKey as Base58PrivateKey };
	} catch (error) {
		log.error('[getActiveWalletKeys] Error retrieving/parsing credentials:', error);
		return null;
	}
};
