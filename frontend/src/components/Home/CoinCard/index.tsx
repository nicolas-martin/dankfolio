import React from 'react';
import { View, Image, ActivityIndicator } from 'react-native';
import { Text, Card, useTheme } from 'react-native-paper';
import { formatNumber, formatPrice } from '../../../utils/numberFormat';
import { CoinCardProps } from './coincard_types';
import { createStyles } from './coincard_styles';
import { useProxiedImage } from '@/hooks/useProxiedImage';

const CoinCard: React.FC<CoinCardProps> = ({ coin, onPress }) => {
	const theme = useTheme();
	const styles = createStyles(theme);

	const { imageUri, isLoading } = useProxiedImage(coin.iconUrl);

	return (
		<Card
			style={styles.card}
			onPress={() => onPress(coin)}
			testID={`coin-card-${coin.mintAddress}`}
		>
			<Card.Content style={styles.content}>
				<View style={styles.leftSection}>
					{isLoading || !imageUri ? (
						<View style={styles.logo}><ActivityIndicator size="small" /></View>
					) : (
						<Image
							key={imageUri}
							source={{ uri: imageUri }}
							style={styles.logo}
						/>
					)}
					<View style={styles.nameSection}>
						<Text style={styles.symbol}>{coin.symbol}</Text>
						{coin.balance !== undefined && (
							<Text style={styles.balance} numberOfLines={1}>
								Balance: {formatNumber(coin.balance, false)}
							</Text>
						)}
					</View>
				</View>

				<View style={styles.rightSection}>
					<Text style={styles.price} numberOfLines={1}>{formatPrice(Number(coin.price))}</Text>
					{coin.value !== undefined ? (
						<Text style={styles.volume} numberOfLines={1}>Value: {formatPrice(coin.value)}</Text>
					) : typeof coin.dailyVolume === 'number' && (
						<Text style={styles.volume} numberOfLines={1}>Vol: {formatNumber(coin.dailyVolume, true)}</Text>
					)}
				</View>
			</Card.Content>
		</Card>
	);
};

export default CoinCard;
