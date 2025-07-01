import React, { useState, useCallback, useEffect } from 'react';
import { View, TextInput, SafeAreaView } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
// Assuming RootStackParamList is here
import { SearchScreenNavigationProp, SearchState } from './types';
import { performSearch, DEBOUNCE_DELAY, handleCoinNavigation } from './scripts';
import { Coin } from '@/types';
import SearchResultsList from './SearchResultsList';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { useStyles } from './styles';
import { SearchIcon } from '@components/Common/Icons';
import { logger } from '@/utils/logger';
import { getUserFriendlySearchError } from '@/utils/errorUtils';
import InfoState from '@/components/Common/InfoState'; // Import InfoState

const initialState: SearchState = {
	loading: false,
	error: null,
	results: [],
	filters: {
		query: ''
	}
};

const SearchScreen: React.FC = () => {
	const navigation = useNavigation<SearchScreenNavigationProp>();

	const [state, setState] = useState<SearchState>(initialState);
	const [hasCompletedSearch, setHasCompletedSearch] = useState(false);
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
			setHasCompletedSearch(true);
		} catch (error: unknown) {
			const userFriendlyError = getUserFriendlySearchError(error);
			setState(prev => ({
				...prev,
				loading: false,
				error: userFriendlyError
			}));
			setHasCompletedSearch(true);
		}
	}, [state.filters]); // Keep existing dependencies for handleSearch itself

	// Debounced function to perform search or clear results
	const debouncedSearchTrigger = useDebouncedCallback(() => {
		// Logic from the original useEffect
		if (state.filters.query) {
			handleSearch(state.filters.query);
		} else if (!state.filters.query && state.results.length > 0) {
			setState(prev => ({ ...prev, results: [] }));
			setHasCompletedSearch(false);
		}
	}, DEBOUNCE_DELAY);

	useEffect(() => {
		// This effect now calls the debounced function whenever query changes.
		debouncedSearchTrigger();
		// The cleanup of the timeout is handled inside useDebouncedCallback.
	}, [state.filters.query, state.results.length, debouncedSearchTrigger]);



	const handleQueryChange = (query: string) => {
		setState(prev => ({
			...prev,
			filters: { ...prev.filters, query }
		}));
	};

	const handlePressSearchResult = useCallback((coin: Coin) => {
		logger.breadcrumb({ category: 'ui', message: 'Pressed search result item', data: { coinSymbol: coin.symbol, coinMint: coin.address } });
		handleCoinNavigation(coin, navigation);
	}, [navigation]);

	const showEmpty = !state.loading && !state.error && state.results.length === 0 && state.filters.query && hasCompletedSearch;
	const showError = !state.loading && !!state.error;
	const showResults = !state.loading && !showError && state.results.length > 0;


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
				</View>
				{/* Results List / Info States - Now scrollable */}
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
						<SearchResultsList
							coins={state.results}
							onCoinPress={handlePressSearchResult}
							testIdPrefix="search-result"
						/>
					)}
				</View>
			</View>
		</SafeAreaView>
	);
};

export default SearchScreen; 
