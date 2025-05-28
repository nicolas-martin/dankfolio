import React, { useState, useCallback, useEffect } from 'react';
import { View, TextInput, FlatList, SafeAreaView, ActivityIndicator } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { SearchScreenProps, SearchState } from './types';
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
		sortBy: 'volume',
		sortDesc: true
	}
};

const SearchScreen: React.FC<SearchScreenProps> = ({ navigation }) => {
	const [state, setState] = useState<SearchState>(initialState);
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
			if (state.filters.query) {
				handleSearch(state.filters.query);
			}
		}, DEBOUNCE_DELAY);

		return () => clearTimeout(timeoutId);
	}, [state.filters.query, handleSearch]);

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
