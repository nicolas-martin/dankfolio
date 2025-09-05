import { useCallback, useEffect, useState, useMemo } from 'react';
import { View, SafeAreaView, FlatList, RefreshControl, ScrollView, Dimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { LoadingAnimation } from '@components/Common/Animations';
import ShimmerPlaceholder from '@components/Common/ShimmerPlaceholder';
import TokenListCard from '@components/Home/TokenListCard';
import InfoState from '@/components/Common/InfoState';
import NewCoins from '@components/Home/NewCoins/NewCoins';
import TopTrendingGainers from 'components/Home/TopTrendingGainers';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import ScreenHeader from '@/components/Common/ScreenHeader/ScreenHeader';
import { SearchIcon } from '@components/Common/Icons';
import { handleCoinPress } from './home_scripts';
import { HomeScreenNavigationProp } from './home_types';
import { usePortfolioStore } from '@store/portfolio';
import { useCoinStore } from '@store/coins';
import { useToast } from '@components/Common/Toast';
import { useStyles } from './home_styles';
import { Coin, PriceData } from '@/types';
import { logger } from '@/utils/logger';
import { useThemeStore } from '@/store/theme';
import { env } from '@/utils/env';
import { grpcApi } from '@/services/grpcApi';

const screenWidth = Dimensions.get('window').width;

const fetchPriceHistory = async (coin: Coin, timeframeKey: string): Promise<{ data: PriceData[], error: Error | null }> => {
	if (!coin || !coin.address) {
		return { data: [], error: new Error("Invalid coin or mint address") };
	}
	try {
		const currentTime = new Date().toISOString();
		const response = await grpcApi.getPriceHistory(coin.address, timeframeKey, currentTime, "token");
		const data = response.data?.items || [];
		return { data, error: null };
	} catch (e: unknown) {
		logger.error(`[HomeScreen] Error in fetchPriceHistory for ${coin.symbol}:`, e);
		return { data: [], error: e instanceof Error ? e : new Error(String(e)) };
	}
};

const fetchPriceHistoriesBatched = async (
	coins: Coin[],
	timeframeKey: string
): Promise<{
	results: Record<string, PriceData[]>,
	errors: Record<string, Error>,
	failedAddresses: string[]
}> => {
	const results: Record<string, PriceData[]> = {};
	const errors: Record<string, Error> = {};
	const failedAddresses: string[] = [];

	if (!coins || coins.length === 0) {
		return { results, errors, failedAddresses };
	}

	const validCoins = coins.filter(coin => coin?.address);
	if (validCoins.length === 0) {
		return { results, errors, failedAddresses };
	}

	try {
		const currentTime = new Date().toISOString();
		const batchRequests = validCoins.map(coin => ({
			address: coin.address,
			type: timeframeKey,
			time: currentTime,
			addressType: "token"
		}));

		logger.info(`[HomeScreen] 🚀 Using BATCHED price history fetch for ${validCoins.length} coins`);

		const batchResponse = await grpcApi.getPriceHistoriesByIDs(batchRequests);

		// Process successful results
		Object.entries(batchResponse.results).forEach(([address, result]) => {
			if (result.success && result.data?.items) {
				results[address] = result.data.items;
			} else {
				const errorMessage = result.errorMessage || 'Unknown error in batch response';
				errors[address] = new Error(errorMessage);
				failedAddresses.push(address);
			}
		});

		// Add explicitly failed addresses to our tracking
		batchResponse.failedAddresses.forEach(address => {
			if (!failedAddresses.includes(address)) {
				failedAddresses.push(address);
				errors[address] = new Error('Address failed in batch processing');
			}
		});

		logger.info(`[HomeScreen] ✅ Batch fetch completed: ${Object.keys(results).length} successful, ${failedAddresses.length} failed`);

		return { results, errors, failedAddresses };
	} catch (error: unknown) {
		logger.error('[HomeScreen] ❌ Batch price history fetch failed:', error);

		// On batch failure, add all addresses to failed list so they can be retried individually
		validCoins.forEach(coin => {
			failedAddresses.push(coin.address);
			errors[coin.address] = error instanceof Error ? error : new Error(String(error));
		});

		return { results, errors, failedAddresses };
	}
};

const fetchPriceHistoriesWithFallback = async (
	coins: Coin[],
	timeframeKey: string
): Promise<{
	results: Record<string, PriceData[]>,
	errors: Record<string, Error>
}> => {
	const finalResults: Record<string, PriceData[]> = {};
	const finalErrors: Record<string, Error> = {};

	// First, try the batched approach
	const { results: batchResults, errors: batchErrors, failedAddresses } = await fetchPriceHistoriesBatched(coins, timeframeKey);

	// Add successful batch results
	Object.assign(finalResults, batchResults);

	// If we have failures, fall back to individual calls for those addresses
	if (failedAddresses.length > 0) {
		logger.info(`[HomeScreen] 🔄 Falling back to individual calls for ${failedAddresses.length} failed addresses`);

		const failedCoins = coins.filter(coin => failedAddresses.includes(coin.address));

		const individualResults = await Promise.allSettled(
			failedCoins.map(async (coin): Promise<{ address: string; data: PriceData[]; error: Error | null; }> => {
				const result = await fetchPriceHistory(coin, timeframeKey);
				return {
					address: coin.address,
					data: result.data || [],
					error: result.error
				};
			})
		);

		// Process individual call results
		individualResults.forEach(settledResult => {
			if (settledResult.status === 'fulfilled' && settledResult.value) {
				const { address, data, error } = settledResult.value;
				if (error) {
					finalErrors[address] = error;
				} else {
					finalResults[address] = data;
					// Remove from batch errors since individual call succeeded
					delete finalErrors[address];
				}
			}
		});

		logger.info(`[HomeScreen] 🔄 Individual fallback completed: ${Object.keys(finalResults).length - Object.keys(batchResults).length} recovered`);
	}

	// Add any remaining batch errors that weren't recovered
	Object.entries(batchErrors).forEach(([address, error]) => {
		if (!finalResults[address]) {
			finalErrors[address] = error;
		}
	});

	return { results: finalResults, errors: finalErrors };
};

const HomeScreen = () => {
	const styles = useStyles();
	const navigation = useNavigation<HomeScreenNavigationProp>();
	const { wallet, fetchPortfolioBalance } = usePortfolioStore();
	const { themeType: _themeType } = useThemeStore(); // Prefixed themeType

	const emptyFlatListData = useMemo(() => [], []);
	const placeholderIndices = useMemo(() => [1, 2, 3, 4], []);
	const placeholderTrendingIndices = useMemo(() => [1, 2, 3, 4, 5], []);

	// Coin and loading states - Updated to use new coin store structure
	const trendingCoins = useCoinStore(state => state.trendingCoins);
	const newCoins = useCoinStore(state => state.newCoins);
	const topGainersCoins = useCoinStore(state => state.topGainersCoins);

	const fetchTrendingCoins = useCoinStore(state => state.fetchTrendingCoins);
	const fetchNewCoins = useCoinStore(state => state.fetchNewCoins);
	const fetchTopGainersCoins = useCoinStore(state => state.fetchTopGainersCoins);

	const isLoadingTrending = useCoinStore(state => state.trendingCoinsLoading);
	const isLoadingNewCoins = useCoinStore(state => state.newCoinsLoading);
	const isLoadingTopGainers = useCoinStore(state => state.topGainersCoinsLoading);

	// Price history states
	const [priceHistories, setPriceHistories] = useState<Record<string, PriceData[]>>({});
	const [isLoadingPriceHistories, setIsLoadingPriceHistories] = useState<Record<string, boolean>>({});

	const { showToast } = useToast();
	const [isRefreshing, setIsRefreshing] = useState(false);

	useEffect(() => {
		logger.breadcrumb({ category: 'navigation', message: 'Viewed HomeScreen' });
	}, []);

	// Placeholder components for loading states
	const renderPlaceholderCoinCard = () => (
		<View style={styles.placeholderItemContainer}>
			<View style={styles.placeholderItemContent}>
				{/* Left section - Icon and name */}
				<View style={styles.placeholderLeftSection}>
					<ShimmerPlaceholder
						width={36}
						height={36}
						borderRadius={18}
						style={styles.placeholderCoinIconShimmer}
					/>
					<View style={styles.placeholderNameSection}>
						<ShimmerPlaceholder
							width={60}
							height={17}
							borderRadius={4}
							style={styles.placeholderTextMarginBottomS}
						/>
						<ShimmerPlaceholder
							width={80}
							height={13}
							borderRadius={4}
						/>
					</View>
				</View>

				{/* Middle section - Sparkline placeholder */}
				<View style={styles.placeholderSparklineContainer}>
					<ShimmerPlaceholder
						width={screenWidth * 0.28}
						height={30}
						borderRadius={4}
					/>
				</View>

				{/* Right section - 24h change */}
				<View style={styles.placeholderRightSection}>
					<ShimmerPlaceholder
						width={50}
						height={17}
						borderRadius={4}
					/>
				</View>
			</View>
		</View>
	);

	const renderPlaceholderNewCoinsSection = () => (
		<View style={styles.newCoinsPlaceholderContainer}>
			<View style={styles.newCoinsPlaceholderTitleContainer}>
				<ShimmerPlaceholder
					width={120}
					height={20}
					borderRadius={4}
				/>
			</View>
			<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.newCoinsPlaceholderScrollContent}>
				{placeholderIndices.map((index) => (
					<View key={index} style={styles.newCoinsPlaceholderCard}>
						<ShimmerPlaceholder
							width={48}
							height={48}
							borderRadius={24}
							style={styles.newCoinsPlaceholderIconShimmer}
						/>
						<ShimmerPlaceholder
							width="70%"
							height={14}
							borderRadius={4}
							style={styles.newCoinsPlaceholderText1Shimmer}
						/>
						<ShimmerPlaceholder
							width="50%"
							height={12}
							borderRadius={4}
							style={styles.newCoinsPlaceholderText1Shimmer}
						/>
						<ShimmerPlaceholder
							width="40%"
							height={12}
							borderRadius={4}
							style={styles.newCoinsPlaceholderText2Shimmer}
						/>
					</View>
				))}
			</ScrollView>
		</View>
	);

	const renderPlaceholderTrendingSection = () => (
		<View style={styles.placeholderTrendingContainer}>
			<View style={styles.placeholderTrendingHeader}>
				<Text style={styles.sectionTitle}>Trending Coins</Text>
			</View>
			<View style={styles.placeholderTrendingColumnHeader}>
				<View style={styles.placeholderTrendingLeftSection}>
					<Text style={styles.placeholderColumnHeaderText}>Token</Text>
				</View>
				<View style={styles.placeholderTrendingSparklineSection}>
					<Text style={styles.placeholderColumnHeaderText}>4H Chart</Text>
				</View>
				<View style={styles.placeholderTrendingRightSection}>
					<Text style={styles.placeholderColumnHeaderText}>24h Change</Text>
				</View>
			</View>
			<View style={styles.placeholderTrendingListContainer}>
				{placeholderTrendingIndices.map((index, arrayIndex) => (
					<View key={`placeholder-trending-${index}`}>
						{renderPlaceholderCoinCard()}
						{arrayIndex < placeholderTrendingIndices.length - 1 && (
							<View style={styles.placeholderDivider} />
						)}
					</View>
				))}
			</View>
		</View>
	);

	// Effect to fetch price histories when trendingCoins change
	useEffect(() => {
		if (!trendingCoins || trendingCoins.length === 0) {
			// Clear existing histories if trendingCoins becomes empty
			setPriceHistories({});
			setIsLoadingPriceHistories({});
			return;
		}

		const topCoins = trendingCoins.slice(0, 10);
		const fourHourTimeframeKey: string = "4H"; // Key used in TIMEFRAME_CONFIG

		// 🔍 DEBUG: Log the decision logic
		const debugInfo = {
			'****************************************': '*********************',
			'env.e2eMockingEnabled': env.e2eMockingEnabled,
			'process.env.E2E_MOCKING_ENABLED': process.env.E2E_MOCKING_ENABLED,
			'isE2EMode': env.e2eMockingEnabled,
			topCoinsCount: topCoins.length
		};
		console.log('🔍 [HomeScreen] Price history fetch decision:', debugInfo);
		logger.info('[HomeScreen] Price history fetch decision:', debugInfo);

		// Set initial loading states for all coins to be fetched
		const initialLoadingStates = topCoins.reduce((acc, coin) => {
			if (coin?.address) acc[coin.address] = true;
			return acc;
		}, {} as Record<string, boolean>);
		setIsLoadingPriceHistories(prev => ({ ...prev, ...initialLoadingStates }));

		// Use the new batched approach with fallback
		fetchPriceHistoriesWithFallback(topCoins, fourHourTimeframeKey).then(({ results, errors }) => {
			const newHistoriesBatch: Record<string, PriceData[]> = {};
			const newLoadingStatesBatch: Record<string, boolean> = {};

			// Process successful results
			Object.entries(results).forEach(([address, data]) => {
				newHistoriesBatch[address] = data;
				newLoadingStatesBatch[address] = false;
			});

			// Process failed addresses
			Object.entries(errors).forEach(([address, error]) => {
				newLoadingStatesBatch[address] = false;
				logger.error(`[HomeScreen] Error fetching price history for ${address}:`, error);
			});

			// Make sure all addresses have loading state set to false
			topCoins.forEach(coin => {
				if (coin?.address && !(coin.address in newLoadingStatesBatch)) {
					newLoadingStatesBatch[coin.address] = false;
				}
			});

			setPriceHistories(prev => ({ ...prev, ...newHistoriesBatch }));
			setIsLoadingPriceHistories(prev => ({ ...prev, ...newLoadingStatesBatch }));

			// Log performance summary
			const successCount = Object.keys(results).length;
			const errorCount = Object.keys(errors).length;
			logger.info(`[HomeScreen] 📊 Price history batch completed: ${successCount} successful, ${errorCount} failed out of ${topCoins.length} total`);
		});
	}, [trendingCoins]); // Removed showToast from deps as logger is used

	// Shared logic for fetching trending coins and portfolio
	const fetchTrendingAndPortfolio = useCallback(async () => {
		logger.log('[HomeScreen] Fetching trending and portfolio...');

		// Fetch trending coins, top trending gainers, and portfolio balance in parallel
		const trendingAndPortfolioPromise = Promise.all([
			fetchTrendingCoins(20, 0), // For trending coins - limit 20, offset 0
			fetchTopGainersCoins(10, 0), // For top trending gainers - limit 10, offset 0
			wallet ? fetchPortfolioBalance(wallet.address) : Promise.resolve(),
		]);

		await trendingAndPortfolioPromise; // Wait for trending and portfolio to complete

		logger.log('[HomeScreen] 🟢 Completed home screen data fetch.');
	}, [wallet, fetchTrendingCoins, fetchTopGainersCoins, fetchPortfolioBalance]);

	// Separate function for fetching new coins
	const fetchNewCoinsData = useCallback(async () => {
		logger.log('[HomeScreen] Fetching new coins (cache will handle timing)...');

		try {
			await fetchNewCoins(10, 0); // Cache will determine if fetch is needed or use cached data
			logger.log('[HomeScreen] ✅ New coins fetch completed (may have used cache).');
		} catch (error: unknown) {
			if (error instanceof Error) {
				logger.error('[HomeScreen] ❌ Error fetching new coins:', error.message);
			} else {
				logger.error('[HomeScreen] ❌ Unknown error fetching new coins:', error);
			}
		}
	}, [fetchNewCoins]);

	// Fetch trending coins and portfolio on mount
	useEffect(() => {
		fetchTrendingAndPortfolio();
	}, [fetchTrendingAndPortfolio]);

	// Fetch new coins every time the screen comes into focus
	// This ensures we check the cache and fetch if needed on every navigation to Home
	useFocusEffect(
		useCallback(() => {
			fetchNewCoinsData();
		}, [fetchNewCoinsData])
	);

	const handleCoinPressCallback = useCallback((coin: Coin) => {
		handleCoinPress(coin, navigation);
	}, [navigation]);

	const onRefresh = useCallback(async () => {
		setIsRefreshing(true);
		try {
			// Force refresh new coins on manual refresh
			logger.log('[HomeScreen] 🔄 Manual refresh triggered - forcing new coins refresh');
			// TODO: Make these configurable
			await Promise.all([
				fetchTrendingCoins(10, 0), // For trending coins
				fetchTopGainersCoins(10, 0), // Force refresh top trending gainers
				fetchNewCoins(10, 0), // Force refresh new coins (bypasses cache)
				wallet ? fetchPortfolioBalance(wallet.address) : Promise.resolve(),
			]);

		} catch (error: unknown) {
			if (error instanceof Error) {
				logger.error('[HomeScreen] ❌ Error during manual refresh:', error.message);
			} else {
				logger.error('[HomeScreen] ❌ Unknown error during manual refresh:', error);
			}
			showToast({
				type: 'error',
				message: 'Failed to refresh coins',
				duration: 3000
			});
		} finally {
			setIsRefreshing(false);
		}
	}, [fetchTrendingCoins, fetchTopGainersCoins, fetchNewCoins, fetchPortfolioBalance, wallet, showToast]);

	const handlePressCoinCard = useCallback((coin: Coin) => {
		console.log('[HomeScreen LOG] handlePressCoinCard called for:', coin.symbol, coin.address);
		logger.breadcrumb({
			category: 'ui',
			message: 'Pressed CoinCard on HomeScreen',
			data: { coinSymbol: coin.symbol, coinMint: coin.address }
		});
		handleCoinPressCallback(coin);
	}, [handleCoinPressCallback]);

	const renderNoWalletState = () => (
		// FlatList wrapper might not be necessary if InfoState handles its own layout well.
		// However, keeping for RefreshControl for now.
		<FlatList
			data={emptyFlatListData}
			renderItem={() => null}
			ListEmptyComponent={() => (
				<InfoState
					iconName="wallet-outline" // Changed icon to match previous, or use a new one
					title="Connect Your Wallet"
					emptyMessage="Connect your Solana wallet to start trading meme coins and view your portfolio."
				/>
			)}
			contentContainerStyle={styles.center} // Ensure InfoState is centered
			refreshControl={
				<RefreshControl
					refreshing={isRefreshing}
					onRefresh={onRefresh}
					colors={styles.refreshControlColors}
					tintColor={styles.colors.primary}
				/>
			}
		/>
	);

	const renderCoinsList = () => {
		const hasTrendingCoins = trendingCoins.length > 0;

		// Show shimmer placeholders only during the first load (not during pull-to-refresh)
		// This is true when:
		// - We're loading trending coins AND
		// - We don't have any coins yet AND  
		// - User is NOT doing a pull-to-refresh
		const isFirstTimeLoading = isLoadingTrending && !hasTrendingCoins && !isRefreshing;

		return (
			<ScrollView
				style={styles.coinsSectionScrollView}
				showsVerticalScrollIndicator={false}
				refreshControl={
					<RefreshControl
						refreshing={isRefreshing}
						onRefresh={onRefresh}
						colors={styles.refreshControlColors}
						tintColor={styles.colors.primary}
					/>
				}
			>
				{/* Debug Cache Button - Only show in development */}
				{/*__DEV__ && ()*\}

				{/* Show placeholder for NewCoins section when initially loading */}
				{isFirstTimeLoading ? renderPlaceholderNewCoinsSection() : (
					<NewCoins
						newCoins={newCoins}
						isLoading={isLoadingNewCoins}
					/>
				)}

				{/* Add TopTrendingGainers after NewCoins */}
				{/* Consider adding a placeholder for TopTrendingGainers if isFirstTimeLoading is true */}
				{!isFirstTimeLoading && (
					<TopTrendingGainers
						topTrendingGainers={topGainersCoins}
						isLoading={isLoadingTopGainers}
					/>
				)}

				{/* Show placeholder for trending section when initially loading */}
				{isFirstTimeLoading ? (
					renderPlaceholderTrendingSection()
				) : (
					<>
						{isLoadingTrending && !hasTrendingCoins && !isFirstTimeLoading && (
							<View style={styles.loadingContainer}>
								<LoadingAnimation size={80} />
								<Text style={styles.loadingTrendingText}>Loading trending coins...</Text>
							</View>
						)}

						{!isLoadingTrending && !hasTrendingCoins && !isRefreshing && (
							<InfoState
								iconName="chart-line"
								title="No Trending Coins"
								emptyMessage="There are no trending coins to display right now."
							/>
						)}

						{hasTrendingCoins && (
							<TokenListCard
								title="Trending Coins"
								coins={trendingCoins}
								priceHistories={priceHistories}
								isLoadingPriceHistories={isLoadingPriceHistories}
								onCoinPress={handlePressCoinCard}
								showSparkline={true}
								testIdPrefix="trending-coin"
							/>
						)}
					</>
				)}
			</ScrollView>
		);
	};



	return (
		<SafeAreaView style={styles.container} testID="home-screen">
			<ScreenHeader
				title="Home"
				rightAction={{
					icon: <SearchIcon size={24} color={styles.colors.onSurface} />,
					onPress: () => {
						logger.breadcrumb({ category: 'navigation', message: 'Navigating to Search from Home' });
						navigation.navigate('Search');
					},
					testID: "search-button"
				}}
				showRightAction={true}
			/>
			{wallet ? renderCoinsList() : renderNoWalletState()}
		</SafeAreaView>
	);
};

export default HomeScreen;
