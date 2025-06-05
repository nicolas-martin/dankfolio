import { Coin } from '@/types'; // Assuming Coin type is in @/types
import { SearchSortByOption } from '@/services/grpc/model'; // Import if not already there

export type RootStackParamList = {
	Home: undefined;
	CoinDetail: { 
		coin: Coin;
	};
	Search: {
		defaultSortBy?: SearchSortByOption | string; // Allow string for flexibility if SearchSortByOption is restrictive
		defaultSortDesc?: boolean;
	} | undefined; // Allow undefined for no params
	Profile: undefined;
	Trade: { 
		inputCoin?: Coin;
		outputCoin?: Coin;
	};
	WalletSetup: undefined;
	SendTokens: undefined;
	// Add other routes here as needed
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
