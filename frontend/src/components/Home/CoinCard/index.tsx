import React, { useCallback } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { CachedImage } from '@/components/Common/CachedImage';
import { formatTokenBalance, formatNumber, formatPrice, formatPercentage } from '@/utils/numberFormat';
import { CoinCardProps } from './coincard_types';
import { createStyles } from './coincard_styles';
import { logger } from '@/utils/logger';

const CoinCard: React.FC<CoinCardProps> = ({ coin, onPress, isHorizontal }) => {
	const theme = useTheme();
	// Pass isHorizontal to createStyles so it can adapt styles
	const styles = createStyles(theme, isHorizontal);

	// Memoize the press handler to prevent unnecessary re-renders
	const handlePress = useCallback(() => {
		logger.info(`[CoinCard LOG] ${isHorizontal ? 'Horizontal' : 'Vertical'} card pressed:`, coin.symbol, coin.mintAddress);
		onPress(coin);
	}, [coin, onPress, isHorizontal]);

	// Memoize the image load/error handlers
	const handleImageLoad = useCallback(() => {
		logger.info(`[CoinCard LOG] renderCoinIcon complete for ${coin.symbol}: ${coin.resolvedIconUrl}`);
	}, [coin.symbol]);

	const handleImageError = useCallback(() => {
		logger.error(`[CoinCard LOG] renderCoinIcon error for ${coin.symbol}: ${coin.resolvedIconUrl}`);
	}, [coin.symbol]);

	const renderCoinIcon = (size = 40, borderRadius = 20) => {
		logger.info(`[CoinCard LOG] renderCoinIcon load for ${coin.symbol}: ${coin.resolvedIconUrl}`);
		return (
			<View style={isHorizontal ? styles.horizontalLogoContainer : styles.logo}>
				<CachedImage
					uri={coin.resolvedIconUrl}
					size={size}
					borderRadius={borderRadius}
					testID={`coin-icon-${coin.mintAddress}`}
					onLoad={handleImageLoad}
					onError={handleImageError}
				/>
			</View>
		);
	};

	if (isHorizontal) {
		return (
			<TouchableOpacity
				style={styles.horizontalCard} // Use new style for horizontal card
				onPress={handlePress}
				testID={`coin-card-horizontal-${coin.mintAddress}`}
				activeOpacity={0.7}
				delayPressIn={100}
				delayPressOut={100}
			>
				{renderCoinIcon(32, 16)}
				<Text style={styles.horizontalSymbol} numberOfLines={1}>
					{coin.symbol}
				</Text>
				<Text style={styles.horizontalPrice} numberOfLines={1}>
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
			testID={`coin-card-${coin.mintAddress}`}
			activeOpacity={0.7}
		>
			<View style={styles.content}>
				<View style={styles.leftSection}>
					{renderCoinIcon()}
					<View style={styles.nameSection}>
						<Text style={styles.symbol} numberOfLines={1}>
							{coin.symbol}
						</Text>
						{coin.balance !== undefined ? (
							<Text style={styles.balance} numberOfLines={1}>
								{formatTokenBalance(coin.balance)}
							</Text>
						) : (
							<Text style={styles.name} numberOfLines={1}>
								{coin.name}
							</Text>
						)}
					</View>
				</View>

				<View style={styles.rightSection}>
					<Text style={styles.price} numberOfLines={1}>
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
		prevProps.isHorizontal === nextProps.isHorizontal
	);
});
