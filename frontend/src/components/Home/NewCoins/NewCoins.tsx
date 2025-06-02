import React, { useRef, useEffect } from 'react';
import { View, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { LoadingAnimation } from '../../Common/Animations';
import { useCoinStore } from '@store/coins';
import { useToast } from '@components/Common/Toast'; // Import useToast
import HorizontalTickerCard from '@components/Home/HorizontalTickerCard';
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
	const flatListRef = useRef<FlatList<Coin>>(null);

	// Constants for scrolling behavior
	const SCROLL_INTERVAL = 3000; // milliseconds
	const SCROLL_AMOUNT_PIXELS = 148; // cardWrapper width (140) + marginRight (8)

	// Use separate selectors to avoid creating new objects on every render
	const newlyListedCoins = useCoinStore(state => state.newlyListedCoins);
	const isLoadingNewlyListed = useCoinStore(state => state.isLoadingNewlyListed);
	const getCoinByID = useCoinStore(state => state.getCoinByID); // Changed from enrichCoin
	const { showToast } = useToast(); // Get showToast

	useEffect(() => {
		// Ensure newlyListedCoins is available from useCoinStore and is used in the effect's dependency array
		if (!newlyListedCoins || newlyListedCoins.length === 0) {
			return; // Don't scroll if no coins or not loaded yet
		}

		let currentOffset = 0;
		const timer = setInterval(() => {
			if (flatListRef.current) {
				currentOffset += SCROLL_AMOUNT_PIXELS;

				// Calculate total width of the content
				// newlyListedCoins.length gives the number of items
				const totalContentWidth = newlyListedCoins.length * SCROLL_AMOUNT_PIXELS;

				if (currentOffset >= totalContentWidth) {
					currentOffset = 0; // Reset to loop
					// Jump to start without animation for a clean loop
					flatListRef.current.scrollToOffset({ offset: currentOffset, animated: false });
				} else {
					flatListRef.current.scrollToOffset({ offset: currentOffset, animated: true });
				}
			}
		}, SCROLL_INTERVAL);

		return () => clearInterval(timer); // Cleanup on unmount

	}, [newlyListedCoins, SCROLL_AMOUNT_PIXELS, SCROLL_INTERVAL]);

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
				ref={flatListRef}
				data={newlyListedCoins}
				renderItem={({ item }) => {
					const timeAgo = formatTimeAgo(item.jupiterListedAt);
					return (
						<View style={styles.cardWrapper}>
							<HorizontalTickerCard coin={item} onPress={handleCoinPress} />
							{timeAgo && <Text style={styles.timeAgoText}>{timeAgo}</Text>}
						</View>
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
