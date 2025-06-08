import React, { useMemo, useCallback } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import Animated from 'react-native-reanimated';
import { LoadingAnimation } from '../../Common/Animations';
import { useCoinStore } from '@store/coins';
import { useToast } from '@components/Common/Toast';
import HorizontalTickerCard from '@components/Home/HorizontalTickerCard';
import { Coin } from '@/types';
import { logger } from '@/utils/logger';
import { createStyles } from './NewCoins.styles';
import { RootStackParamList } from '@/types/navigation';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Allow navigation to Search as well for the "View All" button
type NewCoinsNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CoinDetail' | 'Search'>;

const NewCoins: React.FC = () => {
	const theme = useTheme();
	const styles = createStyles(theme);
	const navigation = useNavigation<NewCoinsNavigationProp>();
	const CARD_WIDTH = 148; // cardWrapper width (140) + marginRight (8)

	// Use separate selectors to avoid creating new objects on every render
	const newlyListedCoins = useCoinStore(state => state.newlyListedCoins);
	const isLoadingNewlyListed = useCoinStore(state => state.isLoadingNewlyListed);
	const getCoinByID = useCoinStore(state => state.getCoinByID); // Changed from enrichCoin
	const { showToast } = useToast(); // Get showToast

	// Create duplicated data for infinite scrolling
	const scrollData = useMemo(() => {
		if (!newlyListedCoins || newlyListedCoins.length === 0) return [];
		// Duplicate the array to create seamless infinite scroll
		return newlyListedCoins;
	}, [newlyListedCoins]);


	const handleCoinPress = (coin: Coin) => {
		// Navigate immediately with the basic coin data
		logger.breadcrumb({
			category: 'navigation',
			message: 'Navigating to CoinDetail from NewCoins (immediate navigation)',
			data: { coinSymbol: coin.symbol, coinMint: coin.mintAddress },
		});
		
		navigation.navigate('CoinDetail', { 
			coin: coin
		});
		
		// Trigger background fetch to update the coin data in the store
		// The CoinDetail screen will automatically update when this completes
		getCoinByID(coin.mintAddress, true).catch(error => {
			logger.error(`[NewCoins] Background fetch failed for ${coin.symbol}:`, { error, coinMint: coin.mintAddress });
		});
	};

	const renderItem = useCallback(({ item, index }: { item: Coin; index: number }) => {
		return (
			<View style={styles.cardWrapper}>
				<HorizontalTickerCard 
					coin={item} 
					onPress={handleCoinPress}
				/>
			</View>
		);
	}, [styles.cardWrapper, handleCoinPress]);

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
				</View>
				<Text style={styles.emptyText}>No new listings found at the moment.</Text>
			</View>
		);
	}

	return (
		<View
			style={styles.container}
		>
			<View style={styles.titleContainer}>
				<Text style={styles.title}>New Listings</Text>
				{false && (
					<TouchableOpacity onPress={() => {
						logger.log('[NewCoins] Navigate to Search with newly listed sort');
						navigation.navigate('Search', {
							defaultSortBy: 'jupiter_listed_at', // Matches backend expectation
							defaultSortDesc: true
						});
					}}>
						<Text style={styles.viewAllButton}>View All</Text>
					</TouchableOpacity>
				)}
			</View>
			<Animated.FlatList
				data={scrollData}
				renderItem={renderItem}
				keyExtractor={(item, index) => `${item.mintAddress}-${index}`}
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.listContentContainer}
				scrollEnabled={true} // Enable manual scrolling
				scrollEventThrottle={1}
				decelerationRate="fast"
				snapToInterval={CARD_WIDTH}
				snapToAlignment="start"
				// Performance optimizations to prevent UI blocking
				maxToRenderPerBatch={3}
				updateCellsBatchingPeriod={50}
				initialNumToRender={5}
				windowSize={5}
				getItemLayout={(data, index) => ({
					length: CARD_WIDTH,
					offset: CARD_WIDTH * index,
					index,
				})}
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
