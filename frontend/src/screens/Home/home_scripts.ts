import { Coin, Wallet, NotificationProps, Base58PrivateKey } from '../../types/index';
import { WalletBalanceResponse } from '../../services/api';
import api from '../../services/api';
import { getKeypairFromPrivateKey, secureStorage } from '../../services/solana';
import bs58 from 'bs58';
import { Buffer } from 'buffer';

export const SOL_MINT = 'So11111111111111111111111111111111111111112';

const isBase64 = (str: string): boolean => {
	// Basic check for Base64 format
	return /^[A-Za-z0-9+/]*={0,2}$/.test(str);
};

export const convertToBase58 = (privateKey: string): Base58PrivateKey => {
	if (isBase64(privateKey)) {
		// Convert Base64 to Base58
		const secretKey = new Uint8Array(Buffer.from(privateKey, 'base64'));
		return bs58.encode(secretKey);
	}
	// Already in Base58 format
	return privateKey;
};

export interface NotificationState {
	visible: boolean;
	type: NotificationProps['type'];
	message: string;
}

export const fetchAvailableCoins = async (
	setLoading: (loading: boolean) => void,
	setSolCoin: (coin: Coin | null) => void,
	setCoins: (coins: Coin[]) => void
): Promise<void> => {
	try {
		setLoading(true);
		const coinsData = await api.getAvailableCoins();
		if (Array.isArray(coinsData) && coinsData.length > 0) {
			// Find and store SOL coin
			const sol = coinsData.find(c => c.id === SOL_MINT);
			if (sol) {
				console.log('💫 Found SOL coin in available coins:', {
					id: sol.id,
					symbol: sol.symbol,
					price: sol.price,
					decimals: sol.decimals,
					daily_volume: sol.daily_volume
				});

				setSolCoin(sol);
			}
			setCoins(coinsData);
		} else {
			console.log('⚠️ No coins received or empty array');
		}
	} catch (err) {
		console.error('❌ Error fetching coins:', err);
		throw err; // Let the caller handle the error with toast
	} finally {
		setLoading(false);
	}
};

export const fetchWalletBalance = async (
	address: string,
	setWalletBalance: (balance: WalletBalanceResponse | null) => void,
	showNotification: (type: NotificationProps['type'], message: string) => void
): Promise<void> => {
	try {
		const balance = await api.getWalletBalance(address);
		setWalletBalance(balance);
	} catch (err) {
		console.error('❌ Error fetching wallet balance:', err);
		showNotification('error', 'Failed to fetch wallet balance');
	}
};

export const handleImportWallet = async (
	privateKey: string,
	setWallet: (wallet: Wallet | null) => void,
	fetchWalletBalance: (address: string) => Promise<void>
): Promise<void> => {
	try {
		// Convert to Base58 if needed
		const base58PrivateKey = convertToBase58(privateKey);
		console.log('🔑 Importing wallet:', {
			originalFormat: isBase64(privateKey) ? 'Base64' : 'Base58',
			originalLength: privateKey.length,
			convertedLength: base58PrivateKey.length
		});

		const keypair = getKeypairFromPrivateKey(base58PrivateKey);
		const walletData: Wallet = {
			address: keypair.publicKey.toString(),
			privateKey: base58PrivateKey,
			balance: 0,
			publicKey: keypair.publicKey.toString()
		};
		setWallet(walletData);
		await secureStorage.saveWallet(walletData);
		// Fetch balance immediately after setting wallet
		await fetchWalletBalance(walletData.address);
	} catch (error) {
		console.error('❌ Error importing wallet:', error);
		throw error; // Let the caller handle the error
	}
};

export const handleCoinPress = (
	coin: Coin,
	solCoin: Coin | null,
	walletBalance: WalletBalanceResponse | null,
	navigate: (screen: string, params: any) => void
): void => {
	console.log('🏠 HomeScreen -> CoinDetail with coins:', {
		selectedCoin: {
			id: coin.id,
			name: coin.name,
			symbol: coin.symbol,
			decimals: coin.decimals,
			price: coin.price,
			daily_volume: coin.daily_volume,
			icon_url: coin.icon_url,
			address: coin.id
		},
		solCoin: solCoin ? {
			id: solCoin.id,
			symbol: solCoin.symbol,
			name: solCoin.name,
			decimals: solCoin.decimals,
			price: solCoin.price,
			icon_url: solCoin.icon_url,
			address: solCoin.id
		} : null
	});

	navigate('CoinDetail', {
		coinId: coin.id,
		coinName: coin.name,
		daily_volume: coin.daily_volume,
		coin: coin,
		solCoin: solCoin,
		walletBalance: walletBalance
	});
};
