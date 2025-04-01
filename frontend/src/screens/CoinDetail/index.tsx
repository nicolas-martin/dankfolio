import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useToast } from '../../components/Common/Toast';
import { theme } from '../../utils/theme';
import TopBar from '../../components/Common/TopBar';
import CoinChart from '../../components/Chart/CoinChart';
import CoinInfo from '../../components/Chart/CoinInfo';
import PriceDisplay from '../../components/CoinDetails/PriceDisplay';
import { Coin } from '../../types';
import { CoinDetailScreenNavigationProp, CoinDetailScreenRouteProp } from './coindetail_types';
import {
	TIMEFRAMES,
	fetchCoinData,
	fetchPriceHistory,
	handleTradeNavigation,
} from './coindetail_scripts';
import { styles } from './coindetail_styles';
import { usePortfolioStore } from '../../store/portfolio';

const CoinDetail: React.FC = () => {
	const navigation = useNavigation<CoinDetailScreenNavigationProp>();
	const route = useRoute<CoinDetailScreenRouteProp>();
	const { coin: initialCoin, solCoin: initialSolCoin } = route.params;
	const [selectedTimeframe, setSelectedTimeframe] = useState("15m");
	const [solCoin] = useState<Coin | null>(initialSolCoin || null);
	const [loading, setLoading] = useState(true);
	const [priceHistory, setPriceHistory] = useState<{ x: Date; y: number }[]>([]);
	const [coin, setCoin] = useState<Coin | null>(null);
	const [metadataLoading, setMetadataLoading] = useState(true);
	const [hoverPoint, setHoverPoint] = useState<{ x: Date; y: number } | null>(null);
	const { showToast } = useToast();
	const { wallet, walletBalance } = usePortfolioStore();

	useEffect(() => {
		fetchCoinData(initialCoin, setMetadataLoading, setCoin);
	}, [initialCoin]);

	useEffect(() => {
		if (!coin) return;
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
				{/* Header with Price Display */}
				{coin && priceHistory.length >= 2 && (
					<View style={styles.header}>
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
					</View>
				)}

				{/* Chart Section */}
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

				{/* Your Holdings Section */}
				{wallet && walletBalance && (
					<View style={styles.balanceSection}>
						<Text style={styles.balanceTitle}>Your Holdings</Text>
						<View style={styles.balanceDetails}>
							<View style={styles.balanceRow}>
								<Text style={styles.balanceLabel}>Value</Text>
								<Text style={styles.balanceValue}>
									${(walletBalance.sol_balance * (priceHistory[priceHistory.length - 1]?.y || 0)).toFixed(2)}
								</Text>
							</View>
							<View style={styles.balanceRow}>
								<Text style={styles.balanceLabel}>Quantity</Text>
								<Text style={styles.balanceValue}>{walletBalance.sol_balance.toFixed(4)} {coin?.symbol}</Text>
							</View>
						</View>
					</View>
				)}

				{/* Coin Information */}
				{!metadataLoading && coin ? (
					<View style={styles.statsContainer}>
						<Text style={styles.sectionTitle}>About {coin.name}</Text>
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

			{/* Trade Button */}
			{coin && (
				<View style={styles.bottomButtonContainer}>
					<TouchableOpacity
						style={styles.bottomBuyButton}
						onPress={() => handleTradeNavigation(
							coin,
							solCoin,
							showToast,
							navigation.navigate
						)}
					>
						<Text style={styles.bottomBuyButtonText}>Trade {coin.name}</Text>
					</TouchableOpacity>
				</View>
			)}
		</SafeAreaView>
	);
};

export default CoinDetail;
