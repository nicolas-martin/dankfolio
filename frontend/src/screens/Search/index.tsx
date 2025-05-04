import React, { useState, useCallback, useEffect } from 'react';
import { View, TextInput, FlatList, TouchableOpacity, Text, SafeAreaView } from 'react-native';
import { useTheme } from 'react-native-paper';
import { SearchScreenProps, SearchState } from './types';
import { performSearch, getTokenLogoURI, DEBOUNCE_DELAY } from './scripts';
import { Coin } from '@/types';
import { TokenImage } from '@/components/Common/TokenImage';
import { formatPrice, formatPercentage } from '@/utils/format';
import { createStyles } from './styles';

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
		<TouchableOpacity
			style={styles.tokenItem}
			onPress={() => navigation.navigate('CoinDetail', { coin: item })}
		>
			<View style={styles.tokenInfo}>
				<TokenImage uri={getTokenLogoURI(item)} size={40} />
				<View style={styles.tokenDetails}>
					<Text style={styles.tokenName}>{item.name}</Text>
					<Text style={styles.tokenSymbol}>{item.symbol}</Text>
				</View>
			</View>
			<View style={styles.tokenMetrics}>
				<Text style={styles.tokenPrice}>{formatPrice(item.price)}</Text>
				<Text style={[
					item.percentage && item.percentage >= 0 ? styles.priceChangePositive : styles.priceChangeNegative
				]}>
					{item.percentage ? formatPercentage(item.percentage) : 'N/A'}
				</Text>
			</View>
		</TouchableOpacity>
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
				{state.error ? (
					<View style={styles.errorContainer}>
						<Text style={styles.errorText}>{state.error}</Text>
					</View>
				) : (
					<FlatList
						data={state.results}
						renderItem={renderItem}
						keyExtractor={item => item.mintAddress}
						style={styles.listContainer}
						contentContainerStyle={styles.listContent}
					/>
				)}
			</View>
		</SafeAreaView>
	);
};

export default SearchScreen; 
