import React, { useState, useCallback, useEffect } from 'react';
import { View, TextInput, FlatList, SafeAreaView } from 'react-native';
import { useTheme } from 'react-native-paper';
import { SearchScreenProps, SearchState } from './types';
import { performSearch, DEBOUNCE_DELAY, getEnrichedCoinData, handleCoinNavigation } from './scripts';
import { Coin } from '@/types';
import SearchResultItem from '@/components/Common/SearchResultItem';
import { createStyles } from './styles';
import { useToast } from '@/components/Common/Toast';

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

	const handleSearch = useCallback(async (query: string) => {
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
		<SearchResultItem
			coin={item}
			onPress={(coin) => handleCoinNavigation(coin, navigation, toast)}
			isEnriched={item.price !== undefined && item.dailyVolume !== undefined}
		/>
	);

	return (
		<SafeAreaView style={styles.safeArea}>
			<View style={styles.container}>
				<View style={styles.searchContainer}>
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
				<FlatList
					data={state.results}
					renderItem={renderItem}
					keyExtractor={item => item.mintAddress}
					style={styles.listContainer}
					contentContainerStyle={styles.listContent}
				/>
			</View>
		</SafeAreaView>
	);
};

export default SearchScreen; 
