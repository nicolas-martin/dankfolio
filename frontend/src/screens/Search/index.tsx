import React, { useCallback, useState } from 'react';
import {
	View,
	TextInput,
	FlatList,
	Image,
	Text,
	ActivityIndicator,
	TouchableOpacity,
	RefreshControl,
	SafeAreaView,
} from 'react-native';
import { useTheme } from 'react-native-paper';
import debounce from 'lodash/debounce';
import { SearchScreenProps, SearchState } from './types';
import { createStyles } from './styles';
import {
	DEBOUNCE_DELAY,
	DEFAULT_FILTERS,
	performSearch,
	formatPrice,
	formatVolume,
	formatPriceChange,
	getTokenLogoURI,
} from './scripts';
import { Token } from '@/services/grpc/model';

const SearchScreen: React.FC<SearchScreenProps> = ({ navigation }) => {
	const theme = useTheme();
	const styles = createStyles(theme);

	const [state, setState] = useState<SearchState>({
		query: '',
		tokens: [],
		isLoading: false,
		filters: DEFAULT_FILTERS,
	});

	const debouncedSearch = useCallback(
		debounce(async (query: string) => {
			if (!query.trim()) {
				setState(prev => ({ ...prev, tokens: [], isLoading: false }));
				return;
			}

			try {
				setState(prev => ({ ...prev, isLoading: true, error: undefined }));
				const tokens = await performSearch(query, state.filters);
				setState(prev => ({ ...prev, tokens, isLoading: false }));
			} catch (error) {
				setState(prev => ({
					...prev,
					isLoading: false,
					error: 'Failed to fetch tokens',
				}));
			}
		}, DEBOUNCE_DELAY),
		[state.filters]
	);

	const handleSearch = (text: string) => {
		console.log("handle search", text);
		setState(prev => ({ ...prev, query: text }));
		debouncedSearch(text);
	};

	const handleRefresh = () => {
		debouncedSearch(state.query);
	};

	const handleTokenPress = (token: Token) => {
		navigation.navigate('Trade', { selectedToken: token });
	};

	const renderTokenItem = ({ item: token }: { item: Token }) => (
		<TouchableOpacity
			style={styles.tokenItem}
			onPress={() => handleTokenPress(token)}
		>
			<Image
				source={{ uri: getTokenLogoURI(token) }}
				style={styles.tokenImage}
			/>
			<View style={styles.tokenInfo}>
				<View style={styles.tokenNameRow}>
					<Text style={styles.tokenName}>{token.name}</Text>
					<Text style={styles.tokenSymbol}>{token.symbol}</Text>
				</View>
				<View style={styles.tokenMetrics}>
					<Text style={styles.tokenPrice}>
						{formatPrice(token.priceUSD)}
					</Text>
					<Text style={styles.tokenVolume}>
						Vol: {formatVolume(token.volume24h)}
					</Text>
					<Text
						style={
							token.priceChange24h >= 0
								? styles.priceChangePositive
								: styles.priceChangeNegative
						}
					>
						{formatPriceChange(token.priceChange24h)}
					</Text>
				</View>
			</View>
		</TouchableOpacity>
	);

	const renderEmptyComponent = () => {
		if (state.isLoading) {
			return (
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={theme.colors.primary} />
				</View>
			);
		}

		if (state.error) {
			return (
				<View style={styles.errorContainer}>
					<Text style={styles.errorText}>{state.error}</Text>
				</View>
			);
		}

		if (state.query.trim()) {
			return (
				<View style={styles.emptyContainer}>
					<Text style={styles.emptyText}>No tokens found</Text>
				</View>
			);
		}

		return (
			<View style={styles.emptyContainer}>
				<Text style={styles.emptyText}>
					Search for tokens by name, symbol, or address
				</Text>
			</View>
		);
	};

	return (
		<SafeAreaView style={styles.safeArea}>
			<View style={styles.container}>
				<View style={styles.searchContainer}>
					<TextInput
						style={styles.searchInput}
						placeholder="Search tokens..."
						placeholderTextColor={theme.colors.onSurfaceVariant}
						value={state.query}
						onChangeText={handleSearch}
						autoCapitalize="none"
						autoCorrect={false}
					/>
				</View>
				<FlatList
					data={state.tokens}
					renderItem={renderTokenItem}
					keyExtractor={token => token.mintAddress}
					contentContainerStyle={styles.listContainer}
					ListEmptyComponent={renderEmptyComponent}
					refreshControl={
						<RefreshControl
							refreshing={state.isLoading}
							onRefresh={handleRefresh}
							tintColor={theme.colors.primary}
						/>
					}
				/>
			</View>
		</SafeAreaView>
	);
};

export default SearchScreen; 
