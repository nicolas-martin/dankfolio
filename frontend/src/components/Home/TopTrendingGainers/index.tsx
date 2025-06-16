import React, { useCallback } from 'react';
import { View, Text, Animated, ListRenderItemInfo, TouchableOpacity, ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation';
import ShimmerPlaceholder from '@/components/Common/ShimmerPlaceholder';
import CachedImage from '@/components/Common/CachedImage';
import { TrendIcon, getTrendColor } from '@/components/Common/Icons';
import { formatPercentage } from '@/utils/numberFormat';
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

// Simple trending card component
const TrendingCard: React.FC<{
	coin: Coin;
	onPress: (coin: Coin) => void;
	style?: ViewStyle;
}> = React.memo(({ coin, onPress, style }) => {
	const styles = useStyles();

	const handlePress = useCallback(() => {
		onPress(coin);
	}, [coin, onPress]);

	// Use change24h from the local Coin type
	const changeValue = coin.change24h;

	// Determine change color
	const getChangeColor = (value: number | undefined) => {
		if (value === undefined) return '#666666';
		if (value > 0) return '#2E7D32';
		if (value < 0) return '#D32F2F';
		return '#666666';
	};

	return (
		<TouchableOpacity
			style={[styles.trendingCard, style]}
			onPress={handlePress}
			testID={`trending-coin-card-${coin.symbol.toLowerCase()}`}
		>
			{/* Icon */}
			{coin.resolvedIconUrl && (
				<CachedImage
					uri={coin.resolvedIconUrl}
					size={24}
					testID={`trending-coin-icon-${coin.symbol.toLowerCase()}`}
				/>
			)}

			{/* Symbol - flex to take available space */}
			<Text
				style={styles.trendingSymbol}
				numberOfLines={1}
				testID={`trending-coin-symbol-${coin.symbol.toLowerCase()}`}
			>
				{coin.symbol}
			</Text>

			{/* Change with icon - fixed width to prevent layout shifts */}
			{changeValue !== undefined && (
				<View style={styles.changeContainer}>
					{/* Smart Trend Icon */}
					<TrendIcon
						value={changeValue}
						size={12}
					/>

					{/* Percentage Text */}
					<Text
						style={[
							styles.trendingChange,
							{ color: getTrendColor(changeValue) }
						]}
						numberOfLines={1}
						testID={`trending-coin-change-${coin.symbol.toLowerCase()}`}
					>
						{formatPercentage(changeValue, 1, true)}
					</Text>
				</View>
			)}
		</TouchableOpacity>
	);
});

TrendingCard.displayName = 'TrendingCard';

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
				<TrendingCard
					coin={item}
					onPress={handleCoinPress}
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
				keyExtractor={(item) => item.mintAddress}
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
