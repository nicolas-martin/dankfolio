import React, { useState, useEffect } from 'react';
import { View, Image, ActivityIndicator } from 'react-native';
import { Text, Card, useTheme } from 'react-native-paper';
import { formatNumber, formatPrice } from '../../../utils/numberFormat';
import { CoinCardProps } from './coincard_types';
import { DEFAULT_LOGO, fetchAndSetProxiedImage } from './coincard_scripts';
import { createStyles } from './coincard_styles';

const CoinCard: React.FC<CoinCardProps> = ({ coin, onPress }) => {
	const theme = useTheme();
	const styles = createStyles(theme);

	const [imageUri, setImageUri] = useState<string | null>(null);
	const [isLoadingImage, setIsLoadingImage] = useState(true);

	useEffect(() => {
		let isMounted = true;
		setIsLoadingImage(true);
		setImageUri(null);

		const loadImage = async () => {
			await fetchAndSetProxiedImage(coin.icon_url, (uri) => {
				if (isMounted) {
					setImageUri(uri);
					setIsLoadingImage(false);
				}
			});
		};

		loadImage();

		return () => {
			isMounted = false;
		};
	}, [coin.icon_url]);

	return (
		<Card
			style={styles.card}
			onPress={() => onPress(coin)}
			testID={`coin-card-${coin.id}`}
		>
			<Card.Content style={styles.content}>
				<View style={styles.leftSection}>
					{isLoadingImage || !imageUri ? (
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
						{/* <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail"> {coin.name || coin.symbol} </Text> */}
					</View>
				</View>

				<View style={styles.rightSection}>
					<Text style={styles.price} numberOfLines={1}>{formatPrice(Number(coin.price))}</Text>
					{typeof coin.daily_volume === 'number' && (
						<Text style={styles.volume} numberOfLines={1}>Vol: {formatNumber(coin.daily_volume, true)}</Text>
					)}
				</View>
			</Card.Content>
		</Card>
	);
};

export default CoinCard;
