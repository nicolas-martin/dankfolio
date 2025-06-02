import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { CachedImage } from '@/components/Common/CachedImage';
import { formatPercentage } from '@/utils/numberFormat'; // Remove formatPrice import
import { formatTimeAgo } from '@/utils/timeFormat'; // Add formatTimeAgo import
import { HorizontalTickerCardProps } from './types';
import { styles } from './styles';

const HorizontalTickerCard: React.FC<HorizontalTickerCardProps> = ({ coin, onPress }) => {
	const timeAgo = formatTimeAgo(coin.jupiterListedAt);

	return (
		<TouchableOpacity
			style={styles.container}
			onPress={() => onPress(coin)}
			testID={`horizontal-ticker-card-${coin.mintAddress}`}
			activeOpacity={0.7}
		>
			<View style={styles.logoContainer}>
				<CachedImage
					uri={coin.resolvedIconUrl}
					size={48}
					borderRadius={24}
					testID={`coin-icon-${coin.mintAddress}`}
				/>
			</View>
			<Text style={styles.symbol} numberOfLines={1}>
				{coin.symbol}
			</Text>
			<Text style={styles.timeAgo} numberOfLines={1}>
				{timeAgo}
			</Text>
			{coin.change24h !== undefined && (
				<Text style={[
					styles.change,
					coin.change24h > 0 ? styles.changePositive :
						coin.change24h < 0 ? styles.changeNegative :
							styles.changeNeutral
				]} numberOfLines={1}>
					{formatPercentage(coin.change24h, 1, true)}
				</Text>
			)}
		</TouchableOpacity>
	);
};

export default HorizontalTickerCard;
