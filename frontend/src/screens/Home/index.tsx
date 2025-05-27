import React, { useCallback, useEffect, useState } from 'react';
import { View, SafeAreaView, FlatList, RefreshControl } from 'react-native';
import { useTheme, Text, Icon } from 'react-native-paper';
import CoinCard from '@components/Home/CoinCard';
import { useNavigation } from '@react-navigation/native';
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
	const { availableCoins, fetchAvailableCoins } = useCoinStore();
	const { showToast } = useToast();
	const theme = useTheme();
	const styles = createStyles(theme);
	const [isRefreshing, setIsRefreshing] = useState(false);

	useEffect(() => {
		logger.breadcrumb({ category: 'navigation', message: 'Viewed HomeScreen' });
	}, []);

	// Shared logic for fetching trending coins and portfolio
	const fetchTrendingAndPortfolio = useCallback(async () => {
		await fetchAvailableCoins(true);
		if (wallet) {
			await fetchPortfolioBalance(wallet.address);
		}
	}, [fetchAvailableCoins, fetchPortfolioBalance, wallet]);

	// Fetch trending coins and portfolio on mount if not already loaded
	useEffect(() => {
		if (availableCoins.length === 0) {
			fetchTrendingAndPortfolio();
		}
	}, [availableCoins.length, fetchTrendingAndPortfolio]);

	const handleCoinPressCallback = useCallback((coin: Coin) => {
		handleCoinPress(coin, navigation);
	}, [navigation]);

	const onRefresh = useCallback(async () => {
		setIsRefreshing(true);
		try {
			await fetchTrendingAndPortfolio();
			showToast({
				type: 'success',
				message: 'Coins refreshed successfully!',
				duration: 3000
			});
		} catch (error) {
			showToast({
				type: 'error',
				message: 'Failed to refresh coins',
				duration: 3000
			});
		} finally {
			setIsRefreshing(false);
		}
	}, [fetchTrendingAndPortfolio, showToast]);

	const handlePressCoinCard = useCallback((coin: Coin) => {
		logger.breadcrumb({
			category: 'ui',
			message: 'Pressed CoinCard on HomeScreen',
			data: { coinSymbol: coin.symbol, coinMint: coin.mintAddress }
		});
		handleCoinPressCallback(coin);
	}, [handleCoinPressCallback]);



	const renderEmptyState = () => (
		<View style={styles.emptyStateContainer}>
			<View style={styles.emptyStateIcon}>
				<Icon source="chart-line" size={48} color={theme.colors.onSurfaceVariant} />
			</View>
			<Text style={styles.emptyStateTitle}>No Coins Available</Text>
			<Text style={styles.emptyStateText}>
				We couldn't find any coins to display right now. Try refreshing to load the latest trending coins.
			</Text>
		</View>
	);

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

	const renderCoinsList = () => (
		<View style={styles.coinsSection}>
			<View style={styles.sectionHeader}>
				<Text style={styles.sectionTitle}>Trending Coins</Text>
			</View>
			{availableCoins.length > 0 ? (
				<FlatList
					data={availableCoins}
					keyExtractor={(item) => item.mintAddress || item.symbol}
					renderItem={({ item }) => (
						<CoinCard coin={item} onPress={() => handlePressCoinCard(item)} />
					)}
					ListFooterComponent={() => (
						<View >
							<OTAUpdater />
						</View>
					)}
					contentContainerStyle={styles.coinsList}
					showsVerticalScrollIndicator={false}
					refreshControl={
						<RefreshControl
							refreshing={isRefreshing}
							onRefresh={onRefresh}
							colors={[theme.colors.primary]}
							tintColor={theme.colors.primary}
						/>
					}
				/>
			) : (
				renderEmptyState()
			)}
		</View>
	);

	return (
		<SafeAreaView style={styles.container} testID="home-screen">
			{wallet ? renderCoinsList() : renderNoWalletState()}
		</SafeAreaView>
	);
};

export default HomeScreen;
