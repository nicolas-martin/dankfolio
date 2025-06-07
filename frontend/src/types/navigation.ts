import { Coin } from '@/types'; // Assuming Coin type is in @/types
import { SearchSortByOption } from '@/services/grpc/model'; // Import if not already there

export type RootStackParamList = {
    // From navigation.ts (or same in both)
    Home: undefined;
    Profile: undefined;
    WalletSetup: undefined;
    SendTokens: undefined;
    Settings: undefined;

    // Merged/Prioritized from navigation.ts
    CoinDetail: {
        coin: Coin;
        solCoin?: Coin; // Added from index.ts
    };
    Search: {
        defaultSortBy?: SearchSortByOption | string;
        defaultSortDesc?: boolean;
    } | undefined;
    Trade: {
        inputCoin?: Coin;
        outputCoin?: Coin;
    };

    // From index.ts
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
	// ... other screens reachable from Home tab
};

// ... other param lists
