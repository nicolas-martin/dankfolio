import React, { useMemo, useCallback } from 'react';
import { View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import Animated from 'react-native-reanimated';
import ShimmerPlaceholder from '../../Common/ShimmerPlaceholder';
import { useCoinStore } from '@store/coins';
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

	// Create duplicated data for infinite scrolling
	const scrollData = useMemo(() => {
		if (!newlyListedCoins || newlyListedCoins.length === 0) return [];
		// Duplicate the array to create seamless infinite scroll
		return newlyListedCoins;
	}, [newlyListedCoins]);

	// Placeholder component for loading horizontal ticker cards
	const renderPlaceholderCard = () => (
		<View style={[styles.cardWrapper, styles.placeholderCardContainer]}>
			<ShimmerPlaceholder
				width={48}
				height={48}
				borderRadius={24}
				style={styles.placeholderIconShimmer}
			/>
			<ShimmerPlaceholder
				width="70%"
				height={14}
				borderRadius={4}
				style={styles.placeholderTextShimmerLine1}
			/>
			<ShimmerPlaceholder
				width="50%"
				height={12}
				borderRadius={4}
				style={styles.placeholderTextShimmerLine1}
			/>
			<ShimmerPlaceholder
				width="40%"
				height={12}
				borderRadius={4}
				style={styles.placeholderTextShimmerLine2}
			/>
		</View>
	);

	const handleCoinPress = useCallback((coin: Coin) => {
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
	}, [navigation, getCoinByID]); // Added dependencies for handleCoinPress

	const renderItem = useCallback(({ item, _index }: { item: Coin; index: number }) => { // index prefixed
		return (
			<View style={styles.cardWrapper}>
				<HorizontalTickerCard
					coin={item}
					onPress={handleCoinPress} // handleCoinPress is now memoized
					testIdPrefix="new-coin"
				/>
			</View>
		);
	}, [styles.cardWrapper, handleCoinPress]); // Added handleCoinPress to dependencies

	if (isLoadingNewlyListed && newlyListedCoins.length === 0) {
		return (
			<View style={styles.container}>
				<View style={styles.titleContainer}>
					<ShimmerPlaceholder
						width={120}
						height={20}
						borderRadius={4}
					/>
				</View>
				<Animated.FlatList
					data={[1, 2, 3, 4]} // Show 4 placeholder cards
					renderItem={() => renderPlaceholderCard()}
					keyExtractor={(item, index) => `placeholder-${index}`}
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={styles.listContentContainer}
					scrollEnabled={false} // Disable scrolling for placeholders
				/>
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
				{/* "View All" button and associated false && condition removed */}
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
