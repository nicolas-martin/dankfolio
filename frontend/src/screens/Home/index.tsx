import { useCallback, useEffect, useState, useMemo } from 'react';
import { View, SafeAreaView, FlatList, RefreshControl, ScrollView } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { LoadingAnimation } from '@components/Common/Animations';
import ShimmerPlaceholder from '@components/Common/ShimmerPlaceholder';
import CoinCard from '@components/Home/CoinCard';
import InfoState from '@/components/Common/InfoState';
import NewCoins from '@components/Home/NewCoins/NewCoins';
import TopTrendingGainers from 'components/Home/TopTrendingGainers';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
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
import { PRICE_HISTORY_FETCH_DELAY_MS } from '@/utils/constants';
import { debugCacheStatus, testExpoImageCache } from '@/components/Common/CachedImage/scripts';
import { grpcApi } from '@/services/grpcApi';

// Helper function to wrap grpcApi.getPriceHistory
const fetchPriceHistory = async (coin: Coin, timeframeKey: string): Promise<{ data: PriceData[], error: Error | null }> => {
	if (!coin || !coin.mintAddress) {
		return { data: [], error: new Error("Invalid coin or mint address") };
	}
	try {
		// Assuming timeframeKey like "4H" needs to be processed or is directly usable by API
		// grpcApi.getPriceHistory expects (address: string, type: string, timeStr: string, addressType: string)
		// 'type' could be the timeframeKey, 'timeStr' the current time, 'addressType' as "token"
		const currentTime = new Date().toISOString();
		const response = await grpcApi.getPriceHistory(coin.mintAddress, timeframeKey, currentTime, "token");
		// Extract and transform the items array from the response data (same as CoinDetail)
		const items = response.data?.items || [];
		const data = items.map(item => ({
			timestamp: new Date(item.unixTime * 1000).toISOString(), // Convert Unix timestamp to ISO string
			value: item.value
		}));
		return { data, error: null };
	} catch (e: unknown) {
		logger.error(`[HomeScreen] Error in fetchPriceHistory for ${coin.symbol}:`, e);
		return { data: [], error: e instanceof Error ? e : new Error(String(e)) };
	}
};

const HomeScreen = () => {
	const styles = useStyles();
	const navigation = useNavigation<HomeScreenNavigationProp>();
	const { wallet, fetchPortfolioBalance } = usePortfolioStore();
	const { themeType: _themeType } = useThemeStore(); // Prefixed themeType



	const emptyFlatListData = useMemo(() => [], []);

	// Coin and loading states
	const availableCoins = useCoinStore(state => state.availableCoins);
	const fetchAvailableCoins = useCoinStore(state => state.fetchAvailableCoins);
	const fetchNewCoins = useCoinStore(state => state.fetchNewCoins);
	const isLoadingTrending = useCoinStore(state => state.isLoading);

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
		<View style={styles.placeholderCoinCardContainerStyle}>
			<View style={styles.placeholderCoinCardContent}>
				{/* Left section - Icon and name */}
				<View style={styles.placeholderCoinCardInternalStyle}>
					{/* Note: flexDirection and alignItems specific to this combination, kept inline for clarity or could be another specific style */}
					<ShimmerPlaceholder
						width={36}
						height={36}
						borderRadius={18}
						style={styles.placeholderCoinIconShimmer}
					/>
					<View style={styles.flex1}>
						<ShimmerPlaceholder
							width="60%"
							height={16}
							borderRadius={4}
							style={styles.placeholderTextMarginBottomS}
						/>
						<ShimmerPlaceholder
							width="80%"
							height={12}
							borderRadius={4}
						/>
					</View>
				</View>

				{/* Middle section - Sparkline placeholder */}
				<ShimmerPlaceholder
					width={80}
					height={20}
					borderRadius={4}
					style={styles.placeholderSparklineShimmer}
				/>

				{/* Right section - Price and change */}
				<View style={styles.alignFlexEnd}>
					<ShimmerPlaceholder
						width={60}
						height={16}
						borderRadius={4}
						style={styles.placeholderTextMarginBottomS}
					/>
					<ShimmerPlaceholder
						width={40}
						height={12}
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
				{[1, 2, 3, 4].map((index) => (
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
		<View>
			<View style={styles.sectionHeader}>
				<Text style={styles.sectionTitle}>Trending Coins</Text>
			</View>
			{[1, 2, 3, 4, 5].map((index) => (
				<View key={`placeholder-trending-${index}`}>
					{renderPlaceholderCoinCard()}
				</View>
			))}
		</View>
	);

	// Effect to fetch price histories when availableCoins change
	useEffect(() => {
		if (!availableCoins || availableCoins.length === 0) {
			// Clear existing histories if availableCoins becomes empty
			setPriceHistories({});
			setIsLoadingPriceHistories({});
			return;
		}

		const topCoins = availableCoins.slice(0, 10);
		const fourHourTimeframeKey: string = "4H"; // Key used in TIMEFRAME_CONFIG

		// 🔍 DEBUG: Log the decision logic
		const debugInfo = {
			'****************************************': '*********************',
			'env.e2eMockingEnabled': env.e2eMockingEnabled,
			'process.env.E2E_MOCKING_ENABLED': process.env.E2E_MOCKING_ENABLED,
			'isE2EMode': env.e2eMockingEnabled,
			willUseSequential: !env.e2eMockingEnabled && env.appEnv != 'development',
			topCoinsCount: topCoins.length
		};
		console.log('🔍 [HomeScreen] Price history fetch decision:', debugInfo);
		logger.info('[HomeScreen] Price history fetch decision:', debugInfo);

		// we don't want sequential fetching in E2E mode or development
		if (!env.e2eMockingEnabled && env.appEnv != 'development') {
			logger.info('[HomeScreen] 🐌 Using SEQUENTIAL price history fetching');
			// Sequential fetching (existing logic, could also be batched but less critical due to delays)
			const processCoinsSequentially = async () => {
				let newHistories: Record<string, PriceData[]> = {};
				let newLoadingStates: Record<string, boolean> = {};
				for (const coin of topCoins) {
					if (!coin || !coin.mintAddress) continue;
					newLoadingStates[coin.mintAddress] = true;
					setIsLoadingPriceHistories(prev => ({ ...prev, ...newLoadingStates })); // Update loading state immediately for this coin
					try {
						const result = await fetchPriceHistory(coin, fourHourTimeframeKey);
						newHistories[coin.mintAddress] = result.data || [];
						if (result.error) logger.error(`[HomeScreen] Error fetching (seq) ${coin.symbol}:`, result.error);
					} catch (e) {
						logger.error(`[HomeScreen] Exception fetching (seq) ${coin.symbol}:`, e);
						newHistories[coin.mintAddress] = [];
					} finally {
						newLoadingStates[coin.mintAddress] = false;
						// Batching updates within sequential is tricky if we want immediate feedback per coin.
						// For now, individual updates for loading/history in sequential remain.
						setPriceHistories(prev => ({ ...prev, [coin.mintAddress!]: newHistories[coin.mintAddress!] }));
						setIsLoadingPriceHistories(prev => ({ ...prev, [coin.mintAddress!]: false }));
					}
					await new Promise(resolve => setTimeout(resolve, PRICE_HISTORY_FETCH_DELAY_MS));
				}
			};
			processCoinsSequentially().catch(e => logger.error('[HomeScreen] Error in processCoinsSequentially:', e));

		} else { // Parallel fetching with batched state updates
			logger.info('[HomeScreen] 🚀 Using PARALLEL price history fetching', { coinCount: topCoins.length });

			// Set initial loading states for all coins to be fetched
			const initialLoadingStates = topCoins.reduce((acc, coin) => {
				if (coin?.mintAddress) acc[coin.mintAddress] = true;
				return acc;
			}, {} as Record<string, boolean>);
			setIsLoadingPriceHistories(prev => ({ ...prev, ...initialLoadingStates }));

			Promise.allSettled(
				topCoins.map(async (coin): Promise<{ mintAddress: string; data: PriceData[]; error: Error | null; } | null> => {
					if (!coin || !coin.mintAddress) return Promise.resolve(null); // Skip invalid coins
					const result = await fetchPriceHistory(coin, fourHourTimeframeKey);
					return ({
						mintAddress: coin.mintAddress!,
						data: result.data || [],
						error: result.error
					});
				})
			).then(results => {
				const newHistoriesBatch: Record<string, PriceData[]> = {};
				const newLoadingStatesBatch: Record<string, boolean> = {};

				results.forEach(settledResult => {
					if (settledResult.status === 'fulfilled' && settledResult.value) {
						const { mintAddress, data, error } = settledResult.value;
						newHistoriesBatch[mintAddress] = data;
						newLoadingStatesBatch[mintAddress] = false;
						if (error) {
							logger.error(`[HomeScreen] Error fetching (parallel) ${mintAddress}:`, error);
						}
					} else if (settledResult.status === 'rejected') {
						// Handle rejected promises if fetchPriceHistory can throw directly (though it returns {data, error})
						// This path might not be hit if fetchPriceHistory always resolves.
						logger.error(`[HomeScreen] Promise rejected for a coin:`, settledResult.reason);
					}
				});

				setPriceHistories(prev => ({ ...prev, ...newHistoriesBatch }));
				setIsLoadingPriceHistories(prev => ({ ...prev, ...newLoadingStatesBatch }));
			});
		}
	}, [availableCoins]); // Removed showToast from deps as logger is used

	// Shared logic for fetching trending coins and portfolio
	const fetchTrendingAndPortfolio = useCallback(async () => {
		logger.log('[HomeScreen] Fetching trending and portfolio...');

		// Fetch trending coins and portfolio balance in parallel
		const trendingAndPortfolioPromise = Promise.all([
			fetchAvailableCoins(true), // For trending coins
			wallet ? fetchPortfolioBalance(wallet.address) : Promise.resolve(),
		]);

		await trendingAndPortfolioPromise; // Wait for trending and portfolio to complete

		logger.log('[HomeScreen] 🟢 Completed home screen data fetch.');
	}, [wallet, fetchAvailableCoins, fetchPortfolioBalance]);

	// Separate function for fetching new coins
	const fetchNewCoinsData = useCallback(async () => {
		logger.log('[HomeScreen] Fetching new coins (cache will handle timing)...');

		try {
			await fetchNewCoins(); // Cache will determine if fetch is needed or use cached data
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
			await Promise.all([
				fetchAvailableCoins(true), // For trending coins
				fetchNewCoins(10, true), // Force refresh new coins (bypasses cache)
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
	}, [fetchAvailableCoins, fetchNewCoins, fetchPortfolioBalance, wallet, showToast]);

	const handlePressCoinCard = useCallback((coin: Coin) => {
		console.log('[HomeScreen LOG] handlePressCoinCard called for:', coin.symbol, coin.mintAddress);
		logger.breadcrumb({
			category: 'ui',
			message: 'Pressed CoinCard on HomeScreen',
			data: { coinSymbol: coin.symbol, coinMint: coin.mintAddress }
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

	// Debug cache function - moved outside render function to prevent hooks order issues
	const handleDebugCache = useCallback(async () => {
		logger.info('[HomeScreen] 🔧 Starting enhanced cache debug...');

		const sampleImageUrl = 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png';

		// Test expo-image cache configuration
		await testExpoImageCache(sampleImageUrl);

		// Test network caching for a sample image
		await debugCacheStatus(sampleImageUrl);

		showToast({
			type: 'info',
			message: 'Enhanced cache debug completed - check logs',
			duration: 3000
		});
	}, [showToast]);

	const renderCoinsList = () => {
		const hasTrendingCoins = availableCoins.length > 0;

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
				{__DEV__ && (
					<View style={styles.debugCacheButtonStyle}>
						<Button
							mode="outlined"
							onPress={handleDebugCache}
							icon="bug"
							compact
						><Text>
								Debug Cache
							</Text>
						</Button>
					</View>
				)}

				{/* Show placeholder for NewCoins section when initially loading */}
				{isFirstTimeLoading ? renderPlaceholderNewCoinsSection() : <NewCoins />}

				{/* Add TopTrendingGainers after NewCoins */}
				{/* Consider adding a placeholder for TopTrendingGainers if isFirstTimeLoading is true */}
				{!isFirstTimeLoading && <TopTrendingGainers />}

				{/* Show placeholder for trending section when initially loading */}
				{isFirstTimeLoading ? (
					renderPlaceholderTrendingSection()
				) : (
					<>
						<View style={styles.sectionHeader}>
							<Text style={styles.sectionTitle}>Trending Coins</Text>
						</View>

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
							<FlatList
								data={availableCoins}
								keyExtractor={(item) => item.mintAddress || item.symbol}
								renderItem={renderTrendingCoinItem}
								scrollEnabled={false}
								// Performance optimizations to prevent UI blocking
								maxToRenderPerBatch={5}
								updateCellsBatchingPeriod={50}
								initialNumToRender={10}
								windowSize={10}
								getItemLayout={(_, index) => ({
									length: 130, // Adjusted approximate height of each CoinCard with sparkline + margin
									offset: 130 * index, // Adjusted offset
									index,
								})}
								// Optimize re-renders
								keyboardShouldPersistTaps="handled"
							/>
						)}
					</>
				)}
			</ScrollView>
		);
	};

	// Extracted renderItem function for trending coins FlatList
	const renderTrendingCoinItem = useCallback(({ item }: { item: Coin }) => {
		const history = priceHistories[item.mintAddress!];
		const isLoadingHistory = isLoadingPriceHistories[item.mintAddress!];

		return (
			<View style={styles.coinCardContainerStyle}>
				<CoinCard
					coin={item}
					// Pass handlePressCoinCard directly for the onPressCoin prop (or similar name)
					// The actual name of the prop in CoinCard will need to match (e.g., onPressCoin)
					// And CoinCard's internal logic will use this prop and its own coin prop.
					onPressCoin={handlePressCoinCard} // Pass the memoized callback
					priceHistory={history}
					isPriceHistoryLoading={isLoadingHistory}
					testIdPrefix="trending-coin"
				/>
			</View>
		);
		// handlePressCoinCard is already a useCallback.
		// styles.coinCardContainerStyle should be stable due to useStyles memoization.
	}, [priceHistories, isLoadingPriceHistories, handlePressCoinCard, styles.coinCardContainerStyle]);


	return (
		<SafeAreaView style={styles.container} testID="home-screen">
			{wallet ? renderCoinsList() : renderNoWalletState()}
		</SafeAreaView>
	);
};

export default HomeScreen;
