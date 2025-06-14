import { useMemo, useCallback } from 'react'; // React import will be added by the next line
import React from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import Animated from 'react-native-reanimated';
import ShimmerPlaceholder from '../../Common/ShimmerPlaceholder';
import { useCoinStore } from '@store/coins';
import HorizontalTickerCard from '@components/Home/HorizontalTickerCard';
import { Coin } from '@/types';
import { logger } from '@/utils/logger';
import { useStyles } from './NewCoins.styles';
import { RootStackParamList } from '@/types/navigation';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Allow navigation to Search as well for the "View All" button
type NewCoinsNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CoinDetail' | 'Search'>;

const NewCoinsInternal: React.FC = () => {
	const styles = useStyles();
	const navigation = useNavigation<NewCoinsNavigationProp>();
	const CARD_WIDTH = 148; // cardWrapper width (140) + marginRight (8)

	// Use separate selectors to avoid creating new objects on every render
	const newlyListedCoins = useCoinStore(state => state.newlyListedCoins);
	const isLoadingNewlyListed = useCoinStore(state => state.isLoadingNewlyListed);
	const getCoinByID = useCoinStore(state => state.getCoinByID);

	// Create duplicated data for infinite scrolling
	const scrollData = useMemo(() => {
		if (!newlyListedCoins || newlyListedCoins.length === 0) return [];
		// Duplicate the array to create seamless infinite scroll
		return newlyListedCoins;
	}, [newlyListedCoins]);

	// Memoized styles at component level
	const placeholderCardStyle = useMemo(() => [
		styles.cardWrapper,
		styles.placeholderCardContainer
	], [styles.cardWrapper, styles.placeholderCardContainer]);

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
	}, [navigation, getCoinByID]);

	const getItemLayout = useCallback((_data: any, index: number) => ({
		length: CARD_WIDTH,
		offset: CARD_WIDTH * index,
		index,
	}), [CARD_WIDTH]);

	// Placeholder component for loading horizontal ticker cards
	const renderPlaceholderCard = () => {
		return (
			<View style={placeholderCardStyle}>
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
	};

	const renderItem = useCallback(({ item }: { item: Coin; index: number }) => {
		return (
			<View style={styles.cardWrapper}>
				<HorizontalTickerCard
					coin={item}
					onPress={handleCoinPress}
					testIdPrefix="new-coin"
				/>
			</View>
		);
	}, [styles.cardWrapper, handleCoinPress]);

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
					data={[1, 2, 3, 4]}
					renderItem={() => renderPlaceholderCard()}
					keyExtractor={(_item, index) => `placeholder-${index}`}
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
		<View style={styles.container}>
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
				scrollEnabled={true}
				scrollEventThrottle={1}
				decelerationRate="fast"
				snapToInterval={CARD_WIDTH}
				snapToAlignment="start"
				maxToRenderPerBatch={3}
				updateCellsBatchingPeriod={50}
				initialNumToRender={5}
				windowSize={5}
				getItemLayout={getItemLayout}
				ListEmptyComponent={
					isLoadingNewlyListed ? null : (
						<Text style={styles.emptyText}>No new listings available.</Text>
					)
				}
			/>
		</View>
	);
};

export default React.memo(NewCoinsInternal);
