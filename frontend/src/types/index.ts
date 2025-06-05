import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Keypair } from '@solana/web3.js';
import { ThemeType } from '@utils/theme';

export interface Coin {
	mintAddress: string;
	name: string;
	symbol: string;
	decimals: number;
	description: string;
	resolvedIconUrl?: string;
	tags: string[];
	price: number;
	balance?: number;
	dailyVolume: number;
	change24h?: number;
	website?: string;
	twitter?: string;
	telegram?: string;
	coingeckoId?: string;
	createdAt?: Date;
	lastUpdated?: Date;
	value?: number;
	percentage?: number;
	jupiterListedAt?: Date;
}

/** Base58 encoded private key string with type safety */
export type Base58PrivateKey = string & { readonly __brand: unique symbol };

export interface RawWalletData {
	address: string;
	privateKey: Base58PrivateKey;
	mnemonic: string;
	keypair?: Keypair;
}

export interface Wallet {
	address: string;
}

export interface ThemeProps {
	themeType: ThemeType;
	toggleTheme: () => Promise<void>;
}

export type RootStackParamList = {
	Home: {
		themeType?: ThemeType;
		toggleTheme?: () => Promise<void>;
	};
	Trade: {
		initialFromCoin?: Coin | null;
		initialToCoin?: Coin | null;
		selectedToken?: Coin;
		themeType?: ThemeType;
		toggleTheme?: () => Promise<void>;
	};
	Profile: undefined;
	Search: undefined;
	SendTokens: undefined;
	CoinDetail: {
		coin?: Coin;
		solCoin?: Coin;
		themeType?: ThemeType;
		toggleTheme?: () => Promise<void>;
	};
	CoinSelect: {
		onSelect: (coin: Coin) => void;
		excludeCoinId?: string;
		currentCoinId?: string;
	};
	MainTabs: undefined;
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

// Re-export all types from other files
export * from './trade';
export * from './transactions';
