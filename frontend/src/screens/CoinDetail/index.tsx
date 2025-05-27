import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, ScrollView, SafeAreaView } from 'react-native';
import { ActivityIndicator, Text, useTheme, Button, SegmentedButtons, Icon } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useToast } from '@components/Common/Toast';
import CoinChart from '@components/Chart/CoinChart';
import { PricePoint } from '@components/Chart/CoinChart/types';
import CoinInfo from '@components/Chart/CoinInfo';
import PriceDisplay from '@components/CoinDetails/PriceDisplay';
import { PriceData } from '@/types';
import { CoinDetailScreenNavigationProp, CoinDetailScreenRouteProp } from './coindetail_types';
import {
	TIMEFRAMES,
	fetchPriceHistory,
	handleTradeNavigation,
} from './coindetail_scripts';
import { createStyles } from './coindetail_styles';
import { usePortfolioStore } from '@store/portfolio';
import { useCoinStore } from '@store/coins';
import { logger } from '@/utils/logger';

const CoinDetail: React.FC = () => {
	const navigation = useNavigation<CoinDetailScreenNavigationProp>();
	const route = useRoute<CoinDetailScreenRouteProp>();
	const { coin: initialCoin } = route.params;
	const [selectedTimeframe, setSelectedTimeframe] = useState("1D"); // Default to 1D
	const { getCoinByID } = useCoinStore();
	const [loading, setLoading] = useState(true);
	const [priceHistory, setPriceHistory] = useState<PriceData[]>([]);
	const [hoverPoint, setHoverPoint] = useState<PricePoint | null>(null);
	const { showToast } = useToast();
	const { tokens } = usePortfolioStore();
	const theme = useTheme();
	const styles = createStyles(theme);

	useEffect(() => {
		logger.breadcrumb({
			category: 'navigation',
			message: 'Viewed CoinDetailScreen',
			data: { coinSymbol: initialCoin?.symbol, coinMintAddress: initialCoin?.mintAddress },
		});
	}, [initialCoin]);

	const parseValue = (val: string | number | undefined): number => {
		if (val === undefined) return 0;
		return typeof val === 'string' ? parseFloat(val) : val;
	};

	const handleChartHover = useCallback((point: PricePoint | null) => {
		setHoverPoint(point);
	}, []);

	useEffect(() => {
		if (!initialCoin) return;

		// Only pass true for isInitialLoad on first mount
		const isInitialLoad = !priceHistory.length;
		fetchPriceHistory(selectedTimeframe, setLoading, setPriceHistory, initialCoin, isInitialLoad);
	}, [selectedTimeframe, initialCoin]);

	const displayData = useMemo(() => {
		const lastDataPoint = priceHistory.length > 0 ? priceHistory[priceHistory.length - 1] : null;
		const firstDataPoint = priceHistory.length > 0 ? priceHistory[0] : null;

		const lastValue = parseValue(lastDataPoint?.value);
		const firstValue = parseValue(firstDataPoint?.value);
		const currentPrice = hoverPoint?.y ?? lastValue;

		let periodChange = 0;
		let valueChange = 0;

		if (firstDataPoint && firstValue !== 0) {
			periodChange = ((currentPrice - firstValue) / firstValue) * 100;
			valueChange = currentPrice - firstValue;
		}

		return {
			currentPrice,
			periodChange,
			valueChange,
		};
	}, [priceHistory, hoverPoint, parseValue]);

	const portfolioToken = useMemo(() => {
		return tokens.find(token => token.mintAddress === initialCoin.mintAddress);
	}, [tokens, initialCoin.mintAddress]);

	if (loading && !initialCoin) {
		return (
			<View style={[styles.container, styles.centered]}>
				<ActivityIndicator size="large" color={theme.colors.primary} />
			</View>
		);
	}

	const renderPriceCard = () => {
		if (!initialCoin || priceHistory.length < 2) return null;

		return (
			<View style={styles.priceCard}>
				<PriceDisplay
					price={displayData.currentPrice}
					periodChange={displayData.periodChange}
					valueChange={displayData.valueChange}
					period={TIMEFRAMES.find(tf => tf.value === selectedTimeframe)?.label || selectedTimeframe}
					iconUrl={initialCoin.iconUrl}
					name={initialCoin.name}
					address={initialCoin.mintAddress}
					hoveredPoint={hoverPoint}
				/>
			</View>
		);
	};

	const renderChartCard = () => {
		return (
			<View style={styles.chartContainer}>
				<View style={{ marginHorizontal: 16 }}>
					<CoinChart
						data={priceHistory}
						loading={loading}
						onHover={handleChartHover}
					/>
				</View>
			</View>
		);
	};

	const renderTimeframeCard = () => {
		return (
			<View style={styles.timeframeCard}>
				<SegmentedButtons
					value={selectedTimeframe}
					onValueChange={value => {
						logger.breadcrumb({
							category: 'ui',
							message: 'Selected timeframe on CoinDetailScreen',
							data: { timeframe: value, coinSymbol: initialCoin?.symbol },
						});
						setSelectedTimeframe(value);
					}}
					buttons={TIMEFRAMES.map(tf => ({
						value: tf.value,
						label: tf.label
					}))}
					density="small"
				/>
			</View>
		);
	};

	const renderHoldingsCard = () => {
		if (!portfolioToken) return null;

		return (
			<View style={styles.holdingsCard}>
				<View style={styles.holdingsHeader}>
					<View style={styles.holdingsIcon}>
						<Icon source="wallet" size={16} color={theme.colors.onPrimaryContainer} />
					</View>
					<Text style={styles.holdingsTitle}>Your Holdings</Text>
				</View>
				<View style={styles.holdingsContent}>
					<View style={styles.holdingsRow}>
						<Text style={styles.holdingsLabel}>Portfolio Value</Text>
						<Text style={styles.holdingsValue}>
							${portfolioToken.value.toFixed(4)}
						</Text>
					</View>
					<View style={styles.holdingsRow}>
						<Text style={styles.holdingsLabel}>Token Amount</Text>
						<Text style={styles.holdingsValue}>
							{portfolioToken.amount.toFixed(4)} {initialCoin?.symbol}
						</Text>
					</View>
				</View>
			</View>
		);
	};

	const renderAboutCard = () => {
		if (!initialCoin) {
			return (
				<View style={styles.aboutCard}>
					<View style={styles.loadingContainer}>
						<ActivityIndicator color={theme.colors.primary} />
					</View>
				</View>
			);
		}

		return (
			<View style={styles.aboutCard}>
				<View style={styles.aboutHeader}>
					<View style={styles.aboutIcon}>
						<Icon source="information-outline" size={16} color={theme.colors.onSecondaryContainer} />
					</View>
					<Text style={styles.aboutTitle}>About {initialCoin.name}</Text>
				</View>
				<CoinInfo
					metadata={{
						name: initialCoin.name,
						description: initialCoin.description,
						website: initialCoin.website,
						twitter: initialCoin.twitter,
						telegram: initialCoin.telegram,
						dailyVolume: initialCoin.dailyVolume,
						tags: initialCoin.tags || [],
						symbol: initialCoin.symbol
					}}
				/>
			</View>
		);
	};

	return (
		<SafeAreaView style={styles.container} testID="coin-detail-screen">
			<View style={styles.content}>
				<ScrollView
					style={styles.scrollView}
					contentContainerStyle={styles.scrollViewContent}
					bounces={false}
					showsVerticalScrollIndicator={false}
				>
					{renderPriceCard()}
					{renderChartCard()}
					{renderTimeframeCard()}
					{renderHoldingsCard()}
					{renderAboutCard()}
				</ScrollView>

				{initialCoin && (
					<View style={styles.tradeButtonContainer}>
						<Button
							mode="contained"
							onPress={async () => {
								await handleTradeNavigation(
									initialCoin,
									null,
									showToast,
									navigation.navigate
								);
							}}
							style={styles.tradeButton}
							testID="trade-button"
						>
							Trade {initialCoin.symbol}
						</Button>
					</View>
				)}
			</View>
		</SafeAreaView>
	);
};

export default CoinDetail;
