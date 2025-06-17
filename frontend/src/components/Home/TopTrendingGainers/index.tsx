import React, { useCallback } from 'react';
import { View, Text, Animated, ListRenderItemInfo } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation';
import ShimmerPlaceholder from '@/components/Common/ShimmerPlaceholder';
import HorizontalTickerCard from '@/components/Home/HorizontalTickerCard';
import { useStyles } from './TopTrendingGainers.styles';
import { Coin } from '@/types';

const CARD_WIDTH = 140;
const CARD_MARGIN_RIGHT = 8;
const SNAP_INTERVAL = CARD_WIDTH + CARD_MARGIN_RIGHT;

const NUM_PLACEHOLDERS = 5;

type TopTrendingGainersNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CoinDetail'>;

// Props interface for the component
interface TopTrendingGainersProps {
	topTrendingGainers: Coin[];
	isLoading: boolean;
}

const TopTrendingGainers: React.FC<TopTrendingGainersProps> = ({
	topTrendingGainers,
	isLoading
}) => {
	const styles = useStyles();
	const navigation = useNavigation<TopTrendingGainersNavigationProp>();

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
					onPress={handleCoinPress}
					testIdPrefix="trending-coin"
					showPriceChange={true}
				/>
			</View>
		),
		[handleCoinPress, styles.cardWrapper]
	);

	const renderEmptyComponent = () => (
		<Text style={styles.emptyText}>No trending gainers in the past 24h.</Text>
	);

	if (isLoading && topTrendingGainers.length === 0) {
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

	if (!isLoading && topTrendingGainers.length === 0) {
		return (
			<View style={styles.container}>
				<View style={styles.titleContainer}>
					<Text style={styles.title}>Top Gainers</Text>
				</View>
				{renderEmptyComponent()}
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<View style={styles.titleContainer}>
				<Text style={styles.title}>Trending Gainers</Text>
			</View>
			<Animated.FlatList
				data={topTrendingGainers}
				renderItem={renderItem}
				keyExtractor={(item) => item.address}
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.listContentContainer}
				snapToInterval={SNAP_INTERVAL}
				snapToAlignment="start"
				decelerationRate="fast"
				initialNumToRender={5}
				maxToRenderPerBatch={5}
				windowSize={10}
				ListEmptyComponent={renderEmptyComponent}
				scrollEventThrottle={16}
			/>
		</View>
	);
};

export default React.memo(TopTrendingGainers);
