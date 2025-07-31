import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, ScrollView, SafeAreaView, ActivityIndicator, RefreshControl } from 'react-native';
import { Text, Icon, SegmentedButtons } from 'react-native-paper'; // Button removed
import { useRoute, useNavigation } from '@react-navigation/native';
import { useToast } from '@components/Common/Toast';
import ShimmerPlaceholder from '@components/Common/ShimmerPlaceholder';
import CoinChart from '@components/Chart/CoinChart';
import { PricePoint } from '@components/Chart/CoinChart/types';
import CoinInfo from '@components/Chart/CoinInfo';
import PriceDisplay from '@components/CoinDetails/PriceDisplay';
import MarketStats from '@components/CoinDetails/MarketStats';
import { PriceData, Coin } from '@/types';
import { CoinDetailScreenNavigationProp, CoinDetailScreenRouteProp } from './coindetail_types';
import { handleTradeNavigation } from './coindetail_scripts'; // TIMEFRAMES removed from here
import { TIMEFRAMES } from '@/utils/constants'; // Import TIMEFRAMES from constants
import { useStyles } from './coindetail_styles';
import { usePortfolioStore } from '@store/portfolio';
import { usePriceHistory } from '@/hooks/usePriceHistory';
import { logger } from '@/utils/logger';
import { useCoinStore } from '@store/coins';
import { grpcApi } from '@/services/grpcApi';
import InfoState from '@/components/Common/InfoState'; // Import InfoState
import ScreenActionButton from '@components/Common/ScreenActionButton'; // Import the new button

const CoinDetail: React.FC = () => {
	const navigation = useNavigation<CoinDetailScreenNavigationProp>();
	const route = useRoute<CoinDetailScreenRouteProp>();
	const { coin: initialCoinFromParams } = route.params;
	const mintAddress = initialCoinFromParams.address;
	const [displayCoin, setDisplayCoin] = useState<Coin | null>(initialCoinFromParams);

	useEffect(() => {
		const loadCoin = async () => {
			const coins = await useCoinStore.getState().getCoinsByIDs([mintAddress]);
			setDisplayCoin(coins[0] || initialCoinFromParams);
		};
		loadCoin();
	}, [mintAddress, initialCoinFromParams]);

	const [selectedTimeframe, setSelectedTimeframe] = useState("4H");
	// const [loading, setLoading] = useState(true); // Replaced by hook's isLoading
	// const [isTimeframeLoading, setIsTimeframeLoading] = useState(false); // Replaced by hook's isLoading
	// const [priceHistory, setPriceHistory] = useState<PriceData[]>([]); // Replaced by hook's priceHistory
	const [hoverPoint, setHoverPoint] = useState<PricePoint | null>(null);
	const [isManualRefreshing, setIsManualRefreshing] = useState(false);
	const { showToast } = useToast();
	const { tokens } = usePortfolioStore();
	const styles = useStyles();

	// useEffect for initial logging (can remain as is or be combined if preferred)
	useEffect(() => {
		logger.breadcrumb({
			category: 'navigation',
			message: 'Viewed CoinDetailScreen',
			data: { coinSymbol: initialCoinFromParams.symbol, coinMintAddress: mintAddress },
		});
	}, [initialCoinFromParams.symbol, mintAddress]);

	const parseValue = useCallback((val: string | number | undefined): number => { // Wrapped in useCallback
		if (val === undefined) return 0;
		const parsed = typeof val === 'string' ? parseFloat(val) : val;
		return isNaN(parsed) ? 0 : parsed;
	}, []);

	const handleChartHover = useCallback((point: PricePoint | null) => {
		setHoverPoint(point);
	}, []);

	// usePriceHistory hook will now directly use grpcApi.getPriceHistory
	// The hook expects (coinId: string, timeframe: string) => Promise<PriceHistoryPoint[]>
	// grpcApi.getPriceHistory is (address: string, type: string, timeStr: string, addressType: string)
	// We need a small adapter here if the hook isn't changed, or change the hook's expected signature.
	// For now, let's create an adapter for the API call.

	const adaptedFetchPriceHistory = useCallback(async (coinId: string, timeframe: string): Promise<PriceData[]> => {
		// grpcApi.getPriceHistory already returns the correct format with unixTime and value
		const currentTime = new Date().toISOString();
		const response = await grpcApi.getPriceHistory(coinId, timeframe, currentTime, "token");
		// grpcApi already transforms the data to the correct format, just return it
		return response.data?.items || [];
	}, []);


	const {
		priceHistory,
		isLoading: isPriceHistoryLoading,
		error: priceHistoryError,
		fetchHistory
	} = usePriceHistory(
		mintAddress,
		selectedTimeframe,
		adaptedFetchPriceHistory
	);

	// Effect to show toast on error
	useEffect(() => {
		if (priceHistoryError) {
			showToast({ type: 'error', message: priceHistoryError.message || 'Failed to load chart data.' });
		}
	}, [priceHistoryError, showToast]);

	// Effect to re-fetch when selectedTimeframe or displayCoin (for address) changes
	useEffect(() => {
		if (displayCoin?.address) {
			fetchHistory(displayCoin.address, selectedTimeframe);
		}
	}, [selectedTimeframe, displayCoin?.address, fetchHistory]);


	const displayData = useMemo(() => {
		const currentPriceHistory = priceHistory || []; // Use priceHistory from hook
		const lastDataPoint = currentPriceHistory.length > 0 ? currentPriceHistory[currentPriceHistory.length - 1] : null;
		const firstDataPoint = currentPriceHistory.length > 0 ? currentPriceHistory[0] : null;

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
		if (!displayCoin?.address) return null;
		return tokens.find(token => token.mintAddress === displayCoin.address);
	}, [tokens, displayCoin?.address]);

	const isLoadingDetails = !displayCoin; // Only check if displayCoin exists, not description

	// All hooks must be at the top level - moved from after render functions
	const chartData = useMemo(() => priceHistory || [], [priceHistory]);

	const coinInfoMetadata = useMemo(() => ({
		name: displayCoin?.name || '',
		description: displayCoin?.description || '',
		website: displayCoin?.website || '',
		twitter: displayCoin?.twitter || '',
		telegram: displayCoin?.telegram || '',
		discord: displayCoin?.discord || '',
		tags: displayCoin?.tags || [],
		symbol: displayCoin?.symbol || '',
		createdAt: displayCoin?.createdAt || new Date(),
	}), [displayCoin]);

	const timeframeButtonsRowStyle = useMemo(() => [
		styles.timeframeButtonsRow,
		isPriceHistoryLoading && styles.timeframeButtonsRowLoading
	], [styles.timeframeButtonsRow, styles.timeframeButtonsRowLoading, isPriceHistoryLoading]);

	const timeframeButtonStyle = useMemo(() => ({
		style: styles.timeframeButton
	}), [styles.timeframeButton]);

	const onRefresh = useCallback(async () => {
		if (mintAddress) {
			setIsManualRefreshing(true);
			try {
				await useCoinStore.getState().getCoinsByIDs([mintAddress], true);
				// Also manually refresh price history
				await fetchHistory(mintAddress, selectedTimeframe);
			} catch (error: unknown) {
				if (error instanceof Error) {
					logger.error("Error during refresh:", error.message);
				} else {
					logger.error("An unknown error occurred during refresh:", error);
				}
				showToast({ type: 'error', message: 'Failed to refresh data.' });
			} finally {
				setIsManualRefreshing(false);
			}
		}
	}, [mintAddress, showToast, fetchHistory, selectedTimeframe]);

	const handleTradePress = useCallback(async () => {
		if (displayCoin) {
			await handleTradeNavigation(
				displayCoin,
				navigation.navigate
			);
		}
	}, [displayCoin, navigation]); // Removed showToast from dependencies

	const renderPlaceholderPriceCard = () => (
		<View style={styles.priceCard}>
			<View style={styles.placeholderPadding}>
				<View style={styles.placeholderCard}>
					<ShimmerPlaceholder
						width={40}
						height={40}
						borderRadius={20}
						style={styles.placeholderIconShimmer}
					/>
					<View style={styles.flex1}>
						<ShimmerPlaceholder
							width="60%"
							height={20}
							borderRadius={4}
							style={styles.marginBottomS}
						/>
						<ShimmerPlaceholder
							width="40%"
							height={14}
							borderRadius={4}
						/>
					</View>
				</View>
				<ShimmerPlaceholder
					width="50%"
					height={32}
					borderRadius={4}
					style={styles.marginBottomM}
				/>
				<ShimmerPlaceholder
					width="30%"
					height={16}
					borderRadius={4}
				/>
			</View>
		</View>
	);

	const renderPlaceholderChartCard = () => (
		<View style={styles.chartContainer}>
			<View style={styles.placeholderChartCardContainer}>
				<ShimmerPlaceholder
					width="100%"
					height={200}
					borderRadius={8}
				/>
				<View style={styles.activityIndicatorOverlay}>
					<ActivityIndicator color={styles.colors.primary} size="large" />
					<Text style={styles.loadingChartText}>
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
					<Icon source="information-outline" size={16} color={styles.colors.onSecondaryContainer} />
				</View>
				<ShimmerPlaceholder
					width={120}
					height={20}
					borderRadius={4}
					style={styles.marginLeftS}
				/>
			</View>
			<View style={styles.placeholderPadding}>
				<ShimmerPlaceholder
					width="100%"
					height={16}
					borderRadius={4}
					style={styles.marginBottomM}
				/>
				<ShimmerPlaceholder
					width="80%"
					height={16}
					borderRadius={4}
					style={styles.marginBottomM}
				/>
				<ShimmerPlaceholder
					width="60%"
					height={16}
					borderRadius={4}
					style={styles.marginBottomL}
				/>
				<View style={styles.activityIndicatorContainer}>
					<ActivityIndicator color={styles.colors.primary} />
					<Text style={styles.loadingDetailsText}>
						Loading details...
					</Text>
				</View>
			</View>
		</View>
	);

	if (!displayCoin && !isLoadingDetails) { // This condition means displayCoin is null AND we are not in any loading state for details.
		return (
			<SafeAreaView style={styles.container}>
				<InfoState
					title="Data Unavailable"
					emptyMessage="The requested coin data could not be loaded or does not exist."
					iconName="alert-circle-outline"
				/>
			</SafeAreaView>
		);
	}

	const renderPriceCard = () => {
		if (!displayCoin || priceHistory.length < 2) return null;

		// Use logoURI as the single source of truth for icons
		const iconUrl = displayCoin.logoURI;

		return (
			<View style={styles.priceCard} testID={`coin-detail-price-card-${displayCoin?.symbol?.toLowerCase()}`}>
				<PriceDisplay
					price={displayData.currentPrice}
					periodChange={displayData.periodChange}
					valueChange={displayData.valueChange}
					period={TIMEFRAMES.find(tf => tf.value === selectedTimeframe)?.label || selectedTimeframe}
					logoURI={iconUrl}
					name={displayCoin.name}
					symbol={displayCoin.symbol}
					address={displayCoin.address} // Use displayCoin.address
				/>
			</View>
		);
	};

	const renderChartCard = () => {
		return (
			<View style={styles.chartContainer} testID={`coin-detail-chart-card-${displayCoin?.symbol?.toLowerCase()}`}>
				<View style={styles.chartCardContent}>
					<CoinChart
						data={chartData}
						loading={isPriceHistoryLoading} // Always show loading overlay when fetching
						onHover={handleChartHover}
						period={selectedTimeframe}
					/>
				</View>
			</View>
		);
	};

	const renderTimeframeCard = () => {
		return (
			<View style={styles.timeframeCard} testID="coin-detail-timeframe-card">
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
						testID: `coin-detail-timeframe-button-${tf.value}`,
						label: tf.label,
						...timeframeButtonStyle
					}))}
					density="small"
					style={timeframeButtonsRowStyle}
				/>
			</View>
		);
	};

	const renderMarketStatsCard = () => {
		if (!displayCoin) return null;

		return (
			<View style={styles.marketStatsCard} testID="coin-detail-market-stats-card">
				<MarketStats coin={displayCoin} />
			</View>
		);
	};

	const renderHoldingsCard = () => {
		if (!portfolioToken) return null;

		return (
			<View style={styles.holdingsCard} testID="coin-detail-holdings-card">
				<View style={styles.holdingsHeader}>
					<View style={styles.holdingsIcon}>
						<Icon source="wallet" size={16} color={styles.colors.onPrimaryContainer} />
					</View>
					<Text style={styles.holdingsTitle} testID="coin-detail-holdings-title">Your Holdings</Text>
				</View>
				<View style={styles.holdingsContent}>
					<View style={styles.holdingsRow}>
						<Text style={styles.holdingsLabel} testID="coin-detail-portfolio-value-label">Portfolio Value</Text>
						<Text style={styles.holdingsValue} testID="coin-detail-portfolio-value">
							${portfolioToken.value.toFixed(4)}
						</Text>
					</View>
					<View style={styles.holdingsRow}>
						<Text style={styles.holdingsLabel} testID="coin-detail-token-amount-label">Token Amount</Text>
						<Text style={styles.holdingsValue} testID="coin-detail-token-amount">
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
				<View style={styles.aboutCard} testID="coin-detail-about-card-loading">
					<View style={styles.loadingContainer}>
						<ActivityIndicator color={styles.colors.primary} />
					</View>
				</View>
			);
		}

		return (
			<View style={styles.aboutCard} testID="coin-detail-about-card">
				<View style={styles.aboutHeader}>
					<View style={styles.aboutIcon}>
						<Icon source="information-outline" size={16} color={styles.colors.onSecondaryContainer} />
					</View>
					<Text style={styles.aboutTitle} testID="coin-detail-about-title">About {displayCoin.name}</Text>
				</View>
				<CoinInfo
					metadata={coinInfoMetadata}
				/>
			</View>
		);
	};

	return (
		<SafeAreaView style={styles.container} testID={`coin-detail-screen-${displayCoin?.symbol?.toLowerCase()}`}>
			<View style={styles.content}>
				<ScrollView
					style={styles.scrollView}
					contentContainerStyle={styles.scrollViewContent}
					showsVerticalScrollIndicator={false}
					keyboardShouldPersistTaps="handled"
					refreshControl={
						<RefreshControl
							refreshing={isManualRefreshing} // Only show during manual refresh, not timeframe changes
							onRefresh={onRefresh}
							tintColor={styles.colors.primary}
						/>
					}
				>
					{/* Show placeholders when loading details, otherwise show real content */}
					{isLoadingDetails ? renderPlaceholderPriceCard() : renderPriceCard()}
					{isLoadingDetails ? renderPlaceholderChartCard() : renderChartCard()}
					{!isLoadingDetails && renderTimeframeCard()}
					{!isLoadingDetails && renderMarketStatsCard()}
					{!isLoadingDetails && renderHoldingsCard()}
					{isLoadingDetails ? renderPlaceholderAboutCard() : renderAboutCard()}
				</ScrollView>

				{/* Show trade button with placeholder text when loading */}
				<ScreenActionButton
					text={isLoadingDetails ? 'Loading...' : `Trade ${displayCoin?.symbol || ''}`}
					onPress={handleTradePress}
					disabled={isLoadingDetails}
					testID={`trade-button-${displayCoin?.symbol?.toLowerCase()}`}
				/>
			</View>
		</SafeAreaView>
	);
};

export default CoinDetail;
