import React from 'react';
import { View, Image, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { formatTokenBalance, formatNumber, formatPrice, formatPercentage } from '../../../utils/numberFormat';
import { CoinCardProps } from './coincard_types';
import { createStyles } from './coincard_styles';
import { useProxiedImage } from '@/hooks/useProxiedImage';

const CoinCard: React.FC<CoinCardProps> = ({ coin, onPress }) => {
	const theme = useTheme();
	const styles = createStyles(theme);

	const { imageUri, isLoading } = useProxiedImage(coin.iconUrl);

	const renderCoinIcon = () => {
		if (isLoading || !imageUri) {
			return (
				<View style={styles.coinIcon}>
					<ActivityIndicator size="small" color={theme.colors.primary} />
				</View>
			);
		}

		return (
			<Image
				key={imageUri}
				source={{ uri: imageUri }}
				style={styles.logo}
			/>
		);
	};

	const renderPriceChange = () => {
		if (coin.change24h === undefined) return null;

		// const change = coin.change24h; // Original variable, can be kept or removed
		// const isPositive = coin.change24h > 0; // Original variable, can be kept or removed
		// const isNegative = coin.change24h < 0; // Original variable, can be kept or removed

		const changeStyle = coin.change24h > 0
			? styles.changePositive
			: coin.change24h < 0
				? styles.changeNegative
				: styles.changeNeutral;

		// const prefix = isPositive ? '+' : ''; // Removed

		return (
			<Text style={changeStyle} numberOfLines={1}>
				{formatPercentage(coin.change24h, 2, true)}
			</Text>
		);
	};

	return (
		<TouchableOpacity
			style={styles.card}
			onPress={() => onPress(coin)}
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

export default CoinCard;

