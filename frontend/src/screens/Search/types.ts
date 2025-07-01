import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Coin } from '@/types';
import type { RootStackParamList } from '@/types/navigation';

export type SearchScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Search'>;

export type SearchScreenRouteProp = RouteProp<RootStackParamList, 'Search'>;

export interface SearchFilters {
	query: string;
}

export interface SearchState {
	loading: boolean;
	error: string | null;
	results: Coin[];
	filters: SearchFilters;
} 
