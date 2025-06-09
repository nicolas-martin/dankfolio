import { useCallback, useEffect, useState } from 'react';
import { View, SafeAreaView, FlatList, RefreshControl, ScrollView } from 'react-native';
import { useTheme, Text, Icon } from 'react-native-paper';
import { LoadingAnimation } from '@components/Common/Animations';
import ShimmerPlaceholder from '@components/Common/ShimmerPlaceholder';
import { fetchPriceHistory } from '@/screens/CoinDetail/coindetail_scripts';
import CoinCard from '@components/Home/CoinCard';
import NewCoins from '@components/Home/NewCoins/NewCoins';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { handleCoinPress } from './home_scripts';
import { HomeScreenNavigationProp } from './home_types';
import { usePortfolioStore } from '@store/portfolio';
import { useCoinStore } from '@store/coins';
import { useToast } from '@components/Common/Toast';
import { createStyles } from './home_styles';
import { Coin, PriceData } from '@/types';
import { logger } from '@/utils/logger';
import { useThemeStore } from '@/store/theme';
import { env } from '@/utils/env';
import { PRICE_HISTORY_FETCH_DELAY_MS } from '@/utils/constants';

const HomeScreen = () => {
	const navigation = useNavigation<HomeScreenNavigationProp>();
	const { wallet, fetchPortfolioBalance } = usePortfolioStore();
	const { themeType } = useThemeStore(); // Get theme type from the theme store

	// Coin and loading states
	const availableCoins = useCoinStore(state => state.availableCoins);
	const fetchAvailableCoins = useCoinStore(state => state.fetchAvailableCoins);
	const fetchNewCoins = useCoinStore(state => state.fetchNewCoins);
	const isLoadingTrending = useCoinStore(state => state.isLoading);

	// Price history states
	const [priceHistories, setPriceHistories] = useState<Record<string, PriceData[]>>({});
	const [isLoadingPriceHistories, setIsLoadingPriceHistories] = useState<Record<string, boolean>>({});

	const { showToast } = useToast();
	const theme = useTheme();
	const styles = createStyles(theme);
	const [isRefreshing, setIsRefreshing] = useState(false);

	useEffect(() => {
		logger.breadcrumb({ category: 'navigation', message: 'Viewed HomeScreen' });
	}, []);

	// Placeholder components for loading states
	const renderPlaceholderCoinCard = () => (
		<View style={[styles.coinCardContainerStyle, { marginBottom: 12 }]}>
			<View style={{
				backgroundColor: theme.colors.surface,
				borderRadius: 12,
				padding: 16,
				flexDirection: 'row',
				alignItems: 'center',
				elevation: 2,
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 1 },
				shadowOpacity: 0.1,
				shadowRadius: 2,
			}}>
				{/* Left section - Icon and name */}
				<View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
					<ShimmerPlaceholder
						width={36}
						height={36}
						borderRadius={18}
						style={{ marginRight: 12 }}
					/>
					<View style={{ flex: 1 }}>
						<ShimmerPlaceholder
							width="60%"
							height={16}
							borderRadius={4}
							style={{ marginBottom: 4 }}
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
					style={{ marginHorizontal: 12 }}
				/>

				{/* Right section - Price and change */}
				<View style={{ alignItems: 'flex-end' }}>
					<ShimmerPlaceholder
						width={60}
						height={16}
						borderRadius={4}
						style={{ marginBottom: 4 }}
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
		<View style={{ marginBottom: 24 }}>
			<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 16 }}>
				<ShimmerPlaceholder
					width={120}
					height={20}
					borderRadius={4}
				/>
			</View>
			<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
				{[1, 2, 3, 4].map((index) => (
					<View key={index} style={{
						width: 140,
						height: 120,
						backgroundColor: theme.colors.surface,
						borderRadius: 12,
						marginRight: 8,
						padding: 12,
						elevation: 2,
						shadowColor: '#000',
						shadowOffset: { width: 0, height: 1 },
						shadowOpacity: 0.1,
						shadowRadius: 2,
					}}>
						<ShimmerPlaceholder
							width={48}
							height={48}
							borderRadius={24}
							style={{ alignSelf: 'center', marginBottom: 8 }}
						/>
						<ShimmerPlaceholder
							width="70%"
							height={14}
							borderRadius={4}
							style={{ marginBottom: 4, alignSelf: 'center' }}
						/>
						<ShimmerPlaceholder
							width="50%"
							height={12}
							borderRadius={4}
							style={{ marginBottom: 4, alignSelf: 'center' }}
						/>
						<ShimmerPlaceholder
							width="40%"
							height={12}
							borderRadius={4}
							style={{ alignSelf: 'center' }}
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
			logger.info('[HomeScreen] 🐌🐌🐌🐌🐌🐌🐌🐌🐌🐌🐌 Using SEQUENTIAL price history fetching');
			const processCoinsSequentially = async () => {
				for (const coin of topCoins) {
					if (!coin || !coin.mintAddress) {
						continue;
					}
					setIsLoadingPriceHistories(prev => ({ ...prev, [coin.mintAddress!]: true }));
					try {
						const result = await fetchPriceHistory(coin, fourHourTimeframeKey);
						if (result.data !== null) {
							setPriceHistories(prev => ({ ...prev, [coin.mintAddress!]: result.data! }));
						} else {
							setPriceHistories(prev => ({ ...prev, [coin.mintAddress!]: [] }));
						}
						if (result.error) {
							logger.error(`[HomeScreen] Error fetching price history for ${coin.symbol} (${coin.mintAddress}):`, result.error);
						}
					} catch (error: unknown) {
						if (error instanceof Error) {
							logger.error(`[HomeScreen] Unexpected error calling fetchPriceHistory for ${coin.symbol} (${coin.mintAddress}):`, error.message);
						} else {
							logger.error(`[HomeScreen] Unexpected error calling fetchPriceHistory for ${coin.symbol} (${coin.mintAddress}):`, error);
						}
					} finally {
						setIsLoadingPriceHistories(prev => ({ ...prev, [coin.mintAddress!]: false }));
					}
					await new Promise(resolve => setTimeout(resolve, PRICE_HISTORY_FETCH_DELAY_MS));
				}
			};
			processCoinsSequentially().catch((error: unknown) => {
				if (error instanceof Error) {
					logger.error('[HomeScreen] Error in processCoinsSequentially:', error.message);
				} else {
					logger.error('[HomeScreen] Unknown error in processCoinsSequentially:', error);
				}
			});
		} else { // Parallel fetching
			logger.info('[HomeScreen] 🚀🚀 🚀 🚀 🚀 🚀  Using PARALLEL price history fetching', { coinCount: topCoins.length });
			topCoins.forEach(coin => {
				if (!coin || !coin.mintAddress) {
					return;
				}
				const startTime = Date.now();
				logger.info(`[HomeScreen] 🚀 Starting parallel fetch for ${coin.symbol} (${coin.mintAddress})`);
				setIsLoadingPriceHistories(prev => ({ ...prev, [coin.mintAddress!]: true }));
				fetchPriceHistory(coin, fourHourTimeframeKey)
					.then(result => {
						const duration = Date.now() - startTime;
						logger.info(`[HomeScreen] ✅ Completed parallel fetch for ${coin.symbol} in ${duration}ms`);
						if (result.data !== null) {
							setPriceHistories(prev => ({ ...prev, [coin.mintAddress!]: result.data! }));
						} else {
							setPriceHistories(prev => ({ ...prev, [coin.mintAddress!]: [] }));
						}
						if (result.error) {
							logger.error(`[HomeScreen] Error fetching price history for ${coin.symbol} (${coin.mintAddress}):`, result.error);
						}
					})
					.catch((error: unknown) => {
						if (error instanceof Error) {
							logger.error(`[HomeScreen] Unexpected error calling fetchPriceHistory for ${coin.symbol} (${coin.mintAddress}):`, error.message);
						} else {
							logger.error(`[HomeScreen] Unexpected error calling fetchPriceHistory for ${coin.symbol} (${coin.mintAddress}):`, error);
						}
					})
					.finally(() => {
						setIsLoadingPriceHistories(prev => ({ ...prev, [coin.mintAddress!]: false }));
					});
			});
		}
	}, [availableCoins]);

	// Shared logic for fetching trending coins and portfolio
	const fetchTrendingAndPortfolio = useCallback(async () => {
		logger.log('[HomeScreen] Fetching trending and portfolio...');

		// Fetch trending coins and portfolio balance in parallel
		const trendingAndPortfolioPromise = Promise.all([
			fetchAvailableCoins(true), // For trending coins
			wallet ? fetchPortfolioBalance(wallet.address) : Promise.resolve(),
		]);

		await trendingAndPortfolioPromise; // Wait for trending and portfolio to complete

		logger.log('[HomeScreen] � Completed home screen data fetch.');
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
			logger.log('[HomeScreen] � Manual refresh triggered - forcing new coins refresh');
			await Promise.all([
				fetchAvailableCoins(true), // For trending coins
				fetchNewCoins(10, true), // Force refresh new coins (bypasses cache)
				wallet ? fetchPortfolioBalance(wallet.address) : Promise.resolve(),
			]);

			showToast({
				type: 'success',
				message: 'Coins refreshed successfully!',
				duration: 3000
			});
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
		<FlatList
			data={[]}
			renderItem={() => null}
			ListEmptyComponent={() => (
				<View style={styles.noWalletContainer}>
					<View style={styles.noWalletCard}>
						<View style={styles.noWalletIcon}>
							<Icon source="wallet" size={48} color={theme.colors.primary} />
						</View>
						<Text style={styles.noWalletTitle}>Connect Your Wallet</Text>
						<Text style={styles.noWalletText}>
							Connect your Solana wallet to start trading meme coins and view your portfolio.
						</Text>
					</View>
				</View>
			)}
			refreshControl={
				<RefreshControl
					refreshing={isRefreshing}
					onRefresh={onRefresh}
					colors={[theme.colors.primary]}
					tintColor={theme.colors.primary}
				/>
			}
		/>
	);

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
						colors={[theme.colors.primary]}
						tintColor={theme.colors.primary}
					/>
				}
			>
				{/* Show placeholder for NewCoins section when initially loading */}
				{isFirstTimeLoading ? renderPlaceholderNewCoinsSection() : <NewCoins />}

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
								<Text style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}>Loading trending coins...</Text>
							</View>
						)}

						{!isLoadingTrending && !hasTrendingCoins && !isRefreshing && (
							<View style={styles.emptyStateContainer}>
								<Icon source="chart-line" size={36} color={theme.colors.onSurfaceVariant} />
								<Text style={styles.emptyStateTitle}>No Trending Coins</Text>
								<Text style={styles.emptyStateText}>
									There are no trending coins to display right now.
								</Text>
							</View>
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
								getItemLayout={(data, index) => ({
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
					onPress={() => handlePressCoinCard(item)}
					priceHistory={history}
					isPriceHistoryLoading={isLoadingHistory}
				/>
			</View>
		);
	}, [priceHistories, isLoadingPriceHistories, handlePressCoinCard, styles.coinCardContainerStyle]);

	return (
		<SafeAreaView style={styles.container} testID="home-screen">
			{wallet ? renderCoinsList() : renderNoWalletState()}
		</SafeAreaView>
	);
};

export default HomeScreen;
