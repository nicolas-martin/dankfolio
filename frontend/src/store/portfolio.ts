import { create } from 'zustand';
import { RawWalletData, Wallet, Coin, Base58PrivateKey } from '@/types';
import { useCoinStore } from './coins';
import { grpcApi } from '@/services/grpcApi';
import { logger } from '@/utils/logger';
import * as Keychain from 'react-native-keychain';
import { getKeypairFromPrivateKey } from '@/services/solana';
import { KEYCHAIN_SERVICE } from '@/utils/keychainService';
import type { TokenPnL } from '@/services/grpc/model';

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
	pnlData: TokenPnL[] | null;
	totalPortfolioValue: number | null;
	totalCostBasis: number | null;
	totalUnrealizedPnl: number | null;
	totalPnlPercentage: number | null;
	isPnlLoading: boolean;
	pnlError: string | null;
	setWallet: (publicKey: string) => Promise<void>;
	clearWallet: () => void;
	fetchPortfolioBalance: (address: string, forceRefresh?: boolean) => Promise<void>;
	fetchPortfolioPnL: (address: string) => Promise<void>;
}

export const usePortfolioStore = create<PortfolioState>((set) => ({
	wallet: null, // Initialized with null
	isLoading: false,
	error: null,
	tokens: [],
	pnlData: null,
	totalPortfolioValue: null,
	totalCostBasis: null,
	totalUnrealizedPnl: null,
	totalPnlPercentage: null,
	isPnlLoading: false,
	pnlError: null,

	setWallet: async (publicKey: string) => {
		logger.info('🔐 Loading wallet credentials...');

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
				} catch (error: unknown) {
					// console.error('❌ Invalid private key format'); // Sensitive data removed
					if (error instanceof Error) {
						throw new Error('Invalid private key format: ' + error.message);
					} else {
						throw new Error('Invalid private key format: ' + error);
					}
				}

				// Store only non-sensitive data in the state
				set({ wallet: { address: publicKey } });
				logger.info('✅ Wallet loaded successfully');
			} catch (error: unknown) {
				// logger.error('❌ Error parsing credentials:', error); // Sensitive data removed
				if (error instanceof Error) {
					throw new Error('Invalid credentials format in keychain: ' + error.message);
				} else {
					throw new Error('Invalid credentials format in keychain: ' + error);
				}
			}
		} catch (error: unknown) {
			if (error instanceof Error) {
				// console.error('❌ Error loading wallet:', error); // Sensitive data removed
				set({ error: error.message });
				throw error;
			} else {
				// console.error('❌ Error loading wallet:', error); // Sensitive data removed
				set({ error: 'Unknown error loading wallet' });
				throw new Error('Unknown error loading wallet: ' + error);
			}
		}
	},

	clearWallet: () => {
		logger.info('[PortfolioStore] Clearing wallet and tokens');
		set({
			wallet: null,
			tokens: [],
			error: null,
			pnlData: null,
			pnlError: null,
			totalPortfolioValue: null,
			totalCostBasis: null,
			totalUnrealizedPnl: null,
			totalPnlPercentage: null
		});
	},

	fetchPortfolioBalance: async (address: string, forceRefresh?: boolean) => {
		logger.info('🔄 [PortfolioStore] fetchPortfolioBalance called for address:', address, 'forceRefresh:', forceRefresh);
		if (address === '') {
			logger.warn('⚠️ [PortfolioStore] fetchPortfolioBalance called with empty address');
			throw new Error('Address is empty');
		}

		try {
			set({ isLoading: true, error: null });
			logger.info('⏳ [PortfolioStore] Calling grpcApi.getWalletBalance...');
			let balance;
			try {
				balance = await grpcApi.getWalletBalance(address);
				logger.info('✅ [PortfolioStore] Received balance data:', JSON.stringify(balance));
			} catch (balanceError) {
				logger.error('❌ [PortfolioStore] Failed to get wallet balance:', balanceError);
				throw balanceError;
			}

			const coinStore = useCoinStore.getState();
			let coinMap = coinStore.coinMap;

			const balanceIds = balance.balances.map((b: { id: string }) => b.id);
			logger.info(`📊 [PortfolioStore] Found ${balanceIds.length} portfolio tokens to fetch:`, balanceIds.slice(0, 5), balanceIds.length > 5 ? `... and ${balanceIds.length - 5} more` : '');

			// Use batch API to fetch all portfolio coins efficiently
			const startTime = Date.now();
			const missingCoinIds: string[] = [];

			// Check which coins are already cached vs need to be fetched
			const cachedCoins: (typeof coinStore.coinMap[string])[] = [];
			const addressesToFetch: string[] = [];

			balanceIds.forEach(id => {
				const existingCoin = coinStore.coinMap[id];
				if (existingCoin && !forceRefresh) {
					cachedCoins.push(existingCoin);
				} else {
					addressesToFetch.push(id);
				}
			});

			// Fetch missing coins using batch API
			let fetchedCoins: typeof cachedCoins = [];
			if (addressesToFetch.length > 0) {
				try {
					logger.info(`📊 [PortfolioStore] Using batch API to fetch ${addressesToFetch.length} portfolio tokens`);
					fetchedCoins = await grpcApi.getCoinsByIDs(addressesToFetch, forceRefresh);

					// Update coin store with fetched coins
					fetchedCoins.forEach(coin => {
						coinStore.setCoin(coin);
					});

					// Track which coins failed to fetch
					const fetchedAddresses = new Set(fetchedCoins.map(coin => coin.address));
					addressesToFetch.forEach(address => {
						if (!fetchedAddresses.has(address)) {
							missingCoinIds.push(address);
						}
					});
				} catch (error) {
					logger.error(`❌ [PortfolioStore] Batch fetch failed:`, error);
					// Continue with cached coins only, mark all requested as missing
					addressesToFetch.forEach(address => missingCoinIds.push(address));
				}
			}

			const fetchTime = Date.now() - startTime;
			const totalFetched = cachedCoins.length + fetchedCoins.length;
			logger.log(`📊 [PortfolioStore] Portfolio coin fetch complete: ${totalFetched}/${balanceIds.length} coins in ${fetchTime}ms (${cachedCoins.length} cached, ${fetchedCoins.length} fetched, ${missingCoinIds.length} missing)`);

			// Re-read coinMap after fetching coins (especially if forceRefresh was used)
			coinMap = useCoinStore.getState().coinMap;

			const tokens = balance.balances.map((balance: { id: string; amount: number }) => {
				const coin = coinMap[balance.id];
				if (!coin) {
					logger.warn(`⚠️ [PortfolioStore] Skipping token for balance ID ${balance.id} because coin data is missing.`);
					return null;
				}
				
				// Log SOL coin data specifically
				if (balance.id === '11111111111111111111111111111111') {
					logger.info(`💎 [PortfolioStore] SOL coin data:`, {
						address: coin.address,
						symbol: coin.symbol,
						price: coin.price,
						amount: balance.amount
					});
				}
				
				const tokenValue = balance.amount * coin.price;
				return {
					mintAddress: balance.id,
					amount: balance.amount,
					price: coin.price,
					value: tokenValue,
					coin: coin
				} as PortfolioToken;
			});

			logger.log('📈 [PortfolioStore] Processed tokens before filtering:', tokens.length);
			const filteredTokens = tokens.filter((token: PortfolioToken | null): token is PortfolioToken => token !== null);

			// Log SOL balance specifically
			const solToken = filteredTokens.find(t => t.mintAddress === '11111111111111111111111111111111');
			if (solToken) {
				logger.log('💎 [PortfolioStore] SOL Balance:', solToken.amount, 'SOL, Value: $', solToken.value);
			} else {
				logger.warn('⚠️ [PortfolioStore] No SOL balance found in tokens!');
			}

			logger.log('📊 [PortfolioStore] Filtered tokens (displayed in portfolio):', filteredTokens.map(t => ({ symbol: t.coin.symbol, mintAddress: t.mintAddress, amount: t.amount, value: t.value })));

			// Calculate total portfolio value from tokens
			const calculatedPortfolioValue = filteredTokens.reduce((total, token) => total + token.value, 0);
			logger.log('💰 [PortfolioStore] Calculated total portfolio value from tokens:', calculatedPortfolioValue);

			set({
				tokens: filteredTokens,
				totalPortfolioValue: calculatedPortfolioValue,
				isLoading: false,
				error: missingCoinIds.length > 0 ? `Some coins could not be loaded: [${missingCoinIds.join(', ')}]` : null
			});
			logger.info('✅ [PortfolioStore] fetchPortfolioBalance finished.');
			return; // Success - exit retry loop
		} catch (error) {
			const errorMessage = (error as Error).message;
			const isRateLimited = errorMessage.includes('429') || errorMessage.includes('Too many requests');
			const isNetworkError = errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('connection');

			logger.error(`❌ [PortfolioStore] Failed to fetch portfolio balance):`, error);

			// If this is the last attempt or it's not a retryable error, fail
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
			if (error instanceof Error) {
				throw error;
			} else {
				throw new Error(String(error));
			}
		}
	},

	fetchPortfolioPnL: async (address: string) => {
		logger.info('🔄 [PortfolioStore] fetchPortfolioPnL called for address:', address);
		if (address === '') {
			logger.warn('⚠️ [PortfolioStore] fetchPortfolioPnL called with empty address');
			return;
		}

		try {
			set({ isPnlLoading: true, pnlError: null });
			logger.log('⏳ [PortfolioStore] Calling grpcApi.getPortfolioPnL...');
			const response = await grpcApi.getPortfolioPnL(address);
			logger.log('✅ [PortfolioStore] Received PnL data:', response);

			if (response?.tokenPnls) {
				const sortedPnLs = [...response.tokenPnls].sort((a, b) => b.unrealizedPnl - a.unrealizedPnl);
				set({
					pnlData: sortedPnLs,
					totalPortfolioValue: response.totalPortfolioValue,
					totalCostBasis: response.totalCostBasis,
					totalUnrealizedPnl: response.totalUnrealizedPnl,
					totalPnlPercentage: response.totalPnlPercentage,
					isPnlLoading: false,
					pnlError: null
				});
			} else {
				set({
					pnlData: [],
					totalPortfolioValue: 0,
					totalCostBasis: 0,
					totalUnrealizedPnl: 0,
					totalPnlPercentage: 0,
					isPnlLoading: false,
					pnlError: null
				});
			}
			logger.info('✅ [PortfolioStore] fetchPortfolioPnL finished.');
		} catch (error) {
			const errorMessage = (error as Error).message;
			logger.error(`❌ [PortfolioStore] Failed to fetch portfolio PnL:`, error);

			set({
				pnlError: errorMessage,
				isPnlLoading: false,
				pnlData: null
			});
		}
	},
}));

export const getActiveWalletKeys = async (): Promise<{ publicKey: string; privateKey: Base58PrivateKey } | null> => {
	const currentWallet = usePortfolioStore.getState().wallet;
	if (!currentWallet || !currentWallet.address) {
		logger.warn('[getActiveWalletKeys] No active wallet address in store.');
		return null;
	}
	const walletAddress = currentWallet.address;

	try {
		const credentials = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE });
		if (!credentials) {
			logger.error('[getActiveWalletKeys] No credentials found in keychain.');
			return null;
		}
		const parsedCredentials = JSON.parse(credentials.password) as Partial<RawWalletData>;
		if (!parsedCredentials.privateKey) {
			logger.error('[getActiveWalletKeys] Private key not found in stored credentials.');
			return null;
		}

		// Omit getKeypairFromPrivateKey verification for now to prevent new cycle with solana.ts
		// If solana.ts's getKeypairFromPrivateKey is moved to a common util, this check can be added:
		// import { getKeypairFromPrivateKey } from '@/utils/solanaUtils'; // Example if moved
		// const keypair = getKeypairFromPrivateKey(parsedCredentials.privateKey as Base58PrivateKey);
		// if (keypair.publicKey.toString() !== walletAddress) {
		//   logger.error('[getActiveWalletKeys] Keychain public key does not match stored wallet address.');
		//   return null;
		// }

		return { publicKey: walletAddress, privateKey: parsedCredentials.privateKey as Base58PrivateKey };
	} catch (error: unknown) {
		if (error instanceof Error) {
			logger.error('[getActiveWalletKeys] Error retrieving/parsing credentials:', error.message);
		} else {
			logger.error('[getActiveWalletKeys] An unknown error occurred while retrieving/parsing credentials:', error);
		}
		return null;
	}
};
