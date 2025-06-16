import React, { useCallback, useEffect } from 'react';
import { View, Text, Animated, ListRenderItemInfo } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation';
import { useCoinStore } from '@/store/coins';
import HorizontalTickerCard from '@/components/Home/HorizontalTickerCard';
import ShimmerPlaceholder from '@/components/Common/ShimmerPlaceholder';
import { useStyles } from './TopTrendingGainers.styles';
import { Coin } from '@/types';
import { logger } from '@/utils/logger';

const CARD_WIDTH = 140;
const CARD_MARGIN_RIGHT = 8;
const SNAP_INTERVAL = CARD_WIDTH + CARD_MARGIN_RIGHT;

const NUM_PLACEHOLDERS = 5;

type TopTrendingGainersNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CoinDetail'>;

const TopTrendingGainers: React.FC = () => {
	const styles = useStyles();
	const navigation = useNavigation<TopTrendingGainersNavigationProp>();

	const {
		topTrendingGainers,
		isLoadingTopTrendingGainers,
		fetchTopTrendingGainers,
	} = useCoinStore(
		useCallback(
			(state) => ({
				topTrendingGainers: state.topTrendingGainers,
				isLoadingTopTrendingGainers: state.isLoadingTopTrendingGainers,
				fetchTopTrendingGainers: state.fetchTopTrendingGainers,
				lastFetchedTopTrendingGainersAt: state.lastFetchedTopTrendingGainersAt,
			}),
			[]
		)
	);

	useEffect(() => {
		logger.log('TopTrendingGainers mounted, fetching data...');
		// Consider adding logic to refresh data based on lastFetchedTopTrendingGainersAt
		fetchTopTrendingGainers(10, false); // Fetch 10 items, don't force refresh initially
	}, [fetchTopTrendingGainers]);

	const handleCoinPress = useCallback(
		(coin: Coin) => {
			navigation.navigate('CoinDetail', {
				coin
			});
		},
		[navigation]
	);

	const renderPlaceholderCard = useCallback((index: number) => (
		<View key={`placeholder-${index}`} style={styles.placeholderCard}>
			<ShimmerPlaceholder style={styles.placeholderIconShimmer} />
			<ShimmerPlaceholder style={styles.placeholderTextShimmerLine1} />
			<ShimmerPlaceholder style={styles.placeholderTextShimmerLine2} />
		</View>
	), [styles]);

	const renderItem = useCallback(
		({ item }: ListRenderItemInfo<Coin>) => (
			<View style={styles.cardWrapper}>
				<HorizontalTickerCard
					coin={item}
					onPress={() => handleCoinPress(item)}
					containerStyle={styles.trendingCardStyle} // Apply the new style
					testIdPrefix="trending-coin" // Explicitly set testIdPrefix
				/>
			</View>
		),
		[handleCoinPress, styles.cardWrapper, styles.trendingCardStyle]
	);

	const renderEmptyComponent = () => (
		<Text style={styles.emptyText}>No trending gainers in the past 24h.</Text>
	);

	if (isLoadingTopTrendingGainers && topTrendingGainers.length === 0) {
		return (
			<View style={styles.container}>
				<ShimmerPlaceholder style={styles.titleShimmer} />
				<Animated.FlatList
					horizontal
					showsHorizontalScrollIndicator={false}
					data={Array.from({ length: NUM_PLACEHOLDERS })}
					renderItem={({ index }) => renderPlaceholderCard(index)}
					keyExtractor={(_item, index) => `placeholder-key-${index}`}
					contentContainerStyle={styles.listContentContainer}
					scrollEventThrottle={16}
				/>
			</View>
		);
	}

	if (!isLoadingTopTrendingGainers && topTrendingGainers.length === 0) {
		return (
			<View style={styles.container}>
				<View style={styles.titleContainer}>
					<Text style={styles.title}>🚀 Top Trending Gainers</Text>
				</View>
				{renderEmptyComponent()}
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<View style={styles.titleContainer}>
				<Text style={styles.title}>🚀 Top Trending Gainers</Text>
				{/* Potentially add a "View All" button here if needed */}
			</View>
			<Animated.FlatList
				data={topTrendingGainers}
				renderItem={renderItem}
				keyExtractor={(item) => item.mintAddress}
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.listContentContainer}
				snapToInterval={SNAP_INTERVAL}
				snapToAlignment="start"
				decelerationRate="fast" // Recommended for snapToInterval
				initialNumToRender={5} // Adjust based on typical screen size
				maxToRenderPerBatch={5} // Adjust based on typical screen size
				windowSize={10} // Adjust based on performance
				ListEmptyComponent={renderEmptyComponent} // Fallback, though outer conditions should handle it
				scrollEventThrottle={16} // For potential future scroll animations
			/>
		</View>
	);
};

export default React.memo(TopTrendingGainers);
