import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types';
import { Token } from '@/services/grpc/model';

export type SearchScreenProps = NativeStackScreenProps<RootStackParamList, 'Search'>;

export interface SearchFilters {
	tags?: string[];
	minVolume24h?: number;
	sortBy?: string;
	sortDesc?: boolean;
}

export interface SearchState {
	query: string;
	tokens: Token[];
	isLoading: boolean;
	error?: string;
	filters: SearchFilters;
} 