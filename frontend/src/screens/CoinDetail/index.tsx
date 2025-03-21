import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useToast } from '../../components/common/Toast';
import { theme } from '../../utils/theme';

import TopBar from '../../components/common/ui/TopBar';
import CoinChart from '../../components/common/chart/CoinChart';
import CoinInfo from '../../components/common/chart/CoinInfo';
import PriceDisplay from '../../components/trade/PriceDisplay';
import { Coin, Wallet } from '../../types/index';
import { CoinDetailScreenNavigationProp, CoinDetailScreenRouteProp } from './types';
import {
	TIMEFRAMES,
	fetchCoinData,
	fetchPriceHistory,
	handleTradeNavigation,
	loadWallet
} from './scripts';
import { styles } from './styles';

const CoinDetailScreen: React.FC = () => {
	const navigation = useNavigation<CoinDetailScreenNavigationProp>();
	const route = useRoute<CoinDetailScreenRouteProp>();
	const { coin: initialCoin, solCoin: initialSolCoin } = route.params;
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
		fetchCoinData(initialCoin, setMetadataLoading, setCoin);
	}, [initialCoin]);

	useEffect(() => {
		if (!coin) return;

		const initWallet = async () => {
			const { wallet: loadedWallet, balance } = await loadWallet(coin.id);
			setWallet(loadedWallet);
			setWalletBalance(balance);
		};

		initWallet();
		fetchPriceHistory(selectedTimeframe, setLoading, setPriceHistory, coin);
	}, [selectedTimeframe, coin]);

	const handleChartHover = (point: { x: Date; y: number } | null) => {
		setHoverPoint(point);
	};

	if (loading && !coin) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color={theme.colors.primary} />
			</View>
		);
	}

	return (
		<SafeAreaView style={styles.safeArea}>
			<TopBar />
			<ScrollView style={styles.scrollView} bounces={false}>
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
									selectedTimeframe === tf.value && styles.timeframeButtonActive
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

				{/* Balance Section */}
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
					<View style={styles.statsContainer}>
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
					</View>
				) : (
					<ActivityIndicator style={styles.metadataLoader} color={theme.colors.primary} />
				)}
			</ScrollView>

			{/* Fixed Buy Button */}
			{coin && (
				<View style={styles.bottomButtonContainer}>
					<TouchableOpacity
						style={styles.bottomBuyButton}
						onPress={() => handleTradeNavigation(
							coin,
							solCoin,
							route.params.walletBalance,
							showToast,
							navigation.navigate
						)}
					>
						<Text style={styles.bottomBuyButtonText}>Buy {coin.name}</Text>
					</TouchableOpacity>
				</View>
			)}
		</SafeAreaView>
	);
};

export default CoinDetailScreen;
