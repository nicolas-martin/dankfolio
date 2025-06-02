import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import Animated, {
	useSharedValue,
	useAnimatedRef,
	useDerivedValue,
	useFrameCallback,
	useAnimatedScrollHandler,
	runOnJS
} from 'react-native-reanimated';
import { scrollTo } from 'react-native-reanimated';
import { LoadingAnimation } from '../../Common/Animations';
import { useCoinStore } from '@store/coins';
import { useToast } from '@components/Common/Toast'; // Import useToast
import HorizontalTickerCard from '@components/Home/HorizontalTickerCard';
import { Coin } from '@/types';
import { logger } from '@/utils/logger';
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
	const animatedRef = useAnimatedRef<Animated.FlatList<Coin>>();

	// Constants for scrolling behavior
	const SCROLL_SPEED = 30; // pixels per second (reduced for smoother movement)
	const CARD_WIDTH = 148; // cardWrapper width (140) + marginRight (8)
	const AUTO_SCROLL_RESUME_DELAY = 2000; // Resume auto-scroll after 2 seconds of no manual interaction

	// Use separate selectors to avoid creating new objects on every render
	const newlyListedCoins = useCoinStore(state => state.newlyListedCoins);
	const isLoadingNewlyListed = useCoinStore(state => state.isLoadingNewlyListed);
	const getCoinByID = useCoinStore(state => state.getCoinByID); // Changed from enrichCoin
	const { showToast } = useToast(); // Get showToast

	// Shared values for smooth scrolling
	const scrollX = useSharedValue(0);
	const isScrolling = useSharedValue(false);
	const isPaused = useSharedValue(false);
	const isManualScrolling = useSharedValue(false);
	const manualScrollTimeout = useRef<NodeJS.Timeout | null>(null);

	// Create duplicated data for infinite scrolling
	const scrollData = useMemo(() => {
		if (!newlyListedCoins || newlyListedCoins.length === 0) return [];
		// Duplicate the array to create seamless infinite scroll
		return [...newlyListedCoins, ...newlyListedCoins];
	}, [newlyListedCoins]);

	// Handle manual scroll timeout
	const resetManualScrollTimeout = useCallback(() => {
		if (manualScrollTimeout.current) {
			clearTimeout(manualScrollTimeout.current);
		}
		manualScrollTimeout.current = setTimeout(() => {
			isManualScrolling.value = false;
			isPaused.value = false;
		}, AUTO_SCROLL_RESUME_DELAY);
	}, []);

	// Animated scroll handler for manual scrolling
	const scrollHandler = useAnimatedScrollHandler({
		onScroll: (event) => {
			if (isManualScrolling.value) {
				scrollX.value = event.contentOffset.x;
			}
		},
		onBeginDrag: () => {
			isManualScrolling.value = true;
			isPaused.value = true;
			runOnJS(resetManualScrollTimeout)();
		},
		onEndDrag: () => {
			runOnJS(resetManualScrollTimeout)();
		},
		onMomentumEnd: () => {
			runOnJS(resetManualScrollTimeout)();
		},
	});

	// Smooth continuous scrolling animation using useFrameCallback
	useFrameCallback((frameInfo) => {
		if (!isScrolling.value || isPaused.value || isManualScrolling.value || !newlyListedCoins || newlyListedCoins.length === 0) {
			return;
		}

		const deltaTime = frameInfo.timeSincePreviousFrame || 16; // fallback to ~60fps
		const pixelsToMove = (SCROLL_SPEED * deltaTime) / 1000; // convert to pixels per frame

		scrollX.value += pixelsToMove;

		// Reset when we've scrolled through one complete set
		const singleSetWidth = newlyListedCoins.length * CARD_WIDTH;
		if (scrollX.value >= singleSetWidth) {
			scrollX.value = 0;
		}
	});

	// Apply scroll position to FlatList (only when not manually scrolling)
	useDerivedValue(() => {
		if (scrollData.length > 0 && !isManualScrolling.value) {
			scrollTo(animatedRef, scrollX.value, 0, false); // Use false for instant positioning
		}
	});

	// Start/stop scrolling when coins are loaded/unloaded
	useEffect(() => {
		if (newlyListedCoins && newlyListedCoins.length > 0) {
			isScrolling.value = true;
		} else {
			isScrolling.value = false;
		}

		return () => {
			// Clean up animation on unmount
			isScrolling.value = false;
			scrollX.value = 0;
			if (manualScrollTimeout.current) {
				clearTimeout(manualScrollTimeout.current);
			}
		};
	}, [newlyListedCoins]);

	// Pause scrolling on touch start, resume on touch end
	const handleTouchStart = useCallback(() => {
		isPaused.value = true;
	}, []);

	const handleTouchEnd = useCallback(() => {
		if (!isManualScrolling.value) {
			isPaused.value = false;
		}
	}, []);

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

	const renderItem = useCallback(({ item, index }: { item: Coin; index: number }) => {
		return (
			<View style={styles.cardWrapper}>
				<HorizontalTickerCard coin={item} onPress={handleCoinPress} />
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
			<Animated.FlatList
				ref={animatedRef}
				data={scrollData}
				renderItem={renderItem}
				keyExtractor={(item, index) => `${item.mintAddress}-${index}`}
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.listContentContainer}
				scrollEnabled={true} // Enable manual scrolling
				onScroll={scrollHandler}
				scrollEventThrottle={16}
				onTouchStart={handleTouchStart}
				onTouchEnd={handleTouchEnd}
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
