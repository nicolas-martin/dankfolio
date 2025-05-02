import React, { useState, useCallback, useEffect } from 'react';
import { View, TextInput, FlatList, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { SearchScreenProps, SearchState } from './types';
import { performSearch, getTokenLogoURI, DEBOUNCE_DELAY } from './scripts';
import { Coin } from '@/types';
import { TokenImage } from '@/components/Common/TokenImage';
import { formatPrice, formatPercentage } from '@/utils/format';

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
					<Text style={styles.tokenSymbol}>{item.symbol}</Text>
					<Text style={styles.tokenName}>{item.name}</Text>
				</View>
			</View>
			<View style={styles.tokenMetrics}>
				<Text style={styles.tokenPrice}>{formatPrice(item.price)}</Text>
				<Text style={[
					styles.tokenChange,
					{ color: item.percentage && item.percentage >= 0 ? '#4CAF50' : '#F44336' }
				]}>
					{item.percentage ? formatPercentage(item.percentage) : 'N/A'}
				</Text>
			</View>
		</TouchableOpacity>
	);

	return (
		<View style={styles.container}>
			<TextInput
				style={styles.searchInput}
				placeholder="Search tokens..."
				value={state.filters.query}
				onChangeText={handleQueryChange}
				autoCapitalize="none"
				autoCorrect={false}
			/>
			{state.error && (
				<Text style={styles.errorText}>{state.error}</Text>
			)}
			<FlatList
				data={state.results}
				renderItem={renderItem}
				keyExtractor={item => item.mintAddress}
				style={styles.list}
			/>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
		padding: 16
	},
	searchInput: {
		height: 40,
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 8,
		paddingHorizontal: 16,
		marginBottom: 16
	},
	list: {
		flex: 1
	},
	tokenItem: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#eee'
	},
	tokenInfo: {
		flexDirection: 'row',
		alignItems: 'center'
	},
	tokenDetails: {
		marginLeft: 12
	},
	tokenSymbol: {
		fontSize: 16,
		fontWeight: 'bold'
	},
	tokenName: {
		fontSize: 14,
		color: '#666'
	},
	tokenMetrics: {
		alignItems: 'flex-end'
	},
	tokenPrice: {
		fontSize: 16,
		fontWeight: '500'
	},
	tokenChange: {
		fontSize: 14,
		marginTop: 4
	},
	errorText: {
		color: '#F44336',
		marginBottom: 16
	}
});

export default SearchScreen; 
