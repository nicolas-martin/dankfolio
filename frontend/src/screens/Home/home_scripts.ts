import { Coin, Wallet, NotificationProps, Base58PrivateKey } from '../../types/index';
import { getKeypairFromPrivateKey, secureStorage } from '../../services/solana';
import bs58 from 'bs58';
import { Buffer } from 'buffer';
import { useCoinStore } from '../../store/coins';

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
	setLoading: (loading: boolean) => void
): Promise<void> => {
	try {
		setLoading(true);
		await useCoinStore.getState().fetchAvailableCoins();
		const coins = useCoinStore.getState().availableCoins;
		console.log('🏠 Home fetched coins:', {
			total: coins.length,
			symbols: coins.map(c => c.symbol),
			hasSol: coins.some(c => c.id === SOL_MINT)
		});
	} catch (err) {
		console.error('❌ Error fetching coins:', err);
		throw err;
	} finally {
		setLoading(false);
	}
};

export const handleImportWallet = async (
	privateKey: string,
	setWallet: (wallet: Wallet | null) => void,
): Promise<Wallet> => {
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
		return walletData;
	} catch (error) {
		console.error('❌ Error importing wallet:', error);
		throw error;
	}
};

export const handleCoinPress = (
	coin: Coin,
	navigate: (screen: string, params: any) => void
): void => {
	navigate('CoinDetail', { coin: coin });
};

