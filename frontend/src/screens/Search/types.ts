import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Coin } from '@/types';
import type { RootStackParamList } from '@/types/navigation';
import { SearchSortByOption } from '@/services/grpc/model';

export type SearchScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Search'>;

export type SearchScreenRouteProp = RouteProp<{
	Search: {
		coin?: Coin;
		solCoin?: Coin;
	};
}, 'Search'>;

export interface SearchFilters {
	query: string;
	tags?: string[];
	minVolume24h?: number;
	limit?: number;
	offset?: number;
	sortBy?: SearchSortByOption;
	sortDesc?: boolean;
}

export interface SearchState {
	loading: boolean;
	error: string | null;
	results: Coin[];
	filters: SearchFilters;
} 
