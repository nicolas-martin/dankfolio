import { useCallback, useEffect, useState } from 'react';
import { View, SafeAreaView, FlatList, RefreshControl, ScrollView } from 'react-native';
import { useTheme, Text, Icon } from 'react-native-paper';
import { LoadingAnimation } from '@components/Common/Animations';
import CoinCard from '@components/Home/CoinCard';
import NewCoins from '@components/Home/NewCoins/NewCoins';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { handleCoinPress } from './home_scripts';
import { HomeScreenNavigationProp } from './home_types';
import { usePortfolioStore } from '@store/portfolio';
import { useCoinStore } from '@store/coins';
import { useToast } from '@components/Common/Toast';
import { createStyles } from './home_styles';
import { Coin } from '@/types';
import { OTAUpdater } from '@components/OTAupdate';
import { logger } from '@/utils/logger';

const HomeScreen = () => {
	const navigation = useNavigation<HomeScreenNavigationProp>();
	const { wallet, fetchPortfolioBalance } = usePortfolioStore();

	// Use separate selectors to avoid creating new objects on every render
	const availableCoins = useCoinStore(state => state.availableCoins);
	const fetchAvailableCoins = useCoinStore(state => state.fetchAvailableCoins);
	const fetchNewCoins = useCoinStore(state => state.fetchNewCoins);
	const isLoadingTrending = useCoinStore(state => state.isLoading);

	const { showToast } = useToast();
	const theme = useTheme();
	const styles = createStyles(theme);
	const [isRefreshing, setIsRefreshing] = useState(false);

	useEffect(() => {
		logger.breadcrumb({ category: 'navigation', message: 'Viewed HomeScreen' });
	}, []);

	// Shared logic for fetching trending coins and portfolio
	const fetchTrendingAndPortfolio = useCallback(async () => {
		logger.log('[HomeScreen] Fetching trending and portfolio...');

		// Fetch trending coins and portfolio balance in parallel
		const trendingAndPortfolioPromise = Promise.all([
			fetchAvailableCoins(true), // For trending coins
			wallet ? fetchPortfolioBalance(wallet.address) : Promise.resolve(),
		]);

		await trendingAndPortfolioPromise; // Wait for trending and portfolio to complete

		logger.log('[HomeScreen] 🏠 Completed home screen data fetch.');
	}, [wallet, fetchAvailableCoins, fetchPortfolioBalance]);

	// Separate function for fetching new coins
	const fetchNewCoinsData = useCallback(async () => {
		logger.log('[HomeScreen] Fetching new coins (cache will handle timing)...');

		try {
			await fetchNewCoins(); // Cache will determine if fetch is needed or use cached data
			logger.log('[HomeScreen] ✅ New coins fetch completed (may have used cache).');
		} catch (error) {
			logger.error('[HomeScreen] ❌ Error fetching new coins:', error);
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

			showToast({
				type: 'success',
				message: 'Coins refreshed successfully!',
				duration: 3000
			});
		} catch (error) {
			logger.error('[HomeScreen] ❌ Error during manual refresh:', error);
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
				<NewCoins />

				<View style={styles.sectionHeader}>
					<Text style={styles.sectionTitle}>Trending Coins</Text>
				</View>

				{isLoadingTrending && !hasTrendingCoins && (
					<View style={styles.loadingContainer}>
						<LoadingAnimation size={80} />
						<Text style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}>Loading trending coins...</Text>
					</View>
				)}

				{!isLoadingTrending && !hasTrendingCoins && !isRefreshing && ( // Added !isRefreshing
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
						renderItem={({ item }) => (
							<View style={styles.coinCardContainerStyle}>
								<CoinCard coin={item} onPress={() => handlePressCoinCard(item)} />
							</View>
						)}
						ListFooterComponent={<OTAUpdater />}
						scrollEnabled={false}
					/>
				)}
			</ScrollView>
		);
	};

	return (
		<SafeAreaView style={styles.container} testID="home-screen">
			{wallet ? renderCoinsList() : renderNoWalletState()}
		</SafeAreaView>
	);
};

export default HomeScreen;
