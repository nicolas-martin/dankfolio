import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Coin } from '@/types';

export type SearchScreenProps = NativeStackScreenProps<RootStackParamList, 'Search'>;

export interface SearchFilters {
	query: string;
	tags?: string[];
	minVolume24h?: number;
	limit?: number;
	offset?: number;
	sortBy?: string;
	sortDesc?: boolean;
}

export interface SearchState {
	loading: boolean;
	error: string | null;
	results: Coin[];
	filters: SearchFilters;
} 
