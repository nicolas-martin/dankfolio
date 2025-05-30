import React, { useEffect } from 'react';
import { View, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useCoinStore } from '@store/coins';
import CoinCard from '@components/Home/CoinCard'; // Assuming CoinCard can be used or adapted
import { Coin } from '@/types';
import { logger } from '@/utils/logger';
import { createStyles } from './NewlyListedCoins.styles'; // We'll create this styles file next

// Define a navigation prop type, assuming a similar structure to HomeScreenNavigationProp
// This might need adjustment based on where CoinCard navigates.
// For now, let's assume it navigates to 'CoinDetail'.
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/types/navigation'; // Assuming you have RootStackParamList defined

// Allow navigation to Search as well for the "View All" button
type NewlyListedCoinsNavigationProp = StackNavigationProp<RootStackParamList, 'CoinDetail' | 'Search'>;

const NewlyListedCoins: React.FC = () => {
	const theme = useTheme();
	const styles = createStyles(theme); // Styles will be defined in a separate file
	const navigation = useNavigation<NewlyListedCoinsNavigationProp>();

	const { newlyListedCoins, isLoadingNewlyListed, fetchNewlyListedCoins } = useCoinStore(state => ({
		newlyListedCoins: state.newlyListedCoins,
		isLoadingNewlyListed: state.isLoadingNewlyListed,
		fetchNewlyListedCoins: state.fetchNewlyListedCoins,
	}));

	useEffect(() => {
		fetchNewlyListedCoins(10); // Fetch top 10 newly listed coins
		logger.breadcrumb({ category: 'ui', message: 'NewlyListedCoins component mounted, fetching data' });
	}, [fetchNewlyListedCoins]);

	const handleCoinPress = (coin: Coin) => {
		logger.breadcrumb({
			category: 'navigation',
			message: 'Pressed coin from NewlyListedCoins',
			data: { coinSymbol: coin.symbol, coinMint: coin.mintAddress },
		});
		navigation.navigate('CoinDetail', { coin });
	};

	if (isLoadingNewlyListed && newlyListedCoins.length === 0) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="small" color={theme.colors.primary} />
				<Text style={styles.loadingText}>Loading new listings...</Text>
			</View>
		);
	}

	if (!isLoadingNewlyListed && newlyListedCoins.length === 0) {
		return (
			<View style={styles.container}>
				<View style={styles.titleContainer}>
					<Text style={styles.title}>New Listings</Text>
					<TouchableOpacity onPress={() => {
						logger.log('[NewlyListedCoins] Navigate to Search with newly listed sort');
						navigation.navigate('Search', {
							defaultSortBy: 'jupiter_listed_at', // Matches backend expectation
							defaultSortDesc: true
						});
					}}>
						<Text style={styles.viewAllButton}>View All</Text>
					</TouchableOpacity>
				</View>
				<Text style={styles.emptyText}>No new listings found at the moment.</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<View style={styles.titleContainer}>
				<Text style={styles.title}>New Listings</Text>
				<TouchableOpacity onPress={() => {
					logger.log('[NewlyListedCoins] Navigate to Search with newly listed sort');
					navigation.navigate('Search', {
						defaultSortBy: 'jupiter_listed_at', // Matches backend expectation
						defaultSortDesc: true
					});
				}}>
					<Text style={styles.viewAllButton}>View All</Text>
				</TouchableOpacity>
			</View>
			<FlatList
				data={newlyListedCoins}
				renderItem={({ item }) => (
					<TouchableOpacity onPress={() => handleCoinPress(item)} style={styles.cardWrapper}>
						{/* Using existing CoinCard. May need a CompactCoinCard later. */}
						<CoinCard coin={item} onPress={() => handleCoinPress(item)} isHorizontal={true} />
					</TouchableOpacity>
				)}
				keyExtractor={item => item.mintAddress}
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.listContentContainer}
				ListEmptyComponent={
					isLoadingNewlyListed ? null : ( // Don't show empty text if still loading initially
						<Text style={styles.emptyText}>No new listings available.</Text>
					)
				}
			/>
		</View>
	);
};

export default NewlyListedCoins;
