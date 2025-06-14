import React, { useCallback } from 'react';
import { View, TouchableOpacity, Dimensions } from 'react-native';
import { Text } from 'react-native-paper';
// CachedImage might not be directly used if CoinInfoBlock handles its own image
import ShimmerPlaceholder from '@/components/Common/ShimmerPlaceholder';
import SparklineChart from '@/components/Chart/SparklineChart';
import { formatTokenBalance, formatNumber, formatPrice, formatPercentage } from '@/utils/numberFormat';
import CoinInfoBlock from '@/components/Common/CoinInfoBlock'; // Import CoinInfoBlock
import { CoinCardProps } from './coincard_types';
import { useStyles } from './coincard_styles';
import { logger } from '@/utils/logger';

const cardWidth = Dimensions.get('window').width * 0.45; // Example: 45% of screen width for vertical cards

const CoinCard: React.FC<CoinCardProps> = ({
	coin,
	onPressCoin, // Changed from onPress to onPressCoin
	isHorizontal,
	priceHistory,
	isPriceHistoryLoading,
	showSparkline = true, // New prop to control sparkline visibility
	testIdPrefix = 'coin', // Default to 'coin' for backward compatibility
}) => {
	const styles = useStyles();

	const handlePress = useCallback(() => {
		if (onPressCoin) {
			logger.info(`[CoinCard LOG] ${isHorizontal ? 'Horizontal' : 'Vertical'} card pressed:`, coin.symbol, coin.mintAddress);
			onPressCoin(coin);
		}
	}, [coin, onPressCoin, isHorizontal]);

	// Memoize the image load/error handlers (no longer needed if CachedImage is only in CoinInfoBlock)
	// const handleImageLoad = useCallback(() => { ... });
	// const handleImageError = useCallback(() => { ... });

	// renderCoinIcon is no longer needed if CoinInfoBlock handles the icon
	// const renderCoinIcon = (size = 36) => { ... };

	if (isHorizontal) {
		// Horizontal layout might also use CoinInfoBlock if adaptable, or remain custom.
		// For this pass, focusing on the vertical layout's leftSection.
		// Assuming horizontal layout remains as is for now, or could be a separate refactor.
		const iconForHorizontal = (
			<View style={styles.horizontalLogoContainer}>
				{coin.resolvedIconUrl && (
					<CachedImage
						uri={coin.resolvedIconUrl}
						size={32} // Specific size for horizontal
						testID={`${testIdPrefix}-icon-${coin.symbol.toLowerCase()}`}
					/>
				)}
			</View>
		);

		return (
			<TouchableOpacity
				style={styles.horizontalCard}
				onPress={handlePress}
				testID={`${testIdPrefix}-card-horizontal-${coin.symbol.toLowerCase()}`}
				accessible={false}
				importantForAccessibility="no-hide-descendants"
				accessibilityRole="button"
				activeOpacity={0.7}
				delayPressIn={100}
				delayPressOut={100}
			>
				{iconForHorizontal}
							<Text
				style={styles.horizontalSymbol}
				numberOfLines={1}
				testID={`${testIdPrefix}-symbol-${coin.symbol.toLowerCase()}`}
					accessible={true}
					accessibilityRole="text"
				>
					{coin.symbol}
				</Text>
							<Text
				style={styles.horizontalPrice}
				numberOfLines={1}
				testID={`${testIdPrefix}-price-${coin.symbol.toLowerCase()}`}
					accessible={true}
					accessibilityRole="text"
				>
					{formatPrice(Number(coin.price))}
				</Text>
				{/* Optionally, add a small 24h change if space permits */}
				{coin.change24h !== undefined && (
					<Text style={[
						styles.horizontalChange,
						coin.change24h > 0 ? styles.changePositiveSmall :
							coin.change24h < 0 ? styles.changeNegativeSmall :
								styles.changeNeutralSmall
					]} numberOfLines={1}>
						{formatPercentage(coin.change24h, 1, true)}
					</Text>
				)}
			</TouchableOpacity>
		);
	}

	// Original vertical layout
	const renderPriceChange = () => {
		if (coin.change24h === undefined) return null;
		const changeStyle = coin.change24h > 0
			? styles.changePositive
			: coin.change24h < 0
				? styles.changeNegative
				: styles.changeNeutral;
		return (
			<Text style={changeStyle} numberOfLines={1}>
				{formatPercentage(coin.change24h, 2, true)}
			</Text>
		);
	};

	return (
		<TouchableOpacity
			style={styles.card}
			onPress={handlePress}
			testID={`${testIdPrefix}-card-${coin.symbol.toLowerCase()}`}
			accessible={false}
			importantForAccessibility="no-hide-descendants"
			accessibilityRole="button"
			activeOpacity={0.7}
		>
			<View style={styles.content}>
				<CoinInfoBlock
					containerStyle={styles.leftSection}
					iconUri={coin.resolvedIconUrl}
					iconSize={36} // Default vertical size
					primaryText={coin.symbol}
					secondaryText={coin.balance !== undefined ? formatTokenBalance(coin.balance) : coin.name}
					primaryTextStyle={styles.symbol}
					secondaryTextStyle={coin.balance !== undefined ? styles.balance : styles.name}
					// iconStyle={styles.logo} // If specific styling needed for the icon wrapper itself
					textContainerStyle={styles.nameSection}
					testIdPrefix={testIdPrefix} // Pass down for testing if CoinInfoBlock supports it
				/>

				{/* Sparkline in the middle */}
				{showSparkline && (
					<View style={styles.sparklineContainer}>
						{isPriceHistoryLoading ? (
							<ShimmerPlaceholder
								width={cardWidth * 0.35}
								height={20}
								borderRadius={4}
							/>
						) : priceHistory && priceHistory.length > 1 ? (
							<SparklineChart
								data={priceHistory}
								width={cardWidth * 0.35} // Appropriate width for middle section
								height={20} // Proper height for the layout
								isLoading={isPriceHistoryLoading}
								testID={`${testIdPrefix}-sparkline-${coin.symbol.toLowerCase()}`}
							/>
						) : (
							<ShimmerPlaceholder
								width={cardWidth * 0.35}
								height={20}
								borderRadius={4}
							/>
						)}
					</View>
				)}

				<View style={styles.rightSection}>
									<Text
					style={styles.price}
					numberOfLines={1}
					testID={`${testIdPrefix}-price-${coin.symbol.toLowerCase()}`}
						accessible={true}
						accessibilityRole="text"
					>
						{formatPrice(Number(coin.price))}
					</Text>
					{coin.change24h !== undefined ? (
						renderPriceChange()
					) : coin.value !== undefined ? (
						<Text style={styles.volume} numberOfLines={1}>
							Value: {formatPrice(coin.value)}
						</Text>
					) : typeof coin.dailyVolume === 'number' && (
						<Text style={styles.volume} numberOfLines={1}>
							Vol: {formatNumber(coin.dailyVolume, true)}
						</Text>
					)}
				</View>
			</View>
		</TouchableOpacity>
	);
};

// Memoize the component to prevent unnecessary re-renders
export default React.memo(CoinCard, (prevProps, nextProps) => {
	// Custom comparison function to optimize re-renders
	return (
		prevProps.coin.mintAddress === nextProps.coin.mintAddress &&
		prevProps.coin.price === nextProps.coin.price &&
		prevProps.coin.change24h === nextProps.coin.change24h &&
		prevProps.coin.resolvedIconUrl === nextProps.coin.resolvedIconUrl &&
		prevProps.coin.symbol === nextProps.coin.symbol &&
		prevProps.coin.name === nextProps.coin.name &&
		prevProps.coin.balance === nextProps.coin.balance &&
		prevProps.coin.value === nextProps.coin.value &&
		prevProps.coin.dailyVolume === nextProps.coin.dailyVolume &&
		prevProps.isHorizontal === nextProps.isHorizontal &&
		prevProps.priceHistory === nextProps.priceHistory &&
		prevProps.isPriceHistoryLoading === nextProps.isPriceHistoryLoading &&
		prevProps.showSparkline === nextProps.showSparkline &&
		prevProps.testIdPrefix === nextProps.testIdPrefix &&
		prevProps.onPressCoin === nextProps.onPressCoin // Added onPressCoin to comparison
	);
});
