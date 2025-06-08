import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, ScrollView, SafeAreaView, ActivityIndicator, RefreshControl } from 'react-native';
import { Text, useTheme, Button, SegmentedButtons, Icon } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useToast } from '@components/Common/Toast';
import CoinChart from '@components/Chart/CoinChart';
import { PricePoint } from '@components/Chart/CoinChart/types';
import CoinInfo from '@components/Chart/CoinInfo';
import PriceDisplay from '@components/CoinDetails/PriceDisplay';
import { PriceData, Coin } from '@/types';
import { CoinDetailScreenNavigationProp, CoinDetailScreenRouteProp } from './coindetail_types';
import {
	TIMEFRAMES,
	fetchPriceHistory,
	handleTradeNavigation,
} from './coindetail_scripts';
import { createStyles } from './coindetail_styles';
import { usePortfolioStore } from '@store/portfolio';
import { logger } from '@/utils/logger';
import { useCoinStore } from '@store/coins';

const CoinDetail: React.FC = () => {
	const navigation = useNavigation<CoinDetailScreenNavigationProp>();
	const route = useRoute<CoinDetailScreenRouteProp>();
	const { coin: initialCoinFromParams, solCoin } = route.params || {};
	const mintAddress = initialCoinFromParams?.mintAddress;
	const prevDisplayCoinRef = React.useRef<Coin | null | undefined>(null);

	const coinFromStore = useCoinStore(state => mintAddress ? state.coinMap[mintAddress] : undefined);
	const displayCoin = coinFromStore || initialCoinFromParams;

	const [selectedTimeframe, setSelectedTimeframe] = useState("4H");
	const [loading, setLoading] = useState(true);
	const [priceHistory, setPriceHistory] = useState<PriceData[]>([]);
	const [hoverPoint, setHoverPoint] = useState<PricePoint | null>(null);
	const { showToast } = useToast();
	const { tokens } = usePortfolioStore();
	const theme = useTheme();
	const styles = createStyles(theme);

	// useEffect for initial logging (can remain as is or be combined if preferred)
	useEffect(() => {
		logger.breadcrumb({
			category: 'navigation',
			message: 'Viewed CoinDetailScreen',
			data: { coinSymbol: displayCoin?.symbol, coinMintAddress: mintAddress },
		});
	}, [displayCoin?.symbol, mintAddress]);

	useEffect(() => {
		if (mintAddress) {
			useCoinStore.getState().getCoinByID(mintAddress);
		}
	}, [mintAddress]);

	const parseValue = (val: string | number | undefined): number => {
		if (val === undefined) return 0;
		const parsed = typeof val === 'string' ? parseFloat(val) : val;
		return isNaN(parsed) ? 0 : parsed;
	};

	const handleChartHover = useCallback((point: PricePoint | null) => {
		setHoverPoint(point);
	}, []);

	useEffect(() => {
		if (!displayCoin || !displayCoin.mintAddress) {
			setPriceHistory([]);
			setLoading(false); // Ensure loading is stopped if no coin
			return;
		}

		const loadData = async () => {
			setLoading(true);
			try {
				// Ensure displayCoin is not null before passing
				const result = await fetchPriceHistory(displayCoin!, selectedTimeframe);
				if (result.data !== null) {
					setPriceHistory(result.data);
				} else if (result.error) {
					logger.error('[CoinDetail] Error fetching price history:', result.error);
					showToast({ type: 'error', message: 'Failed to load chart data.' });
					setPriceHistory([]); // Clear data on error
				}
			} catch (error: unknown) { // Catch errors from fetchPriceHistory if it throws unexpectedly
				if (error instanceof Error) {
					logger.error('[CoinDetail] Unexpected error in fetchPriceHistory call:', error.message);
				} else {
					logger.error('[CoinDetail] Unexpected error in fetchPriceHistory call:', error);
				}
				showToast({ type: 'error', message: 'Failed to load chart data.' });
				setPriceHistory([]);
			} finally {
				setLoading(false);
			}
		};

		loadData();
		// prevDisplayCoinRef.current = displayCoin; // This ref was for isInitialLoad logic, may not be needed in the same way
	}, [selectedTimeframe, displayCoin, showToast]); // Added showToast


	const displayData = useMemo(() => {
		const lastDataPoint = priceHistory.length > 0 ? priceHistory[priceHistory.length - 1] : null;
		const firstDataPoint = priceHistory.length > 0 ? priceHistory[0] : null;

		const lastValue = parseValue(lastDataPoint?.value);
		const firstValue = parseValue(firstDataPoint?.value);
		let currentPrice = hoverPoint?.y ?? lastValue;

		// Ensure currentPrice is never NaN
		if (isNaN(currentPrice)) {
			currentPrice = 0;
		}

		let periodChange = 0;
		let valueChange = 0;

		if (firstDataPoint && firstValue !== 0) {
			periodChange = ((currentPrice - firstValue) / firstValue) * 100;
			valueChange = currentPrice - firstValue;

			// Ensure calculated values are not NaN
			if (isNaN(periodChange)) periodChange = 0;
			if (isNaN(valueChange)) valueChange = 0;
		}

		return {
			currentPrice,
			periodChange,
			valueChange,
		};
	}, [priceHistory, hoverPoint, parseValue]);

	const portfolioToken = useMemo(() => {
		if (!displayCoin?.mintAddress) return null;
		return tokens.find(token => token.mintAddress === displayCoin.mintAddress);
	}, [tokens, displayCoin?.mintAddress]);

	const isLoadingDetails = !displayCoin || (displayCoin && !displayCoin.description);

	// Placeholder components for loading states
	const renderPlaceholderPriceCard = () => (
		<View style={styles.priceCard}>
			<View style={{ padding: 16 }}>
				<View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
					<View style={{ 
						width: 40, 
						height: 40, 
						borderRadius: 20, 
						backgroundColor: theme.colors.surfaceVariant,
						marginRight: 12 
					}} />
					<View style={{ flex: 1 }}>
						<View style={{ 
							height: 20, 
							backgroundColor: theme.colors.surfaceVariant, 
							borderRadius: 4,
							marginBottom: 4,
							width: '60%'
						}} />
						<View style={{ 
							height: 14, 
							backgroundColor: theme.colors.surfaceVariant, 
							borderRadius: 4,
							width: '40%'
						}} />
					</View>
				</View>
				<View style={{ 
					height: 32, 
					backgroundColor: theme.colors.surfaceVariant, 
					borderRadius: 4,
					marginBottom: 8,
					width: '50%'
				}} />
				<View style={{ 
					height: 16, 
					backgroundColor: theme.colors.surfaceVariant, 
					borderRadius: 4,
					width: '30%'
				}} />
			</View>
		</View>
	);

	const renderPlaceholderChartCard = () => (
		<View style={styles.chartContainer}>
			<View style={{ marginHorizontal: 16, padding: 16 }}>
				<View style={{ 
					height: 200, 
					backgroundColor: theme.colors.surfaceVariant, 
					borderRadius: 8,
					justifyContent: 'center',
					alignItems: 'center'
				}}>
					<ActivityIndicator color={theme.colors.primary} size="large" />
					<Text style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}>
						Loading chart data...
					</Text>
				</View>
			</View>
		</View>
	);

	const renderPlaceholderAboutCard = () => (
		<View style={styles.aboutCard}>
			<View style={styles.aboutHeader}>
				<View style={styles.aboutIcon}>
					<Icon source="information-outline" size={16} color={theme.colors.onSecondaryContainer} />
				</View>
				<View style={{ 
					height: 20, 
					backgroundColor: theme.colors.surfaceVariant, 
					borderRadius: 4,
					width: 120,
					marginLeft: 8
				}} />
			</View>
			<View style={{ padding: 16 }}>
				<View style={{ 
					height: 16, 
					backgroundColor: theme.colors.surfaceVariant, 
					borderRadius: 4,
					marginBottom: 8,
					width: '100%'
				}} />
				<View style={{ 
					height: 16, 
					backgroundColor: theme.colors.surfaceVariant, 
					borderRadius: 4,
					marginBottom: 8,
					width: '80%'
				}} />
				<View style={{ 
					height: 16, 
					backgroundColor: theme.colors.surfaceVariant, 
					borderRadius: 4,
					width: '60%'
				}} />
				<View style={{ 
					justifyContent: 'center',
					alignItems: 'center',
					marginTop: 16
				}}>
					<ActivityIndicator color={theme.colors.primary} />
					<Text style={{ marginTop: 8, color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
						Loading details...
					</Text>
				</View>
			</View>
		</View>
	);

	if (!displayCoin && !isLoadingDetails) { // Not loading but still no coin (error or empty state)
		return (
			<SafeAreaView style={styles.container}>
				<View style={[styles.container, styles.centered]}>
					<Text>Coin data not available.</Text>
				</View>
			</SafeAreaView>
		);
	}

	// If code reaches here, displayCoin is available and !isLoadingDetails
	// The existing `loading` state is for the price chart specifically.

	const renderPriceCard = () => {
		if (!displayCoin || priceHistory.length < 2) return null;

		return (
			<View style={styles.priceCard}>
				<PriceDisplay
					price={displayData.currentPrice}
					periodChange={displayData.periodChange}
					valueChange={displayData.valueChange}
					period={TIMEFRAMES.find(tf => tf.value === selectedTimeframe)?.label || selectedTimeframe}
					resolvedIconUrl={displayCoin.resolvedIconUrl}
					name={displayCoin.name}
					address={displayCoin.mintAddress} // Use displayCoin.mintAddress
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
						loading={loading} // This is for price history loading
						onHover={handleChartHover}
						period={selectedTimeframe}
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
							data: { timeframe: value, coinSymbol: displayCoin?.symbol },
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
							{portfolioToken.amount.toFixed(4)} {displayCoin?.symbol}
						</Text>
					</View>
				</View>
			</View>
		);
	};

	const renderAboutCard = () => {
		if (!displayCoin) { // Display based on displayCoin
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
					<Text style={styles.aboutTitle}>About {displayCoin.name}</Text>
				</View>
				<CoinInfo
					metadata={{
						name: displayCoin.name,
						description: displayCoin.description,
						website: displayCoin.website,
						twitter: displayCoin.twitter,
						telegram: displayCoin.telegram,
						dailyVolume: displayCoin.dailyVolume,
						tags: displayCoin.tags || [],
						symbol: displayCoin.symbol,
						createdAt: displayCoin.createdAt // Add this line
					}}
				/>
			</View>
		);
	};

	const onRefresh = useCallback(async () => {
		if (mintAddress) {
			// We use the general 'loading' state for RefreshControl indication here.
			// Alternatively, a new state like 'isRefreshing' could be introduced
			// if we want to differentiate Lottie loader from pull-to-refresh loader.
			// For now, existing `loading` state will make the chart loader appear during refresh.
			setLoading(true);
			try {
				await useCoinStore.getState().getCoinByID(mintAddress, true);
				// Price history will refresh via the useEffect dependency on 'displayCoin' changing.
				// If getCoinByID doesn't result in a change to 'displayCoin' object reference,
				// the effect won't re-run. This might be desired if data is identical.
				// However, if a forced chart refresh is needed even if coin data is same,
				// we might need a manual trigger for loadData() here.
			} catch (error: unknown) {
				if (error instanceof Error) {
					logger.error("Error during refresh:", error.message);
				} else {
					logger.error("An unknown error occurred during refresh:", error);
				}
				showToast({ type: 'error', message: 'Failed to refresh data.' });
				// Ensure loading is false if refresh fails before history fetch can
				setLoading(false);
			}
			// setLoading(false) is now primarily handled by the data fetching useEffect's finally block.
			// If the displayCoin data doesn't change after getCoinByID, the effect might not run.
			// To ensure the RefreshControl spinner stops, we might need to explicitly stop it
			// if the effect doesn't run. This can be tricky.
			// A simple approach: if data fetching effect is not re-triggered, stop loading.
			// This timeout is a pragmatic way to ensure it stops if the effect doesn't.
			setTimeout(() => setLoading(false), 1000);


		} else {
			setLoading(false); // Ensure loading stops if there's no mintAddress
		}
	}, [mintAddress, showToast]); // Removed displayCoin from here as its change triggers the other effect.

	return (
		<SafeAreaView style={styles.container} testID="coin-detail-screen">
			<View style={styles.content}>
				<ScrollView
					style={styles.scrollView}
					contentContainerStyle={styles.scrollViewContent}
					bounces={false}
					showsVerticalScrollIndicator={false}
					refreshControl={
						<RefreshControl
							refreshing={loading} // This 'loading' is for the price chart
							onRefresh={onRefresh}
							tintColor={theme.colors.primary}
						/>
					}
				>
					{/* Show placeholders when loading details, otherwise show real content */}
					{isLoadingDetails ? renderPlaceholderPriceCard() : renderPriceCard()}
					{isLoadingDetails ? renderPlaceholderChartCard() : renderChartCard()}
					{!isLoadingDetails && renderTimeframeCard()}
					{!isLoadingDetails && renderHoldingsCard()}
					{isLoadingDetails ? renderPlaceholderAboutCard() : renderAboutCard()}
				</ScrollView>

				{/* Show trade button with placeholder text when loading */}
				<View style={styles.tradeButtonContainer}>
					<Button
						mode="contained"
						onPress={async () => {
							if (displayCoin) {
								await handleTradeNavigation(
									displayCoin,
									null,
									showToast,
									navigation.navigate
								);
							}
						}}
						style={styles.tradeButton}
						testID="trade-button"
						disabled={isLoadingDetails}
					>
						{isLoadingDetails ? 'Loading...' : `Trade ${displayCoin?.symbol || ''}`}
					</Button>
				</View>
			</View>
		</SafeAreaView>
	);
};

export default CoinDetail;
