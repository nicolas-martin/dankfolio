import { useCallback } from 'react';
import React from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import Animated from 'react-native-reanimated';
import ShimmerPlaceholder from '@/components/Common/ShimmerPlaceholder';
import HorizontalTickerCard from '@/components/Home/HorizontalTickerCard';
import { Coin } from '@/types';
import { logger } from '@/utils/logger';
import { useStyles } from './NewCoins.styles';
import { RootStackParamList } from '@/types/navigation';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Allow navigation to Search as well for the "View All" button
type NewCoinsNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CoinDetail' | 'Search'>;

// Props interface for the component
interface NewCoinsProps {
	newCoins: Coin[];
	isLoading: boolean;
}

const NewCoins: React.FC<NewCoinsProps> = ({ newCoins: newlyListedCoins, isLoading: isLoadingNewlyListed }) => {
	const styles = useStyles();
	const navigation = useNavigation<NewCoinsNavigationProp>();
	const CARD_WIDTH = 88; // cardWrapper width (80) + marginRight (8)

	// Create duplicated data for infinite scrolling
	const scrollData = React.useMemo(() => {
		if (!newlyListedCoins || newlyListedCoins.length === 0) return [];
		// Duplicate the array to create seamless infinite scroll
		return newlyListedCoins;
	}, [newlyListedCoins]);

	const placeholderData = React.useMemo(() => [1, 2, 3, 4], []);

	const handleCoinPress = useCallback((coin: Coin) => {
		// Navigate immediately with the basic coin data
		logger.breadcrumb({
			category: 'navigation',
			message: 'Navigating to CoinDetail from NewCoins (immediate navigation)',
			data: { coinSymbol: coin.symbol, coinMint: coin.address },
		});

		navigation.navigate('CoinDetail', {
			coin: coin
		});

		// Note: Background fetch removed since getCoinByID is not available in new store structure
		// The CoinDetail screen will handle its own data fetching
	}, [navigation]);

	const getItemLayout = useCallback((_data: Coin[] | null, index: number) => ({
		length: CARD_WIDTH,
		offset: CARD_WIDTH * index,
		index,
	}), [CARD_WIDTH]);

	// Placeholder component for loading small horizontal cards
	const renderPlaceholderCard = () => {
		return (
			<View style={styles.placeholderCard}>
				<ShimmerPlaceholder style={styles.placeholderIconShimmer} />
				<View style={styles.placeholderTextContainer}>
					<ShimmerPlaceholder style={styles.placeholderTextShimmerLine1} />
					<ShimmerPlaceholder style={styles.placeholderTextShimmerLine2} />
				</View>
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
					showPriceChange={false}
					size="small"
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
					data={placeholderData}
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
				keyExtractor={(item, index) => `${item.address}-${index}`}
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

export default React.memo(NewCoins);
