import { Coin } from '@/types'; // Assuming Coin type is in @/types
import { SearchSortByOption } from '@/services/grpc/model'; // Import if not already there
import { ThemeType } from '@utils/theme';

// Common theme-related params that can be passed to any screen
export interface ThemeParams {
	themeType?: ThemeType;
	toggleTheme?: () => Promise<void>;
}

export type RootStackParamList = {
	Home: ThemeParams;
	CoinDetail: { 
		coin: Coin;
		themeType?: ThemeType;
		toggleTheme?: () => Promise<void>;
	};
	Search: {
		defaultSortBy?: SearchSortByOption | string; // Allow string for flexibility if SearchSortByOption is restrictive
		defaultSortDesc?: boolean;
		themeType?: ThemeType;
		toggleTheme?: () => Promise<void>;
	} | undefined; // Allow undefined for no params
	Profile: ThemeParams;
	Trade: { 
		inputCoin?: Coin;
		outputCoin?: Coin;
		themeType?: ThemeType;
		toggleTheme?: () => Promise<void>;
	};
	WalletSetup: ThemeParams;
	Send: ThemeParams;
	// Add other routes here as needed
};

// You might have other navigator-specific param lists, e.g., for a BottomTabNavigator
export type HomeStackParamList = {
	HomeScreen: ThemeParams;
	CoinDetailScreen: { 
		coin: Coin;
		themeType?: ThemeType;
		toggleTheme?: () => Promise<void>;
	};
	// ... other screens reachable from Home tab
};

// ... other param lists
