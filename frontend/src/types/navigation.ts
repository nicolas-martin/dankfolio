import { Coin } from '@/types';

export type RootStackParamList = {
	Home: undefined;
	Profile: undefined;
	WalletSetup: undefined;
	SendTokens: undefined;
	Settings: undefined;

	CoinDetail: {
		coin: Coin;
	};
	Search: {
		defaultSortBy?: string;
	} | undefined;
	Trade: {
		initialFromCoin?: Coin | null;
		initialToCoin: Coin | null;
	};

	CoinSelect: {
		onSelect: (coin: Coin) => void;
		excludeCoinId?: string;
		currentCoinId?: string;
	};
	MainTabs: undefined;
};

export type HomeStackParamList = {
	HomeScreen: undefined;
	CoinDetailScreen: {
		coin: Coin;
	};
};

