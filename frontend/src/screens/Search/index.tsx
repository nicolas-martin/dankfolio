import React, { useState, useCallback, useEffect } from 'react';
import { View, TextInput, FlatList, SafeAreaView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
// Assuming RootStackParamList is here
import { SearchScreenRouteProp, SearchScreenNavigationProp, SearchState } from './types';
import { SearchSortByOption } from '@/services/grpc/model'; // Import the type
import { performSearch, DEBOUNCE_DELAY, handleCoinNavigation } from './scripts';
import { Coin } from '@/types';
import SearchResultItem from '@/components/Common/SearchResultItem';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { useStyles } from './styles';
import { SearchIcon } from '@components/Common/Icons';
import { logger } from '@/utils/logger';
import InfoState from '@/components/Common/InfoState'; // Import InfoState

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

const SearchScreen: React.FC = () => {
	const navigation = useNavigation<SearchScreenNavigationProp>();
	const route = useRoute<SearchScreenRouteProp>();
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
	const styles = useStyles();
	// const _toast = useToast(); // Prefixed toast
	useEffect(() => {
		logger.breadcrumb({ category: 'navigation', message: 'Viewed SearchScreen' });
	}, []);

	const handleSearch = useCallback(async (query: string) => {
		logger.breadcrumb({ category: 'search', message: 'Search performed', data: { query } });
		setState(prev => ({ ...prev, loading: true, error: null }));
		try {
			const results = await performSearch(query, state.filters);
			setState(prev => ({ ...prev, loading: false, results }));
		} catch (error: unknown) {
			if (error instanceof Error) {
				setState(prev => ({
					...prev,
					loading: false,
					error: error.message
				}));
			} else {
				setState(prev => ({
					...prev,
					loading: false,
					error: 'An unknown error occurred'
				}));
			}
		}
	}, [state.filters]); // Keep existing dependencies for handleSearch itself

	// Debounced function to perform search or clear results
	const debouncedSearchTrigger = useDebouncedCallback(() => {
		// Logic from the original useEffect
		if (state.filters.query || state.filters.sortBy === 'jupiter_listed_at' || (state.filters.query === '' && state.results.length > 0)) {
			if (state.filters.query || state.filters.sortBy === 'jupiter_listed_at') {
				handleSearch(state.filters.query);
			} else {
				setState(prev => ({ ...prev, results: [] }));
			}
		} else if (!state.filters.query && state.results.length > 0) {
			setState(prev => ({ ...prev, results: [] }));
		}
	}, DEBOUNCE_DELAY);

	useEffect(() => {
		// This effect now calls the debounced function whenever relevant filter criteria change.
		debouncedSearchTrigger();
		// The cleanup of the timeout is handled inside useDebouncedCallback.
	}, [state.filters.query, state.filters.sortBy, state.filters.sortDesc, state.results.length, debouncedSearchTrigger]);


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

	const handlePressSearchResult = useCallback((coin: Coin) => {
		logger.breadcrumb({ category: 'ui', message: 'Pressed search result item', data: { coinSymbol: coin.symbol, coinMint: coin.mintAddress } });
		handleCoinNavigation(coin, navigation);
	}, [navigation]);

	const renderItem = useCallback(({ item }: { item: Coin }) => (
		<View style={styles.card}>
			<SearchResultItem
				coin={item}
				onPress={handlePressSearchResult}
				isEnriched={item.price !== undefined && item.dailyVolume !== undefined}
			/>
		</View>
	), [styles.card, handlePressSearchResult]);

	const showEmpty = !state.loading && !state.error && state.results.length === 0 && state.filters.query;
	const showError = !state.loading && !!state.error;
	const showResults = !state.loading && !showError && !showEmpty && state.results.length > 0;


	return (
		<SafeAreaView style={styles.safeArea}>
			<View style={styles.container}>
				<View style={styles.contentPadding}>
					{/* Header Row */}
					<View style={styles.headerRow}>
						<SearchIcon size={32} color={styles.colors.onSurface} />
						<Text variant="headlineSmall" style={styles.headerTextStyle}>
							Search
						</Text>
					</View>
					{/* Search Bar Card */}
					<View style={styles.searchCardStyle}>
						<TextInput
							style={styles.searchInput}
							placeholder="Search tokens..."
							value={state.filters.query}
							onChangeText={handleQueryChange}
							autoCapitalize="none"
							autoCorrect={false}
							placeholderTextColor={styles.colors.onSurfaceVariant}
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
				{/* Results List / Info States */}
				<View style={styles.flex1}>
					{state.loading && <InfoState isLoading={true} />}
					{showError && (
						<InfoState
							error={state.error}
							title="Search Error"
							iconName="alert-circle-outline"
						/>
					)}
					{showEmpty && (
						<InfoState
							emptyMessage="No tokens found for your query."
							title="No Results"
							iconName="magnify"
						/>
					)}
					{showResults && (
						<FlatList
							data={state.results}
							renderItem={renderItem}
							keyExtractor={item => item.mintAddress}
							contentContainerStyle={styles.listContent}
							initialNumToRender={10}
							maxToRenderPerBatch={10}
							windowSize={21}
						// getItemLayout might be added later if item height is fixed and known
						/>
					)}
				</View>
			</View>
		</SafeAreaView>
	);
};

export default SearchScreen; 
