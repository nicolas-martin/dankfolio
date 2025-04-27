import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Keypair } from '@solana/web3.js';

export interface Coin {
	id: string;
	name: string;
	symbol: string;
	decimals: number;
	description: string;
	icon_url: string;
	tags: string[];
	price: number;
	balance?: number;
	daily_volume: number;
	website?: string;
	twitter?: string;
	telegram?: string;
	coingecko_id?: string;
	created_at: string;
	last_updated?: string;
	value?: number;
	percentage?: number;
}

/** Base58 encoded private key string */
export type Base58PrivateKey = string;

export interface Wallet {
	address: string;
	privateKey: Base58PrivateKey;
	mnemonic: string;
	keypair?: Keypair;
}

export type RootStackParamList = {
	Home: undefined;
	Trade: {
		initialFromCoin?: Coin | null;
		initialToCoin?: Coin | null;
	};
	Profile: undefined;
	CoinDetail: {
		coin?: Coin;
		solCoin?: Coin;
	};
	CoinSelect: {
		onSelect: (coin: Coin) => void;
		excludeCoinId?: string;
		currentCoinId?: string;
	};
	[key: string]: undefined | object;
}

export interface NotificationProps {
	type: 'success' | 'error' | 'warning' | 'info';
	message: string;
	duration?: number;
	visible?: boolean;
	onDismiss?: () => void;
}

export type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export interface ScreenProps {
	navigation: NavigationProp;
}

export interface Trade {
	id: string;
	from_coin_id: string;
	to_coin_id: string;
	amount: number;
	fee: number;
	status: 'completed' | 'failed' | 'pending';
	created_at: string;
}

export interface PriceData {
	timestamp: string;
	value: string | number;
	unixTime?: number;
}

export interface Token {
	id: string;
	symbol: string;
	name: string;
	decimals: number;
	balance: string;
	price: number;
	icon_url: string;
	description: string;
	website: string;
}

// Re-export all types from other files
export * from './trade';
