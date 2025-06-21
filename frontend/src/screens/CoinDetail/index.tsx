import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, ScrollView, SafeAreaView, ActivityIndicator, RefreshControl } from 'react-native';
import { Text, Button, Icon, SegmentedButtons } from 'react-native-paper';
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

const CoinDetail: React.FC = () => {
	const navigation = useNavigation<CoinDetailScreenNavigationProp>();
	const route = useRoute<CoinDetailScreenRouteProp>();
	const { coin: initialCoinFromParams } = route.params;
	const mintAddress = initialCoinFromParams.address;
	const [displayCoin, setDisplayCoin] = useState<Coin | null>(initialCoinFromParams);

	useEffect(() => {
		const loadCoin = async () => {
			const coin = await useCoinStore.getState().getCoinByID(mintAddress);
			setDisplayCoin(coin || initialCoinFromParams);
		};
		loadCoin();
	}, [mintAddress, initialCoinFromParams]);

	const [selectedTimeframe, setSelectedTimeframe] = useState(TIMEFRAMES.find(tf => tf.value === "4H")?.value || TIMEFRAMES[0]?.value || "4H"); // Default to 4H or first available
	const [hoverPoint, setHoverPoint] = useState<PricePoint | null>(null);
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


	const allTimeframeValues = useMemo(() => TIMEFRAMES.map(tf => tf.value), []);

	const {
		priceHistoryCollection,
		isLoading: isOverallPriceHistoryLoading, // Renamed for clarity
		errors: priceHistoryErrors, // Renamed for clarity
		fetchHistoryForTimeframes,
		// fetchSingleTimeframeHistory // Available if needed for individual refresh
	} = usePriceHistory(
		mintAddress, // initialCoinId
		allTimeframeValues, // initialTimeframes to fetch all
		adaptedFetchPriceHistory
	);

	// Effect to show toast on error for the selected timeframe
	useEffect(() => {
		const errorForSelectedTimeframe = priceHistoryErrors[selectedTimeframe];
		if (errorForSelectedTimeframe) {
			showToast({ type: 'error', message: errorForSelectedTimeframe.message || `Failed to load chart data for ${selectedTimeframe}.` });
		}
		// Do not show toasts for all errors, only the active one, or a generic one if many fail.
	}, [priceHistoryErrors, selectedTimeframe, showToast]);

	// Effect to fetch all timeframes when coin changes
	useEffect(() => {
		if (displayCoin?.address) {
			logger.info(`[CoinDetail] Display coin changed to ${displayCoin.symbol}, fetching all timeframes.`);
			fetchHistoryForTimeframes(displayCoin.address, allTimeframeValues);
		}
		// This effect should run when displayCoin.address or allTimeframeValues change.
		// fetchHistoryForTimeframes is memoized in the hook.
	}, [displayCoin?.address, allTimeframeValues, fetchHistoryForTimeframes]);

	// Data for the currently selected timeframe to be passed to the chart and other components
	const currentSelectedPriceHistory = useMemo(() => {
		return priceHistoryCollection[selectedTimeframe] || [];
	}, [priceHistoryCollection, selectedTimeframe]);


	const displayData = useMemo(() => {
		const activePriceHistory = currentSelectedPriceHistory; // Use data for selected timeframe
		const lastDataPoint = activePriceHistory.length > 0 ? activePriceHistory[activePriceHistory.length - 1] : null;
		const firstDataPoint = activePriceHistory.length > 0 ? activePriceHistory[0] : null;

		const lastValue = parseValue(lastDataPoint?.value);
		const firstValue = parseValue(firstDataPoint?.value);
		let currentPrice = hoverPoint?.y ?? lastValue;

		// Ensure currentPrice is never NaN
		if (isNaN(currentPrice)) {
			currentPrice = 0;
		}

		let periodChange = 0;
		let valueChange = 0;

		// Calculate change based on the first point of the *selected timeframe's* history
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
	}, [currentSelectedPriceHistory, hoverPoint, parseValue]);

	const portfolioToken = useMemo(() => {
		if (!displayCoin?.address) return null;
		return tokens.find(token => token.mintAddress === displayCoin.address);
	}, [tokens, displayCoin?.address]);

	// isLoadingDetails should reflect the overall loading state, especially for the initial data population.
	// isOverallPriceHistoryLoading covers the parallel fetching.
	// Individual timeframe errors are handled by priceHistoryErrors[selectedTimeframe].
	const isLoadingGlobal = !displayCoin || (displayCoin && !displayCoin.description) || isOverallPriceHistoryLoading;


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
		// Consider if individual timeframe loading indication is needed here,
		// for now, global loading affects the shimmer placeholders.
		// (priceHistoryErrors[selectedTimeframe] || isOverallPriceHistoryLoading) && styles.timeframeButtonsRowLoading
		isOverallPriceHistoryLoading && styles.timeframeButtonsRowLoading // Simplified for now
	], [styles.timeframeButtonsRow, styles.timeframeButtonsRowLoading, isOverallPriceHistoryLoading]);

	const timeframeButtonStyle = useMemo(() => ({
		style: styles.timeframeButton,
		// disabled: isOverallPriceHistoryLoading || !!priceHistoryErrors[selectedTimeframe] // Example: disable if loading or error for this timeframe
	}), [styles.timeframeButton]);

	const onRefresh = useCallback(async () => {
		if (mintAddress) {
			// We use the general 'loading' state for RefreshControl indication here.
			// Alternatively, a new state like 'isRefreshing' could be introduced
			// if we want to differentiate Lottie loader from pull-to-refresh loader.
			// For now, existing `loading` state will make the chart loader appear during refresh.
			// setLoading(true); // setLoading was removed, isPriceHistoryLoading is used for RefreshControl
			try {
				await useCoinStore.getState().getCoinByID(mintAddress, true);
				// This will re-trigger the useEffect that calls fetchHistoryForTimeframes
				// if displayCoin.address changes, or if getCoinByID itself causes a re-render
				// and fetchHistoryForTimeframes is called again.
				// For a more direct refresh of price history:
				if (displayCoin?.address) {
					await fetchHistoryForTimeframes(displayCoin.address, allTimeframeValues);
				}
			} catch (error: unknown) {
				if (error instanceof Error) {
					logger.error("Error during refresh:", error.message);
				} else {
					logger.error("An unknown error occurred during refresh:", error);
				}
				showToast({ type: 'error', message: 'Failed to refresh data.' });
				// Ensure loading is false if refresh fails before history fetch can
				// setLoading(false); // setLoading was removed
			}
			// setLoading(false) is now primarily handled by the data fetching useEffect's finally block. // setLoading was removed
			// If the displayCoin data doesn't change after getCoinByID, the effect might not run.
			// To ensure the RefreshControl spinner stops, we might need to explicitly stop it
			// if the effect doesn't run. This can be tricky.
			// A simple approach: if data fetching effect is not re-triggered, stop loading.
			// This timeout is a pragmatic way to ensure it stops if the effect doesn't.
			// setTimeout(() => setLoading(false), 1000); // setLoading was removed


		}
		// Overall loading state is managed by the usePriceHistory hook
	}, [mintAddress, showToast, fetchHistoryForTimeframes, allTimeframeValues, displayCoin?.address]);

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

	// Check if the essential displayCoin is missing and we are not in a global loading state.
	if (!displayCoin && !isLoadingGlobal) {
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
		// Show placeholder if global loading or if the specific selected timeframe data is missing/empty
		if (isLoadingGlobal || !displayCoin || currentSelectedPriceHistory.length < 2 || !displayCoin.resolvedIconUrl) {
			// If it's not global loading but data is missing for selected, could show a mini-error/empty state for price card
			// For now, defer to global placeholder logic.
			return null; // Will be handled by isLoadingGlobal ? renderPlaceholderPriceCard()
		}

		return (
			<View style={styles.priceCard} testID={`coin-detail-price-card-${displayCoin?.symbol?.toLowerCase()}`}>
				<PriceDisplay
					price={displayData.currentPrice}
					periodChange={displayData.periodChange}
					valueChange={displayData.valueChange}
					period={TIMEFRAMES.find(tf => tf.value === selectedTimeframe)?.label || selectedTimeframe}
					resolvedIconUrl={displayCoin.resolvedIconUrl}
					name={displayCoin.name}
					symbol={displayCoin.symbol}
					address={displayCoin.address} // Use displayCoin.address
				/>
			</View>
		);
	};

	const renderChartCard = () => {
		// Determine if chart should show its internal loader:
		// True if overall history is loading AND the specific timeframe has no data yet OR has an error.
		const chartShouldShowLoader = isOverallPriceHistoryLoading &&
			(!currentSelectedPriceHistory || currentSelectedPriceHistory.length === 0 || !!priceHistoryErrors[selectedTimeframe]);

		return (
			<View style={styles.chartContainer} testID={`coin-detail-chart-card-${displayCoin?.symbol?.toLowerCase()}`}>
				<View style={styles.chartCardContent}>
					<CoinChart
						data={currentSelectedPriceHistory} // Pass data for the selected timeframe
						loading={chartShouldShowLoader}
						onHover={handleChartHover}
						period={selectedTimeframe}
					/>
					{/* Optionally, show a specific error message for this timeframe if needed */}
					{priceHistoryErrors[selectedTimeframe] && !chartShouldShowLoader && (
						<View style={styles.chartErrorOverlay}>
							<Text style={styles.chartErrorText}>
								Error loading data for {selectedTimeframe}.
							</Text>
						</View>
					)}
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
						// Data is already fetched, just changing view.
						// If individual refresh on select was desired:
						// if (displayCoin?.address) {
						//   fetchSingleTimeframeHistory(displayCoin.address, value);
						// }
					}}
					buttons={TIMEFRAMES.map(tf => ({
						value: tf.value,
						testID: `coin-detail-timeframe-button-${tf.value}`,
						label: tf.label,
						...timeframeButtonStyle,
						// Optionally disable button if its data is errored and not loading
						// disabled: !!priceHistoryErrors[tf.value] && !isOverallPriceHistoryLoading,
					}))}
					density="small"
					style={timeframeButtonsRowStyle}
				/>
			</View>
		);
	};

	const renderMarketStatsCard = () => {
		if (isLoadingGlobal || !displayCoin) return null; // Defer to global placeholder

		return (
			<View style={styles.marketStatsCard} testID="coin-detail-market-stats-card">
				<MarketStats coin={displayCoin} />
			</View>
		);
	};

	const renderHoldingsCard = () => {
		if (isLoadingGlobal ||!portfolioToken) return null; // Defer to global placeholder or hide if no holdings

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
							refreshing={isOverallPriceHistoryLoading} // Use overall loading state
							onRefresh={onRefresh}
							tintColor={styles.colors.primary}
						/>
					}
				>
					{/* Conditional rendering based on global loading state */}
					{isLoadingGlobal ? renderPlaceholderPriceCard() : renderPriceCard()}
					{isLoadingGlobal ? renderPlaceholderChartCard() : renderChartCard()}
					{isLoadingGlobal ? null : renderTimeframeCard()}
					{isLoadingGlobal ? null : renderMarketStatsCard()}
					{isLoadingGlobal ? null : renderHoldingsCard()}
					{isLoadingGlobal ? renderPlaceholderAboutCard() : renderAboutCard()}
				</ScrollView>

				{/* Show trade button with placeholder text when loading */}
				<View style={styles.tradeButtonContainer}>
					<Button
						mode="contained"
						onPress={handleTradePress} // Use memoized handler
						style={styles.tradeButton}
						testID={`trade-button-${displayCoin?.symbol?.toLowerCase()}`}
						disabled={isLoadingGlobal} // Disable if globally loading
					>
						{isLoadingGlobal ? 'Loading...' : `Trade ${displayCoin?.symbol || ''}`}
					</Button>
				</View>
			</View>
		</SafeAreaView>
	);
};

export default CoinDetail;
