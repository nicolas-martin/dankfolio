import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useToast } from '../../components/common/Toast';

import TopBar from '../../components/common/ui/TopBar';
import CoinChart from '../../components/common/chart/CoinChart';
import CoinInfo from '../../components/common/chart/CoinInfo';
import PriceDisplay from '../../components/trade/PriceDisplay';
import { secureStorage } from '../../services/solana';
import api, { WalletBalanceResponse } from '../../services/api';
import { Coin, Wallet, RootStackParamList } from '../../types/index';
import { theme } from '../../utils/theme';
import { CoinDetailScreenNavigationProp, CoinDetailScreenRouteProp, TimeframeOption } from './types';

const formatNumber = (num: number): string => {
	if (num >= 1000000000) {
		return (num / 1000000000).toFixed(2) + 'B';
	}
	if (num >= 1000000) {
		return (num / 1000000).toFixed(2) + 'M';
	}
	if (num >= 1000) {
		return (num / 1000).toFixed(2) + 'K';
	}
	return num.toFixed(2);
};

const TIMEFRAMES: TimeframeOption[] = [
	{ label: "15m", value: "15m" },
	{ label: "1H", value: "1H" },
	{ label: "4H", value: "4H" },
	{ label: "1D", value: "1D" },
];

const CoinDetailScreen: React.FC = () => {
	const navigation = useNavigation<CoinDetailScreenNavigationProp>();
	const route = useRoute<CoinDetailScreenRouteProp>();
	const { coinId, coin: initialCoin, solCoin: initialSolCoin } = route.params;
	const [selectedTimeframe, setSelectedTimeframe] = useState("15m");
	const [solCoin] = useState<Coin | null>(initialSolCoin || null);
	const [loading, setLoading] = useState(true);
	const [priceHistory, setPriceHistory] = useState<{ x: Date; y: number }[]>([]);
	const [wallet, setWallet] = useState<Wallet | null>(null);
	const [coin, setCoin] = useState<Coin | null>(null);
	const [metadataLoading, setMetadataLoading] = useState(true);
	const [walletBalance, setWalletBalance] = useState<number>(0);
	const [hoverPoint, setHoverPoint] = useState<{ x: Date; y: number } | null>(null);
	const { showToast } = useToast();

	useEffect(() => {
		loadWallet();
		fetchPriceHistory(selectedTimeframe);
	}, [selectedTimeframe, coinId]);

	useEffect(() => {
		const fetchCoinData = async () => {
			if (!initialCoin) return;
			setMetadataLoading(true);

			try {
				// If daily_volume is 0, it means we're coming from profile page
				// and need fresh data
				if (initialCoin.daily_volume === 0) {
					const freshCoinData = await api.getCoinByID(coinId);
					setCoin({ ...initialCoin, ...freshCoinData });
				} else {
					setCoin(initialCoin);
				}
			} catch (error) {
				console.error('❌ Failed to fetch coin details:', error);
				setCoin(initialCoin);
			}

			setMetadataLoading(false);
		};

		fetchCoinData();
	}, [coinId, initialCoin]);

	const loadWallet = async () => {
		try {
			const savedWallet = await secureStorage.getWallet();
			if (savedWallet) {
				setWallet(savedWallet);
				if (savedWallet.tokens) {
					const token = savedWallet.tokens.find(t => t.mint === coinId);
					setWalletBalance(token?.amount || 0);
				} else {
					console.log('⚠️ No tokens in wallet');
					setWalletBalance(0);
				}
			}
		} catch (error) {
			console.error('Error loading wallet:', error);
			setWalletBalance(0);
		}
	};

	const fetchPriceHistory = async (timeframe: string) => {
		try {
			setLoading(true);

			const time_from = Math.floor(Date.now() / 1000);
			const points = 100;
			var durationPerPoint = 900;
			switch (timeframe) {
				case '15m':
					durationPerPoint = 900;
					break;
				case '1H':
					durationPerPoint = 3600;
					break;
				case '4H':
					durationPerPoint = 14400;
					break;
				case '1D':
					durationPerPoint = 86400;
					break;
				case '1W':
					durationPerPoint = 604800;
					break;
				default:
					throw new Error(`Invalid timeframe: ${timeframe}`);
			}

			const time_to = time_from - (points * durationPerPoint);

			const response = await api.getPriceHistory(
				coinId,
				timeframe,
				time_to.toString(),
				time_from.toString(),
				"token"
			);

			if (response?.data?.items) {
				const mapped = response.data.items
					.filter(item => item.value !== null && item.unixTime !== null)
					.map(item => ({
						x: new Date(item.unixTime * 1000),
						y: item.value
					}));
				setPriceHistory(mapped);
			} else {
				setPriceHistory([]);
			}
		} catch (error) {
			console.error("Error fetching price history:", error);
			setPriceHistory([]);
		} finally {
			setLoading(false);
		}
	};

	const handleTradePress = () => {
		if (coin && solCoin) {
			const { walletBalance } = route.params;

			// Prevent trading the same coin
			if (coin.id === solCoin.id) {
				showToast({
					type: 'error',
					message: 'Cannot trade a coin for itself'
				});
				return;
			}

			// Special handling for SOL balance - already in SOL format
			const fromBalance = solCoin.id === 'So11111111111111111111111111111111111111112'
				? (walletBalance?.sol_balance || 0)
				: walletBalance?.tokens.find(token => token.id === solCoin.id)?.balance || 0;

			const toBalance = coin.id === 'So11111111111111111111111111111111111111112'
				? (walletBalance?.sol_balance || 0)
				: walletBalance?.tokens.find(token => token.id === coin.id)?.balance || 0;

			navigation.navigate('Trade', {
				initialFromCoin: {
					...solCoin,
					balance: fromBalance
				},
				initialToCoin: {
					...coin,
					balance: toBalance
				}
			});
		}
	};

	const handleChartHover = (point: { x: Date; y: number } | null) => {
		setHoverPoint(point);
	};

	// Show loading state while initial data is being fetched
	if (loading && !coin) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color="#6A5ACD" />
			</View>
		);
	}

	return (
		<SafeAreaView style={styles.safeArea}>
			<TopBar />
			<ScrollView style={styles.container} bounces={false}>
				{/* Price Display */}
				{coin && priceHistory.length >= 2 && (
					<PriceDisplay
						price={hoverPoint?.y || priceHistory[priceHistory.length - 1]?.y || 0}
						periodChange={
							((priceHistory[priceHistory.length - 1]?.y - priceHistory[0]?.y) /
								priceHistory[0]?.y) * 100
						}
						valueChange={
							priceHistory[priceHistory.length - 1]?.y - priceHistory[0]?.y
						}
						period={selectedTimeframe}
						icon_url={coin.icon_url}
						name={coin.name}
					/>
				)}

				{/* Chart */}
				<View style={styles.chartContainer}>
					<CoinChart
						data={priceHistory}
						loading={loading}
						activePoint={hoverPoint}
						onHover={handleChartHover}
					/>

					{/* Timeframe buttons */}
					<View style={styles.timeframeRow}>
						{TIMEFRAMES.map((tf) => (
							<TouchableOpacity
								key={tf.value}
								style={[
									styles.timeframeButton,
									selectedTimeframe === tf.value && styles.timeframeButtonActive,
									{ elevation: 5 }
								]}
								onPress={() => setSelectedTimeframe(tf.value)}
							>
								<Text
									style={[
										styles.timeframeLabel,
										selectedTimeframe === tf.value && styles.timeframeLabelActive
									]}
								>
									{tf.label}
								</Text>
							</TouchableOpacity>
						))}
					</View>
				</View>

				{/* Balance Section - Only show if wallet has balance */}
				{wallet && walletBalance > 0 && (
					<View style={styles.balanceSection}>
						<Text style={styles.balanceTitle}>Your balance</Text>
						<View style={styles.balanceDetails}>
							<View style={styles.balanceRow}>
								<Text style={styles.balanceLabel}>Value</Text>
								<Text style={styles.balanceValue}>
									${(walletBalance * (priceHistory[priceHistory.length - 1]?.y || 0)).toFixed(2)}
								</Text>
							</View>
							<View style={styles.balanceRow}>
								<Text style={styles.balanceLabel}>Quantity</Text>
								<Text style={styles.balanceValue}>{walletBalance}</Text>
							</View>
						</View>
					</View>
				)}

				{/* Coin Info */}
				{!metadataLoading && coin ? (
					<CoinInfo
						metadata={{
							name: coin.name,
							description: coin.description,
							website: coin.website,
							twitter: coin.twitter,
							telegram: coin.telegram,
							daily_volume: coin.daily_volume,
							decimals: coin.decimals,
							tags: coin.tags || [],
							symbol: coin.symbol
						}}
					/>
				) : (
					<ActivityIndicator style={styles.metadataLoader} />
				)}
			</ScrollView>

			{/* Fixed Buy Button at Bottom */}
			{coin && (
				<View style={styles.bottomButtonContainer}>
					<TouchableOpacity
						style={styles.bottomBuyButton}
						onPress={handleTradePress}
					>
						<Text style={styles.bottomBuyButtonText}>Buy {coin.name}</Text>
					</TouchableOpacity>
				</View>
			)}
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: '#191B1F',
	},
	container: {
		flex: 1,
		backgroundColor: '#191B1F',
		marginBottom: 80, // Add space for the fixed button
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#191B1F',
	},
	chartContainer: {
		height: Platform.select({
			web: 400,
			ios: 300,
			android: 300,
			default: 250
		}),
		marginVertical: 16,
		paddingHorizontal: 0,
		backgroundColor: theme.colors.topBar,
		overflow: 'visible',
		position: 'relative',
		marginBottom: Platform.OS !== 'web' ? 60 : 16, // Add extra space for timeframe buttons on mobile
	},
	timeframeRow: {
		flexDirection: "row",
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: 16,
		gap: 12,
		backgroundColor: 'rgba(25, 27, 31, 0.9)',
		borderRadius: 12,
		padding: 8,
		marginBottom: Platform.select({
			ios: 0,
			android: 0,
			default: 16
		}),
		...Platform.select({
			ios: {
				position: 'absolute',
				bottom: 10,
				left: 16,
				right: 16,
				shadowColor: '#000',
				shadowOffset: {
					width: 0,
					height: 2,
				},
				shadowOpacity: 0.25,
				shadowRadius: 3.84,
				zIndex: 1000,
			},
			android: {
				position: 'absolute',
				bottom: 10,
				left: 16,
				right: 16,
				elevation: 5,
				zIndex: 1000,
			},
			default: {
				marginTop: 32,
			}
		})
	},
	timeframeButton: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 8,
		minWidth: 48,
		alignItems: 'center',
	},
	timeframeButtonActive: {
		backgroundColor: "#FF69B4",
	},
	timeframeLabel: {
		color: "#9F9FD5",
		fontSize: 14,
		fontWeight: "600",
	},
	timeframeLabelActive: {
		color: "#fff",
	},
	balanceSection: {
		padding: 16,
		marginTop: 20,
	},
	balanceTitle: {
		fontSize: 24,
		fontWeight: 'bold',
		color: '#FFFFFF',
		marginBottom: 16,
	},
	balanceDetails: {
		marginBottom: 20,
	},
	balanceRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 8,
	},
	balanceLabel: {
		fontSize: 16,
		color: '#9F9FD5',
	},
	balanceValue: {
		fontSize: 16,
		color: '#FFFFFF',
	},
	metadataLoader: {
		marginTop: 20,
		marginBottom: 20,
	},
	statsContainer: {
		padding: 16,
		marginTop: 20,
	},
	statItem: {
		marginBottom: 16,
	},
	statLabel: {
		fontSize: 16,
		color: '#9F9FD5',
		marginBottom: 4,
	},
	statValue: {
		fontSize: 16,
		color: '#FFFFFF',
	},
	bottomButtonContainer: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		padding: 16,
		backgroundColor: '#191B1F',
		borderTopWidth: 1,
		borderTopColor: '#2C2F36',
	},
	bottomBuyButton: {
		backgroundColor: '#FF69B4',
		paddingVertical: 16,
		borderRadius: 12,
		alignItems: 'center',
		shadowColor: '#FF69B4',
		shadowOffset: {
			width: 0,
			height: 4,
		},
		shadowOpacity: 0.3,
		shadowRadius: 4,
		elevation: 8,
	},
	bottomBuyButtonText: {
		color: '#FFFFFF',
		fontWeight: 'bold',
		fontSize: 18,
	},
});

export default CoinDetailScreen;