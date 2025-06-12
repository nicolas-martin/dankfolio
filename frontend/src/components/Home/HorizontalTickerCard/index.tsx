import React, { useCallback } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import CachedImage from '@/components/Common/CachedImage';
import { formatPercentage } from '@/utils/numberFormat';
import { formatTimeAgo } from '@/utils/timeFormat';
import { HorizontalTickerCardProps } from './types';
import { useStyles } from './styles';

const HorizontalTickerCard: React.FC<HorizontalTickerCardProps> = ({ coin, onPress, testIdPrefix = 'new-coin' }) => {
	const styles = useStyles();
	const timeAgo = formatTimeAgo(coin.jupiterListedAt);

	// Memoize the press handler to prevent unnecessary re-renders
	const handlePress = useCallback(() => {
		onPress(coin);
	}, [coin, onPress]);

	return (
		<TouchableOpacity
			style={styles.container}
			onPress={handlePress}
			testID={`${testIdPrefix}-card-${coin.mintAddress.toLowerCase()}`}
			accessible={true}
			accessibilityRole="button"
			accessibilityLabel={`${coin.symbol.toLowerCase()} ticker card`}
			accessibilityHint="Double tap to view coin details"
			hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
		>
			<View style={styles.logoContainer}>
				{coin.resolvedIconUrl && (
					<CachedImage
						uri={coin.resolvedIconUrl}
						size={48}
						borderRadius={24}
						testID={`${testIdPrefix}-icon-${coin.mintAddress.toLowerCase()}`}
					/>
				)}
			</View>
			<Text style={styles.symbol} numberOfLines={1} testID={`${testIdPrefix}-symbol-${coin.mintAddress.toLowerCase()}`}>
				{coin.symbol}
			</Text>
			<Text style={styles.timeAgo} numberOfLines={1} testID={`${testIdPrefix}-time-${coin.mintAddress.toLowerCase()}`}>
				{timeAgo}
			</Text>
			{coin.change24h !== undefined && (
				<Text style={[
					styles.change,
					coin.change24h > 0 ? styles.changePositive :
						coin.change24h < 0 ? styles.changeNegative :
							styles.changeNeutral
				]} numberOfLines={1} testID={`${testIdPrefix}-change-${coin.mintAddress.toLowerCase()}`}>
					{formatPercentage(coin.change24h, 1, true)}
				</Text>
			)}
		</TouchableOpacity>
	);
};

// Memoize the component to prevent unnecessary re-renders
export default React.memo(HorizontalTickerCard, (prevProps, nextProps) => {
	return (
		prevProps.coin.mintAddress === nextProps.coin.mintAddress &&
		prevProps.coin.symbol === nextProps.coin.symbol &&
		prevProps.coin.resolvedIconUrl === nextProps.coin.resolvedIconUrl &&
		prevProps.coin.change24h === nextProps.coin.change24h &&
		prevProps.coin.jupiterListedAt === nextProps.coin.jupiterListedAt &&
		prevProps.testIdPrefix === nextProps.testIdPrefix
	);
});
