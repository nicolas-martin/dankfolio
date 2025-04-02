import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, SafeAreaView, FlatList } from 'react-native';
import { ActivityIndicator, useTheme, Button, IconButton } from 'react-native-paper';
import { TEST_PRIVATE_KEY } from '@env';
import CoinCard from '../../components/Home/CoinCard';
import { Coin } from '../../types/index';
import { useNavigation } from '@react-navigation/native';
import {
	fetchAvailableCoins,
	handleImportWallet,
	handleCoinPress
} from './home_scripts';
import { HomeScreenNavigationProp } from './home_types';
import { usePortfolioStore } from '../../store/portfolio';
import { useToast } from '../../components/Common/Toast';
import { createStyles } from './home_styles';

const HomeScreen = () => {
	const navigation = useNavigation<HomeScreenNavigationProp>();
	const [coins, setCoins] = useState<Coin[]>([]);
	const [loading, setLoading] = useState(true);
	const [solCoin, setSolCoin] = useState<Coin | null>(null);
	const { wallet, walletBalance, isLoading: isWalletLoading, setWallet, fetchWalletBalance } = usePortfolioStore();
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
		handleCoinPress(coin, solCoin, walletBalance, navigation.navigate);
	}, [solCoin, walletBalance, navigation]);

	const onRefresh = useCallback(async () => {
		try {
			setLoading(true);
			await fetchAvailableCoins(setLoading, setSolCoin, setCoins);
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
	}, [wallet, fetchWalletBalance]);

	const initializeData = useCallback(async (): Promise<void> => {
		try {
			setLoading(true);
			await fetchAvailableCoins(setLoading, setSolCoin, setCoins);

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
	}, [handleImportWalletCallback, showToast]);

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
						{coins.length > 0 ? (
							<FlatList
								data={coins}
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
							onPress={() => {
								if (!wallet?.address) {
									showToast({
										type: 'error',
										message: 'No wallet connected'
									});
									return;
								}

								if (!walletBalance) {
									showToast({
										type: 'error',
										message: 'Wallet balance not loaded'
									});
									return;
								}

								navigation.navigate('Profile', {
									walletAddress: wallet.address,
									walletBalance: walletBalance,
									solCoin: solCoin
								});
							}}
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
