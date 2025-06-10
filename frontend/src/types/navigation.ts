import { Coin } from '@/types'; // Assuming Coin type is in @/types
import { SearchSortByOption } from '@/services/grpc/model'; // Import if not already there

export type RootStackParamList = {
	Home: undefined;
	Profile: undefined;
	WalletSetup: undefined;
	SendTokens: undefined;
	Settings: undefined;

	// Merged/Prioritized from navigation.ts
	CoinDetail: {
		coin: Coin;
		solCoin?: Coin;
	};
	Search: {
		defaultSortBy?: SearchSortByOption | string;
		defaultSortDesc?: boolean;
	} | undefined;
	Trade: {
		initialFromCoin?: Coin | null;
		initialToCoin?: Coin | null;
	};

	CoinSelect: {
		onSelect: (coin: Coin) => void;
		excludeCoinId?: string;
		currentCoinId?: string;
	};
	MainTabs: undefined;
};

// You might have other navigator-specific param lists, e.g., for a BottomTabNavigator
export type HomeStackParamList = {
	HomeScreen: undefined;
	CoinDetailScreen: {
		coin: Coin;
	};
};

