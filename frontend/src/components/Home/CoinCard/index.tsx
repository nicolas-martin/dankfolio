import React, { useState } from 'react'; // Added useState
import { View, ActivityIndicator, TouchableOpacity } from 'react-native'; // Removed Image
import { Image as ExpoImage } from 'expo-image'; // Added ExpoImage
import { Text, useTheme } from 'react-native-paper';
import { formatTokenBalance, formatNumber, formatPrice } from '../../../utils/numberFormat';
import { CoinCardProps } from './coincard_types';
import { createStyles } from './coincard_styles';
import { useCachedImage } from '@/hooks/useCachedImage'; // Changed to useCachedImage

const CoinCard: React.FC<CoinCardProps> = ({ coin, onPress }) => {
	const theme = useTheme();
	const styles = createStyles(theme);

	// Updated hook usage
	const { imageUri: cachedImageUri, isLoading: hookIsLoading, error: hookError } = useCachedImage(coin.iconUrl);
	// Added local state for ExpoImage loading and error
	const [isLoadingImage, setIsLoadingImage] = useState(true);
	const [imageError, setImageError] = useState<string | null>(null);

	const renderCoinIcon = () => {
		const finalImageUri = cachedImageUri; // Use cachedImageUri which includes fallback

		// Updated loading condition
		if (hookIsLoading || isLoadingImage || !finalImageUri) {
			// Using styles.logo for size consistency, and centering the ActivityIndicator
			// If styles.coinIcon was specifically for the container, this might need adjustment
			// For now, assuming styles.logo defines dimensions and we add centering.
			return (
				<View style={[styles.logo, { justifyContent: 'center', alignItems: 'center' }]}>
					<ActivityIndicator size="small" color={theme.colors.primary} />
				</View>
			);
		}

		// Safeguard if finalImageUri is null (should be handled by useCachedImage providing a default)
		if (!finalImageUri) {
			return (
				<View style={[styles.logo, { justifyContent: 'center', alignItems: 'center' }]}>
					<ActivityIndicator size="small" color={theme.colors.primary} />
				</View>
			);
		}

		// Replaced React Native Image with ExpoImage and added props
		return (
			<ExpoImage
				source={{ uri: finalImageUri }}
				style={styles.logo}
				cachePolicy="disk"
				transition={100}
				onLoadStart={() => {
					setIsLoadingImage(true);
					setImageError(null);
				}}
				onLoadEnd={() => setIsLoadingImage(false)}
				onError={(event) => {
					setIsLoadingImage(false);
					// Ensure event.error is a string or provide fallback text
					const errorMessage = typeof event.error === 'string' ? event.error : 'Failed to load image on CoinCard';
					setImageError(errorMessage);
					console.error('ExpoImage Error (CoinCard):', errorMessage, 'URI:', finalImageUri);
				}}
			/>
		);
	};

	const renderPriceChange = () => {
		if (coin.change24h === undefined) return null;

		const change = coin.change24h;
		const isPositive = change > 0;
		const isNegative = change < 0;

		const changeStyle = isPositive
			? styles.changePositive
			: isNegative
				? styles.changeNegative
				: styles.changeNeutral;

		const prefix = isPositive ? '+' : '';

		return (
			<Text style={changeStyle} numberOfLines={1}>
				{prefix}{change.toFixed(2)}%
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

