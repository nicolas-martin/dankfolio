import React from 'react';
import { View, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { LoadingAnimation } from '../../Common/Animations';
import { useCoinStore } from '@store/coins';
import { useToast } from '@components/Common/Toast'; // Import useToast
import CoinCard from '@components/Home/CoinCard'; // Assuming CoinCard can be used or adapted
import { Coin } from '@/types';
import { logger } from '@/utils/logger';
import { formatTimeAgo } from '@/utils/timeFormat'; // Import the new utility
import { createStyles } from './NewCoins.styles';

// Define a navigation prop type, assuming a similar structure to HomeScreenNavigationProp
// This might need adjustment based on where CoinCard navigates.
// For now, let's assume it navigates to 'CoinDetail'.
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation'; // Assuming you have RootStackParamList defined

// Allow navigation to Search as well for the "View All" button
type NewCoinsNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CoinDetail' | 'Search'>;

const NewCoins: React.FC = () => {
	const theme = useTheme();
	const styles = createStyles(theme);
	const navigation = useNavigation<NewCoinsNavigationProp>();

	// Use separate selectors to avoid creating new objects on every render
	const newlyListedCoins = useCoinStore(state => state.newlyListedCoins);
	const isLoadingNewlyListed = useCoinStore(state => state.isLoadingNewlyListed);
	const getCoinByID = useCoinStore(state => state.getCoinByID); // Changed from enrichCoin
	const { showToast } = useToast(); // Get showToast

	// Note: We don't fetch newly listed coins here because the Home screen already does it
	// This prevents duplicate API calls and infinite re-render loops

	const handleCoinPress = async (coin: Coin) => {
		try {
			const coinDetails = await getCoinByID(coin.mintAddress, true); // Changed from enrichCoin
			if (coinDetails) {
				logger.breadcrumb({
					category: 'navigation',
					message: 'Pressed coin from NewCoins, fetched details and navigating', // Updated message
					data: { coinSymbol: coinDetails.symbol, coinMint: coinDetails.mintAddress },
				});
				navigation.navigate('CoinDetail', { coin: coinDetails });
			} else {
				// Log failure to fetch details
				logger.warn('[NewCoins] Failed to fetch coin details with getCoinByID, not navigating', { coinSymbol: coin.symbol, coinMint: coin.mintAddress });
				showToast({ type: 'error', message: 'Failed to load coin details. Please try again.' });
			}
		} catch (error) {
			// Log error during getCoinByID process
			logger.error(`[NewCoins] Error during getCoinByID for ${coin.symbol}:`, { error, coinMint: coin.mintAddress });
			showToast({ type: 'error', message: 'An error occurred. Please try again.' });
		}
	};

	if (isLoadingNewlyListed && newlyListedCoins.length === 0) {
		return (
			<View style={styles.loadingContainer}>
				<LoadingAnimation size={60} />
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
						logger.log('[NewCoins] Navigate to Search with newly listed sort');
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
					logger.log('[NewCoins] Navigate to Search with newly listed sort');
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
				renderItem={({ item }) => {
					const timeAgo = formatTimeAgo(item.jupiterListedAt);
					return (
						<TouchableOpacity onPress={() => handleCoinPress(item)} style={styles.cardWrapper}>
							<CoinCard coin={item} onPress={() => handleCoinPress(item)} isHorizontal={true} />
							{timeAgo && <Text style={styles.timeAgoText}>{timeAgo}</Text>}
						</TouchableOpacity>
					);
				}}
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

export default NewCoins;
