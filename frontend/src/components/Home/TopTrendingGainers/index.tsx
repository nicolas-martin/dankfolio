import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation';
import ShimmerPlaceholder from '@/components/Common/ShimmerPlaceholder';
import HorizontalScrollContainer from '@/components/Common/HorizontalScrollContainer';
import TrendingGainerCard from '@/components/Home/TrendingGainerCard';
import TrendingGainerPlaceholderCard from '@/components/Home/TrendingGainerCard/PlaceholderCard';
import { InfoIcon } from '@/components/Common/Icons';
import InfoModal from '@/components/Common/InfoModal';
import { useStyles } from './TopTrendingGainers.styles';
import { Coin } from '@/types';

const CARD_WIDTH = 110;
const CARD_MARGIN = 12;

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
	const [isModalVisible, setModalVisible] = useState(false);

	const handleCoinPress = useCallback(
		(coin: Coin) => {
			navigation.navigate('CoinDetail', {
				coin
			});
		},
		[navigation]
	);

	// Render function for TrendingGainerCard
	const renderTrendingGainerCard = useCallback((coin: Coin, _index: number) => {
		return (
			<TrendingGainerCard
				coin={coin}
				onPress={handleCoinPress}
				testIdPrefix="trending-gainer"
			/>
		);
	}, [handleCoinPress]);

	// Render function for placeholder
	const renderPlaceholder = useCallback((index: number) => {
		return <TrendingGainerPlaceholderCard key={`placeholder-${index}`} />;
	}, []);

	// Key extractor for coins
	const keyExtractor = useCallback((coin: Coin, _index: number) => {
		return `top-gainer-${coin.address}`;
	}, []);

	if (!isLoading && topTrendingGainers.length === 0) {
		return (
			<View style={styles.container}>
				<View style={styles.titleContainer}>
					<Text style={styles.title}>Top Gainers</Text>
				</View>
				<Text style={styles.emptyText}>No trending gainers in the past 24h.</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<View style={styles.cardContainer}>
				<View style={styles.titleContainer}>
					{isLoading && topTrendingGainers.length === 0 ? (
						<ShimmerPlaceholder style={styles.titleShimmer} />
					) : (
						<Text style={styles.title}>24h Volume</Text>
					)}
					<TouchableOpacity onPress={() => setModalVisible(true)} testID="info-icon">
						<InfoIcon size={18} color={styles.infoIcon.color} />
					</TouchableOpacity>
				</View>
				<View style={styles.scrollContent}>
					<InfoModal
						visible={isModalVisible}
						onClose={() => setModalVisible(false)}
						title="24h Volume"
						message="This section shows the coins with the highest trading volume in the last 24 hours."
					/>
					<HorizontalScrollContainer
						data={topTrendingGainers}
						renderItem={renderTrendingGainerCard}
						cardWidth={CARD_WIDTH}
						cardMargin={CARD_MARGIN}
						isLoading={isLoading}
						placeholderCount={5}
						renderPlaceholder={renderPlaceholder}
						contentPadding={{
							paddingLeft: styles.theme.spacing.md,
							paddingRight: styles.theme.spacing.xs,
						}}
						testIdPrefix="trending-gainers"
						keyExtractor={keyExtractor}
					/>
				</View>
			</View>
		</View>
	);
};

export default React.memo(TopTrendingGainers);
