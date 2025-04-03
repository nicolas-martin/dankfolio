import { Coin, Wallet, NotificationProps, Base58PrivateKey } from '../../types/index';
import { getKeypairFromPrivateKey, secureStorage } from '../../services/solana';
import bs58 from 'bs58';
import { Buffer } from 'buffer';
import { useCoinStore } from '../../store/coins';
import { HomeScreenNavigationProp } from './home_types';

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

export const handleImportWallet = async (privateKey: string): Promise<Wallet> => {
	try {
		const base58PrivateKey = convertToBase58(privateKey);
		const keypair = getKeypairFromPrivateKey(base58PrivateKey);
		const wallet: Wallet = {
			address: keypair.publicKey.toString(),
			privateKey: base58PrivateKey,
			balance: 0,
			publicKey: keypair.publicKey.toString(),
			keypair
		};
		return wallet;
	} catch (error) {
		console.error('Error importing wallet:', error);
		throw error;
	}
};

export const handleCoinPress = (coin: Coin, navigation: HomeScreenNavigationProp) => {
	navigation.navigate('CoinDetail', {
		coin,
		fromScreen: 'Home'
	});
};

