import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Keypair } from '@solana/web3.js';
import type { RootStackParamList } from './navigation';

export interface Coin {
	address: string;                    // Was: mintAddress (aligned with BirdEye)
	name: string;
	symbol: string;
	decimals: number;
	description: string;
	logoURI: string;                    // Was: iconUrl (aligned with BirdEye)
	tags: string[];
	price: number;
	balance?: number;                   // Keep for frontend calculations
	price24hChangePercent?: number;     // BirdEye standard (was: change24h)
	marketcap?: number;                 // BirdEye uses lowercase (was: marketCap)
	volume24hUSD?: number;              // BirdEye standard (was: dailyVolume)
	volume24hChangePercent?: number;    // BirdEye standard
	liquidity?: number;
	fdv?: number;                       // BirdEye uses uppercase
	rank?: number;
	website?: string;
	twitter?: string;
	telegram?: string;
	discord?: string;                   // Add discord field
	createdAt?: Date;
	lastUpdated?: Date;
	value?: number;                     // Keep for frontend calculations
	percentage?: number;                // Keep for frontend calculations
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
	unixTime: number;
	value: number;
}

// Re-export all types from other files
export * from './trade';
export * from './transactions';
