import { useCallback } from 'react';
import React from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import ShimmerPlaceholder from '@/components/Common/ShimmerPlaceholder';
import HorizontalScrollContainer from '@/components/Common/HorizontalScrollContainer';
import NewListingCard from '@/components/Home/NewListingCard';
import NewListingPlaceholderCard from '@/components/Home/NewListingCard/PlaceholderCard';
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
	const CARD_WIDTH = 140; // Width of NewListingCard
	const CARD_MARGIN = 24; // theme.spacing.lg - increased spacing

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
	}, [navigation]);

	// Render function for NewListingCard
	const renderNewListingCard = useCallback((coin: Coin, index: number) => {
		return (
			<NewListingCard
				coin={coin}
				onPress={handleCoinPress}
				testIdPrefix="new-listing"
			/>
		);
	}, [handleCoinPress]);

	// Render function for placeholder
	const renderPlaceholder = useCallback((index: number) => {
		return <NewListingPlaceholderCard key={`placeholder-${index}`} />;
	}, []);

	// Key extractor for coins
	const keyExtractor = useCallback((coin: Coin, index: number) => {
		return `${coin.address}-${index}`;
	}, []);

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
				{isLoadingNewlyListed && newlyListedCoins.length === 0 ? (
					<ShimmerPlaceholder
						width={120}
						height={20}
						borderRadius={4}
					/>
				) : (
					<Text style={styles.title}>New Listings</Text>
				)}
			</View>
			<HorizontalScrollContainer
				data={newlyListedCoins}
				renderItem={renderNewListingCard}
				cardWidth={CARD_WIDTH}
				cardMargin={CARD_MARGIN}
				isLoading={isLoadingNewlyListed}
				placeholderCount={4}
				renderPlaceholder={renderPlaceholder}
				contentPadding={{
					paddingLeft: styles.theme.spacing.lg,
					paddingRight: styles.theme.spacing.xs,
				}}
				testIdPrefix="new-listings"
				keyExtractor={keyExtractor}
			/>
		</View>
	);
};

export default React.memo(NewCoins);
