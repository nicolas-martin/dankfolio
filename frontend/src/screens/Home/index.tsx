import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, SafeAreaView, FlatList } from 'react-native';
import { TEST_PRIVATE_KEY } from '@env';
import CoinCard from '../../components/Home/CoinCard';
import { Wallet, Coin, NotificationProps } from '../../types/index';
import { useNavigation } from '@react-navigation/native';
import { WalletBalanceResponse } from '../../services/api';
import { styles } from './home_styles';
import {
	NotificationState,
	fetchAvailableCoins,
	fetchWalletBalance,
	handleImportWallet,
	handleCoinPress
} from './home_scripts';
import { HomeScreenNavigationProp } from './home_types';

const Notification: React.FC<NotificationProps> = ({ visible, type, message, onDismiss }) => {
	if (!visible) return null;

	const bgColor =
		type === 'success'
			? '#4CAF50'
			: type === 'error'
				? '#F44336'
				: type === 'warning'
					? '#FF9800'
					: '#2196F3';

	return (
		<TouchableOpacity style={[styles.notification, { backgroundColor: bgColor }]} onPress={onDismiss}>
			<Text style={styles.notificationText}>{message}</Text>
		</TouchableOpacity>
	);
};

const HomeScreen = () => {
	const navigation = useNavigation<HomeScreenNavigationProp>();
	const [coins, setCoins] = useState<Coin[]>([]);
	const [loading, setLoading] = useState(true);
	const [wallet, setWallet] = useState<Wallet | null>(null);
	const [solCoin, setSolCoin] = useState<Coin | null>(null);
	const [walletBalance, setWalletBalance] = useState<WalletBalanceResponse | null>(null);
	const [notification, setNotification] = useState<NotificationState>({
		visible: false,
		type: 'info',
		message: '',
	});

	const showNotification = useCallback((type: NotificationProps['type'], message: string): void => {
		setNotification({ visible: true, type, message });
		setTimeout(() => setNotification({ visible: false, type: 'info', message: '' }), 3000);
	}, []);

	const fetchWalletBalanceCallback = useCallback(async (address: string) => {
		await fetchWalletBalance(address, setWalletBalance, showNotification);
	}, [showNotification]);

	const handleImportWalletCallback = useCallback(async (privateKey: string) => {
		try {
			await handleImportWallet(privateKey, setWallet, fetchWalletBalanceCallback);
			showNotification('success', 'Wallet imported successfully');
		} catch (error) {
			showNotification('error', 'Failed to import wallet');
		}
	}, [fetchWalletBalanceCallback, showNotification]);

	const initializeData = useCallback(async (): Promise<void> => {
		try {
			setLoading(true);
			await fetchAvailableCoins(setLoading, setSolCoin, setCoins, showNotification);

			if (process.env.NODE_ENV === 'development' && TEST_PRIVATE_KEY) {
				console.log('🧪 Development mode detected, auto-importing test wallet');
				await handleImportWalletCallback(TEST_PRIVATE_KEY);
			}
		} catch (err) {
			console.error('Error initializing data:', err);
			showNotification('error', 'Failed to load initial data');
		} finally {
			setLoading(false);
		}
	}, [handleImportWalletCallback, showNotification]);

	useEffect(() => {
		initializeData();
	}, [initializeData]);

	const handleCoinPressCallback = useCallback((coin: Coin) => {
		handleCoinPress(coin, solCoin, walletBalance, navigation.navigate);
	}, [solCoin, walletBalance, navigation]);

	const onRefresh = useCallback((): void => {
		fetchAvailableCoins(setLoading, setSolCoin, setCoins, showNotification);
	}, [showNotification]);

	if (loading) {
		return (
			<SafeAreaView style={styles.loadingContainer}>
				<ActivityIndicator size="large" color="#6A5ACD" />
				<Text style={styles.loadingText}>Loading wallet...</Text>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.container}>
			<Notification
				visible={notification.visible}
				type={notification.type}
				message={notification.message}
				onDismiss={() => setNotification({ visible: false, type: 'info', message: '' })}
			/>

			<View style={styles.header}>
				<Text style={styles.title}>🚀 DankFolio</Text>
				<Text style={styles.subtitle}>Trade memes securely</Text>
			</View>

			{wallet ? (
				<View style={styles.content}>
					<View style={styles.coinsSection}>
						<View style={styles.sectionHeader}>
							<Text style={styles.sectionTitle}>Available Coins</Text>
							<TouchableOpacity onPress={onRefresh} style={styles.refreshCoinsButton}>
								<Text style={styles.refreshCoinsText}>🔄</Text>
							</TouchableOpacity>
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
						<TouchableOpacity
							style={styles.profileButton}
							onPress={() => {
								if (!wallet?.address) {
									showNotification('error', 'No wallet connected');
									return;
								}

								if (!walletBalance) {
									showNotification('error', 'Wallet balance not loaded');
									return;
								}

								navigation.navigate('Profile', {
									walletAddress: wallet.address,
									walletBalance: walletBalance,
									solCoin: solCoin
								});
							}}
						>
							<Text style={styles.profileButtonText}>View Profile</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.profileButton, { marginLeft: 10, backgroundColor: '#FF69B4' }]}
							onPress={() => navigation.navigate('ChartTest')}
						>
							<Text style={styles.profileButtonText}>📊 Test Chart</Text>
						</TouchableOpacity>
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
