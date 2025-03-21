import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, SafeAreaView, FlatList, Image } from 'react-native';
import { getKeypairFromPrivateKey, secureStorage } from '../../services/solana';
import api, { WalletBalanceResponse } from '../../services/api';
import { TEST_PRIVATE_KEY } from '@env';
import CoinCard from '../../components/trade/CoinCard';
import { Wallet, Coin, NotificationProps } from '../../types/index';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/index';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

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

interface NotificationState {
	visible: boolean;
	type: NotificationProps['type'];
	message: string;
}

const SOL_MINT = 'So11111111111111111111111111111111111111112';

const HomeScreen: React.FC = () => {
	const navigation = useNavigation<HomeScreenNavigationProp>();
	const [wallet, setWallet] = useState<Wallet | null>(null);
	const [coins, setCoins] = useState<Coin[]>([]);
	const [solCoin, setSolCoin] = useState<Coin | null>(null);
	const [loading, setLoading] = useState(true);
	const [walletBalance, setWalletBalance] = useState<WalletBalanceResponse | null>(null);
	const [notification, setNotification] = useState<NotificationState>({
		visible: false,
		type: 'info',
		message: '',
	});

	const showNotification = (type: NotificationProps['type'], message: string): void => {
		setNotification({ visible: true, type, message });
		setTimeout(() => setNotification({ visible: false, type: 'info', message: '' }), 3000);
	};

	const fetchAvailableCoins = useCallback(async (): Promise<void> => {
		try {
			setLoading(true);
			const coinsData = await api.getAvailableCoins();
			if (Array.isArray(coinsData) && coinsData.length > 0) {
				// Find and store SOL coin
				const sol = coinsData.find(c => c.id === SOL_MINT);
				if (sol) {
					console.log('💫 Found SOL coin in available coins:', {
						id: sol.id,
						symbol: sol.symbol,
						price: sol.price,
						decimals: sol.decimals,
						daily_volume: sol.daily_volume
					});

					setSolCoin(sol);
				}
				setCoins(coinsData);
			} else {
				console.log('⚠️ No coins received or empty array');
			}
		} catch (err) {
			console.error('❌ Error fetching coins:', err);
			showNotification('error', 'Failed to fetch available coins');
		} finally {
			setLoading(false);
		}
	}, []);

	const fetchWalletBalance = useCallback(async (address: string) => {
		try {
			const balance = await api.getWalletBalance(address);
			setWalletBalance(balance);
		} catch (err) {
			console.error('❌ Error fetching wallet balance:', err);
			showNotification('error', 'Failed to fetch wallet balance');
		}
	}, []);

	const handleImportWallet = async (privateKey: string) => {
		try {
			const keypair = getKeypairFromPrivateKey(privateKey);
			const walletData: Wallet = {
				address: keypair.publicKey.toString(),
				privateKey: privateKey,
				balance: 0
			};
			setWallet(walletData);
			await secureStorage.saveWallet(walletData);
			// Fetch balance immediately after setting wallet
			await fetchWalletBalance(walletData.address);
		} catch (error) {
			console.error('Error importing wallet:', error);
			showNotification('error', 'Failed to import wallet');
		}
	};

	const initializeData = useCallback(async (): Promise<void> => {
		try {
			setLoading(true);
			const savedWallet = await secureStorage.getWallet();
			if (savedWallet && savedWallet.address) {
				setWallet(savedWallet);
				await fetchWalletBalance(savedWallet.address);
			} else if (process.env.NODE_ENV === 'development' && TEST_PRIVATE_KEY) {
				console.log('🧪 Development mode detected, auto-importing test wallet');
				await handleImportWallet(TEST_PRIVATE_KEY);
			} else {
				showNotification('error', 'No wallet available');
			}
			await fetchAvailableCoins();
		} catch (err) {
			console.error('Error initializing data:', err);
			showNotification('error', 'Failed to load initial data');
		} finally {
			setLoading(false);
		}
	}, [fetchAvailableCoins, fetchWalletBalance]);

	useEffect(() => {
		initializeData();
	}, [initializeData]);

	const handleLogout = async (): Promise<void> => {
		try {
			await secureStorage.deleteWallet();
			setWallet(null);
			setCoins([]);
		} catch (err) {
			console.error('Error logging out:', err);
			showNotification('error', 'Failed to log out');
		}
	};

	const handleCoinPress = (coin: Coin) => {
		console.log('🏠 HomeScreen -> CoinDetail with coins:', {
			selectedCoin: {
				id: coin.id,
				name: coin.name,
				symbol: coin.symbol,
				decimals: coin.decimals,
				price: coin.price,
				daily_volume: coin.daily_volume,
				icon_url: coin.icon_url,
				address: coin.id
			},
			solCoin: solCoin ? {
				id: solCoin.id,
				symbol: solCoin.symbol,
				name: solCoin.name,
				decimals: solCoin.decimals,
				price: solCoin.price,
				icon_url: solCoin.icon_url,
				address: solCoin.id
			} : null
		});
		navigation.navigate('CoinDetail', {
			coinId: coin.id,
			coinName: coin.name,
			daily_volume: coin.daily_volume,
			coin: coin,
			solCoin: solCoin, // Pass SOL coin to CoinDetail
			walletBalance: walletBalance // Pass wallet balance to CoinDetail
		});
	};

	const onRefresh = (): void => {
		fetchAvailableCoins();
	};

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
									<CoinCard coin={item} onPress={() => handleCoinPress(item)} />
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
									solCoin: solCoin // Pass SOL coin to Profile
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

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#191B1F',
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#1A1A2E',
	},
	loadingText: {
		color: '#fff',
		marginTop: 10,
	},
	centerContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#1A1A2E',
	},
	errorText: {
		color: '#F44336',
		textAlign: 'center',
		marginHorizontal: 20,
	},
	header: {
		padding: 20,
		alignItems: 'center',
	},
	title: {
		fontSize: 28,
		fontWeight: 'bold',
		color: '#fff',
		marginBottom: 5,
	},
	subtitle: {
		fontSize: 16,
		color: '#888',
	},
	content: {
		flex: 1,
		padding: 20,
	},
	coinsSection: {
		flex: 1,
	},
	sectionHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 15,
	},
	sectionTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		color: '#fff',
	},
	refreshCoinsButton: {
		padding: 5,
	},
	refreshCoinsText: {
		fontSize: 20,
	},
	coinsList: {
		paddingBottom: 20,
	},
	noCoinsContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	noCoinsText: {
		color: '#888',
		fontSize: 16,
	},
	profileContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginTop: 20,
	},
	profileButton: {
		backgroundColor: '#6A5ACD',
		padding: 15,
		borderRadius: 10,
		alignItems: 'center',
		flex: 1,
	},
	profileButtonText: {
		color: '#fff',
		fontWeight: 'bold',
		fontSize: 16,
	},
	notification: {
		position: 'absolute',
		top: 20,
		left: 20,
		right: 20,
		padding: 15,
		borderRadius: 10,
		zIndex: 1000,
	},
	notificationText: {
		color: '#fff',
		textAlign: 'center',
		fontWeight: 'bold',
	}
});

export default HomeScreen;