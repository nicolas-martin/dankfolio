import React, { useState, useCallback, useEffect } from 'react';
import { View, TextInput, FlatList, SafeAreaView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useRoute, RouteProp } from '@react-navigation/native'; // Import useRoute and RouteProp
import { RootStackParamList } from '@/types/navigation'; // Assuming RootStackParamList is here
import { SearchScreenProps, SearchState } from './types';
import { SearchSortByOption } from '@/services/grpc/model'; // Import the type
import { performSearch, DEBOUNCE_DELAY, handleCoinNavigation } from './scripts';
import { Coin } from '@/types';
import SearchResultItem from '@/components/Common/SearchResultItem';
import { createStyles } from './styles';
import { useToast } from '@/components/Common/Toast';
import { SearchIcon } from '@components/Common/Icons';
import { logger } from '@/utils/logger';

const initialState: SearchState = {
	loading: false,
	error: null,
	results: [],
	filters: {
		query: '',
		tags: [],
		minVolume24h: 0,
		sortBy: 'volume24h', // Changed default
		sortDesc: true
	}
};

const SearchScreen: React.FC<SearchScreenProps> = ({ navigation }) => {
	const route = useRoute<RouteProp<RootStackParamList, 'Search'>>();
	const defaultFiltersFromRoute = route.params?.defaultSortBy ? {
		query: '',
		tags: [],
		minVolume24h: 0,
		sortBy: route.params.defaultSortBy as SearchSortByOption, // Cast if necessary, ensure type safety
		sortDesc: route.params.defaultSortDesc !== undefined ? route.params.defaultSortDesc : true,
	} : initialState.filters;

	const [state, setState] = useState<SearchState>({
		...initialState,
		filters: defaultFiltersFromRoute,
	});
	const theme = useTheme();
	const styles = createStyles(theme);
	const toast = useToast();

	useEffect(() => {
		logger.breadcrumb({ category: 'navigation', message: 'Viewed SearchScreen' });
	}, []);

	const handleSearch = useCallback(async (query: string) => {
		logger.breadcrumb({ category: 'search', message: 'Search performed', data: { query } });
		setState(prev => ({ ...prev, loading: true, error: null }));
		try {
			const results = await performSearch(query, state.filters);
			setState(prev => ({ ...prev, loading: false, results }));
		} catch (error) {
			setState(prev => ({
				...prev,
				loading: false,
				error: error instanceof Error ? error.message : 'An error occurred'
			}));
		}
	}, [state.filters]);

	useEffect(() => {
		const timeoutId = setTimeout(() => {
			// Fetch if query exists, or if sorting by listed_at (even with empty query),
			// or if sort order changed for a non-empty query.
			// This logic ensures that changing sort order always attempts a refetch if relevant.
			if (state.filters.query || state.filters.sortBy === 'jupiter_listed_at' || (state.filters.query === '' && state.results.length > 0)) {
				// The condition `(state.filters.query === '' && state.results.length > 0)` is to handle clearing query
				// when a sort like 'jupiter_listed_at' might want to show results for empty query.
				// More robust: if a sort change happens, and query is empty, and 'jupiter_listed_at' is chosen, fetch.
				// If query is cleared, and not 'jupiter_listed_at', then clear results.
				if (state.filters.query || state.filters.sortBy === 'jupiter_listed_at') {
					handleSearch(state.filters.query);
				} else {
					// If query is empty and not sorting by 'jupiter_listed_at', clear results
					setState(prev => ({ ...prev, results: [] }));
				}
			} else if (!state.filters.query && state.results.length > 0) { // state.filters.sortBy !== 'jupiter_listed_at' is implied here
				// If query is cleared, and we are not on a default-view sort like jupiter_listed_at, clear results
				setState(prev => ({ ...prev, results: [] }));
			}
		}, DEBOUNCE_DELAY);

		return () => clearTimeout(timeoutId);
		// Watch relevant parts of filters for re-fetching
	}, [state.filters.query, state.filters.sortBy, state.filters.sortDesc, handleSearch]);

	const setSortOrder = (sortBy: SearchSortByOption, sortDesc: boolean) => {
		setState(prev => ({
			...prev,
			filters: {
				...prev.filters,
				sortBy,
				sortDesc,
			},
			results: [], // Clear previous results
			loading: true, // Set loading true immediately
			error: null,
		}));
		// useEffect will pick this up and call handleSearch
	};

	const handleQueryChange = (query: string) => {
		setState(prev => ({
			...prev,
			filters: { ...prev.filters, query }
		}));
	};

	const renderItem = ({ item }: { item: Coin }) => (
		<View style={styles.card}>
			<SearchResultItem
				coin={item}
				onPress={(coin) => {
					logger.breadcrumb({ category: 'ui', message: 'Pressed search result item', data: { coinSymbol: coin.symbol, coinMint: coin.mintAddress } });
					handleCoinNavigation(coin, navigation, toast);
				}}
				isEnriched={item.price !== undefined && item.dailyVolume !== undefined}
			/>
		</View>
	);

	const showEmpty = !state.loading && !state.error && state.results.length === 0 && state.filters.query;
	const showError = !state.loading && !!state.error;

	return (
		<SafeAreaView style={styles.safeArea}>
			<View style={[styles.container, { backgroundColor: theme.colors.background }]}>
				<View style={styles.contentPadding}>
					{/* Header Row */}
					<View style={styles.headerRow}>
						<SearchIcon size={32} color={theme.colors.onSurface} />
						<Text variant="headlineSmall" style={{ color: theme.colors.onSurface, marginLeft: 12 }}>
							Search
						</Text>
					</View>
					{/* Search Bar Card */}
					<View style={[styles.card, styles.searchCard]}>
						<TextInput
							style={styles.searchInput}
							placeholder="Search tokens..."
							value={state.filters.query}
							onChangeText={handleQueryChange}
							autoCapitalize="none"
							autoCorrect={false}
							placeholderTextColor={theme.colors.onSurfaceVariant}
						/>
					</View>
					{/* Sort Buttons */}
					<View style={styles.sortButtonsContainer}>
						<TouchableOpacity onPress={() => setSortOrder('volume24h', true)} style={styles.sortButton}>
							<Text style={styles.sortButtonText}>Sort by Volume</Text>
						</TouchableOpacity>
						<TouchableOpacity onPress={() => setSortOrder('jupiter_listed_at', true)} style={styles.sortButton}>
							<Text style={styles.sortButtonText}>Sort by Newly Listed</Text>
						</TouchableOpacity>
					</View>
				</View>
				{/* Results List */}
				<View style={styles.flex1}>
					{state.loading && (
						<View style={styles.loadingContainer}>
							<ActivityIndicator size="large" color={theme.colors.primary} />
						</View>
					)}
					{showError && (
						<View style={styles.emptyContainer}>
							<Text style={styles.emptyText}>Error: {state.error}</Text>
						</View>
					)}
					{showEmpty && (
						<View style={styles.emptyContainer}>
							<SearchIcon size={48} color={theme.colors.onSurfaceVariant} />
							<Text style={styles.emptyText}>No tokens found</Text>
						</View>
					)}
					{!state.loading && !showError && !showEmpty && (
						<FlatList
							data={state.results}
							renderItem={renderItem}
							keyExtractor={item => item.mintAddress}
							contentContainerStyle={styles.listContent}
						/>
					)}
				</View>
			</View>
		</SafeAreaView>
	);
};

export default SearchScreen; 
