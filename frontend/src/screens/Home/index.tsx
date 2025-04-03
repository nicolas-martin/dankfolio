import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, SafeAreaView, FlatList } from 'react-native';
import { ActivityIndicator, useTheme, Button, IconButton } from 'react-native-paper';
import { TEST_PRIVATE_KEY } from '@env';
import CoinCard from '../../components/Home/CoinCard';
import { Coin } from '../../types/index';
import { useNavigation } from '@react-navigation/native';
import {
	SOL_MINT,
	handleImportWallet,
	handleCoinPress
} from './home_scripts';
import { HomeScreenNavigationProp } from './home_types';
import { usePortfolioStore } from '../../store/portfolio';
import { useCoinStore } from '../../store/coins';
import { useToast } from '../../components/Common/Toast';
import { createStyles } from './home_styles';

const HomeScreen = () => {
	const navigation = useNavigation<HomeScreenNavigationProp>();
	const [loading, setLoading] = useState(true);
	const { wallet, isLoading: isWalletLoading, setWallet, fetchPorfolioBalance: fetchWalletBalance } = usePortfolioStore();
	const { availableCoins: coins, fetchAvailableCoins: fetchCoins } = useCoinStore();
	const { showToast } = useToast();
	const theme = useTheme();
	const styles = createStyles(theme);

	const handleImportWalletCallback = useCallback(async (privateKey: string) => {
		try {
			await handleImportWallet(privateKey, setWallet, fetchWalletBalance);
			showToast({
				type: 'success',
				message: 'Wallet imported successfully'
			});
		} catch (error) {
			showToast({
				type: 'error',
				message: 'Failed to import wallet'
			});
		}
	}, [fetchWalletBalance, setWallet, showToast]);

	const handleCoinPressCallback = useCallback((coin: Coin) => {
		handleCoinPress(coin, navigation.navigate);
	}, [navigation]);

	const onRefresh = useCallback(async () => {
		try {
			setLoading(true);
			await fetchCoins();
			console.log('🔄 Refreshed coins:', {
				count: coins.length,
				symbols: coins.map(c => c.symbol),
				hasSol: coins.some(c => c.id === SOL_MINT)
			});

			if (wallet?.address) {
				await fetchWalletBalance(wallet.address);
			}
		} catch (error) {
			console.error('Error refreshing data:', error);
			showToast({
				type: 'error',
				message: 'Failed to refresh data'
			});
		} finally {
			setLoading(false);
		}
		}, [wallet, fetchWalletBalance, fetchCoins, showToast]); // Removed 'coins' dependency

	const initializeData = useCallback(async (): Promise<void> => {
		try {
			setLoading(true);
			await fetchCoins();
			console.log('🚀 Initialized coins:', {
				count: coins.length,
				symbols: coins.map(c => c.symbol),
				hasSol: coins.some(c => c.id === SOL_MINT)
			});

			if (process.env.NODE_ENV === 'development' && TEST_PRIVATE_KEY) {
				console.log('🧪 Development mode detected, auto-importing test wallet');
				await handleImportWalletCallback(TEST_PRIVATE_KEY);
			}
		} catch (err) {
			console.error('Error initializing data:', err);
			showToast({
				type: 'error',
				message: 'Failed to load initial data'
			});
		} finally {
			setLoading(false);
		}
		}, [handleImportWalletCallback, fetchCoins, showToast]); // Removed 'coins' dependency

	useEffect(() => {
		initializeData();
	}, [initializeData]);

	return (
		<SafeAreaView style={styles.container}>
			<Button
				mode="outlined"
				onPress={() => {
					showToast({
						type: 'success',
						message: 'Test toast notification',
						duration: 3000
					});
				}}
				style={{ margin: 16 }}
			>
				Show Test Toast
			</Button>

			{wallet ? (
				<View style={styles.content}>
					<View style={styles.coinsSection}>
						<View style={styles.sectionHeader}>
							<Text style={styles.sectionTitle}>Available Coins</Text>
							<IconButton
								icon="refresh"
								size={24}
								onPress={onRefresh}
							/>
						</View>
						{coins.length > 0 ? ( // Use the locally renamed variable 'coins'
							<FlatList
								data={coins} // Use the locally renamed variable 'coins'
								keyExtractor={(item) => item.id || item.symbol}
								renderItem={({ item }) => (
									<CoinCard coin={item} onPress={() => handleCoinPressCallback(item)} />
								)}
								contentContainerStyle={styles.coinsList}
								showsVerticalScrollIndicator={false}
							/>
						) : (
							<View style={styles.noCoinsContainer}>
								<Text style={styles.noCoinsText}>No coins available for trading</Text>
							</View>
						)}
					</View>
					<View style={styles.profileContainer}>
						<Button
							mode="contained"
							onPress={() => navigation.navigate('Profile')}
						>
							View Profile
						</Button>
					</View>
				</View>
			) : (
				<View style={styles.content}>
					<View style={styles.centerContainer}>
						<Text style={styles.loadingText}>Loading wallet...</Text>
						<ActivityIndicator size="large" color="#6A5ACD" />
					</View>
				</View>
			)}
		</SafeAreaView>
	);
};

export default HomeScreen;
