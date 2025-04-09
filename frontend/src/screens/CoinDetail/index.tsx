import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, ScrollView, SafeAreaView } from 'react-native';
import { ActivityIndicator, Text, useTheme, Button, ToggleButton } from 'react-native-paper';
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

const CoinDetail: React.FC = () => {
	const navigation = useNavigation<CoinDetailScreenNavigationProp>();
	const route = useRoute<CoinDetailScreenRouteProp>();
	const { coin: initialCoin } = route.params;
	const [selectedTimeframe, setSelectedTimeframe] = useState("15m");
	const { getCoinByID } = useCoinStore();
	const [loading, setLoading] = useState(true);
	const [priceHistory, setPriceHistory] = useState<PriceData[]>([]);
	const [hoverPoint, setHoverPoint] = useState<PricePoint | null>(null);
	const { showToast } = useToast();
	const { tokens } = usePortfolioStore();
	const theme = useTheme();
	const styles = createStyles(theme);

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

		if (lastDataPoint && firstDataPoint && firstValue !== 0) {
			periodChange = ((lastValue - firstValue) / firstValue) * 100;
			valueChange = lastValue - firstValue;
		}

		return {
			currentPrice,
			periodChange,
			valueChange,
		};
	}, [priceHistory, hoverPoint, parseValue]);

	const portfolioToken = useMemo(() => {
		return tokens.find(token => token.id === initialCoin.id);
	}, [tokens, initialCoin.id]);

	if (loading && !initialCoin) {
		return (
			<View style={[styles.container, styles.centered]}>
				<ActivityIndicator size="large" color={theme.colors.primary} />
			</View>
		);
	}

	return (
		<SafeAreaView style={styles.container} testID="coin-detail-screen">
			<View style={styles.content}>
				<ScrollView
					style={styles.scrollView}
					contentContainerStyle={styles.scrollViewContent}
					bounces={false}
				>
					{initialCoin && priceHistory.length >= 2 && (
						<View style={styles.priceDisplayContainer}>
							<PriceDisplay
								price={displayData.currentPrice}
								periodChange={displayData.periodChange}
								valueChange={displayData.valueChange}
								period={selectedTimeframe}
								icon_url={initialCoin.icon_url}
								name={initialCoin.name}
							/>
						</View>
					)}

					<View style={{ marginHorizontal: 16 }}>
						<CoinChart
							data={priceHistory}
							loading={loading}
							activePoint={hoverPoint}
							onHover={handleChartHover}
						/>
					</View>

					<View style={styles.timeframeButtonsContainer}>
						<ToggleButton.Row
							onValueChange={value => value && setSelectedTimeframe(value)}
							value={selectedTimeframe}
						>
							{TIMEFRAMES.map((tf) => (
								<ToggleButton
									key={tf.value}
									icon={() => (
										<Text
											variant="bodyMedium"
											style={[
												styles.timeframeButtonText,
												selectedTimeframe === tf.value && styles.timeframeButtonTextSelected
											]}
										>
											{tf.label}
										</Text>
									)}
									value={tf.value}
								/>
							))}
						</ToggleButton.Row>
					</View>

					{portfolioToken && (
						<View style={styles.holdingsContainer}>
							<Text style={styles.holdingsTitle}>
								Your Holdings
							</Text>
							<View style={styles.holdingsDetails}>
								<View style={styles.holdingsDetailRow}>
									<Text style={styles.holdingsDetailLabel}>Value</Text>
									<Text style={styles.holdingsDetailValue}>
										${portfolioToken.value.toFixed(4)}
									</Text>
								</View>
								<View style={styles.holdingsDetailRow}>
									<Text style={styles.holdingsDetailLabel}>Quantity</Text>
									<Text style={styles.holdingsDetailValue}>
										{portfolioToken.amount.toFixed(4)} {initialCoin?.symbol}
									</Text>
								</View>
							</View>
						</View>
					)}

					{initialCoin ? (
						<View style={styles.coinInfoContainer}>
							<Text style={styles.holdingsTitle}>
								About {initialCoin.name}
							</Text>
							<CoinInfo
								metadata={{
									name: initialCoin.name,
									description: initialCoin.description,
									website: initialCoin.website,
									twitter: initialCoin.twitter,
									telegram: initialCoin.telegram,
									daily_volume: initialCoin.daily_volume,
									tags: initialCoin.tags || [],
									symbol: initialCoin.symbol
								}}
							/>
						</View>
					) : (
						<View style={styles.loadingContainer}>
							<ActivityIndicator color={theme.colors.primary} />
						</View>
					)}
				</ScrollView>

				{initialCoin && (
					<View style={styles.tradeButtonContainer}>
						<Button
							mode="contained"
							onPress={async () => {
								handleTradeNavigation(
									initialCoin,
									null,
									showToast,
									navigation.navigate
								);
							}}
							testID="trade-button"
						>
							Trade
						</Button>
					</View>
				)}
			</View>
		</SafeAreaView>
	);
};

export default CoinDetail;
