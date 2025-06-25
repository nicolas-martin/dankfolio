import React, { useCallback, useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { formatPercentage } from '@/utils/numberFormat';
import { TrendUpIcon, TrendDownIcon } from '@/components/Common/Icons';
import CoinInfoBlock from '@/components/Common/CoinInfoBlock';
import { TrendingGainerCardProps } from './types';
import { useStyles } from './styles';

const TrendingGainerCard: React.FC<TrendingGainerCardProps> = ({
	coin,
	onPress,
	containerStyle,
	testIdPrefix = 'trending-gainer',
}) => {
	const styles = useStyles();

	const handlePress = useCallback(() => {
		onPress(coin);
	}, [coin, onPress]);

	const changeValue = coin.price24hChangePercent;
	const trendColor = styles.getTrendColor(changeValue);

	const cardStyle = useMemo(() => {
		return containerStyle ? [styles.card, containerStyle] : styles.card;
	}, [styles.card, containerStyle]);

	const changeTextStyle = useMemo(() => {
		return [styles.changeText, { color: trendColor }];
	}, [styles.changeText, trendColor]);

	return (
		<TouchableOpacity
			style={cardStyle}
			onPress={handlePress}
			testID={`${testIdPrefix}-card-${coin.symbol.toLowerCase()}`}
			accessible={false}
			importantForAccessibility="no-hide-descendants"
			accessibilityRole="button"
			activeOpacity={0.7}
		>
			<CoinInfoBlock
				iconUri={coin.resolvedIconUrl}
				iconSize={48}
				primaryText={coin.symbol}
				primaryTextStyle={styles.symbol}
				iconStyle={styles.iconContainer}
				testIdPrefix={testIdPrefix}
			/>
			
			{changeValue !== undefined && (
				<View style={styles.changeContainer}>
					{changeValue > 0 && (
						<TrendUpIcon 
							size={12}
							color={trendColor}
						/>
					)}
					{changeValue < 0 && (
						<TrendDownIcon 
							size={12}
							color={trendColor}
						/>
					)}
					<Text
						style={changeTextStyle}
						numberOfLines={1}
						testID={`${testIdPrefix}-change-${coin.symbol.toLowerCase()}`}
						accessible={true}
						accessibilityRole="text"
					>
						{formatPercentage(changeValue, 1, true)}
					</Text>
				</View>
			)}
		</TouchableOpacity>
	);
};

export default React.memo(TrendingGainerCard, (prevProps, nextProps) => {
	return (
		prevProps.coin.address === nextProps.coin.address &&
		prevProps.coin.symbol === nextProps.coin.symbol &&
		prevProps.coin.resolvedIconUrl === nextProps.coin.resolvedIconUrl &&
		prevProps.coin.price24hChangePercent === nextProps.coin.price24hChangePercent
	);
}); 