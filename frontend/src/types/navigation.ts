import { Coin } from '@/types';
import { SearchSortByOption } from '@/services/grpc/model';

export type RootStackParamList = {
	Home: undefined;
	Profile: undefined;
	WalletSetup: undefined;
	SendTokens: undefined;
	Settings: undefined;
	AccordionTest: undefined;

	CoinDetail: {
		coin: Coin;
	};
	Search: {
		defaultSortBy?: SearchSortByOption | string;
		defaultSortDesc?: boolean;
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

