import React, { useCallback, useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native'; // Keep View if needed for layout
import { Text } from 'react-native-paper';
// CachedImage might not be directly used if CoinInfoBlock handles its own image
import { formatPercentage } from '@/utils/numberFormat';
import { TrendUpIcon, TrendDownIcon } from '@/components/Common/Icons';
import CoinInfoBlock from '@components/Common/CoinInfoBlock'; // Import CoinInfoBlock
import { HorizontalTickerCardProps } from './types';
import { useStyles } from './styles';

// Defined outside the component for static objects
const staticHitSlop = { top: 10, bottom: 10, left: 10, right: 10 };

const HorizontalTickerCard: React.FC<HorizontalTickerCardProps> = ({ 
	coin, 
	onPress, 
	containerStyle, 
	testIdPrefix = 'new-coin',
	showPriceChange = false,
	size = 'large'
}) => {
	const styles = useStyles();

	// Memoize the press handler to prevent unnecessary re-renders
	const handlePress = useCallback(() => {
		onPress(coin);
	}, [coin, onPress]);

	// Choose styles based on size
	const containerBaseStyle = size === 'small' ? styles.containerSmall : styles.container;
	const logoContainerStyle = size === 'small' ? styles.logoContainerSmall : styles.logoContainer;
	const symbolStyle = size === 'small' ? styles.symbolSmall : styles.symbol;
	const iconSize = size === 'small' ? 24 : 48;

	// Memoize the combined style to prevent JSX array creation
	const combinedStyle = useMemo(() => [containerBaseStyle, containerStyle], [containerBaseStyle, containerStyle]);

	// Get trend color for price changes
	const getTrendColor = useCallback((value: number | undefined): string => {
		if (value === undefined) return styles.colors.onSurfaceVariant;
		if (value > 0) return styles.theme.trend.positive;
		if (value < 0) return styles.theme.trend.negative;
		return styles.colors.onSurfaceVariant;
	}, [styles.colors.onSurfaceVariant, styles.theme.trend]);

	const changeValue = coin.price24hChangePercent;

	return (
		<TouchableOpacity
			style={combinedStyle}
			onPress={handlePress}
			testID={`${testIdPrefix}-card-${coin.symbol.toLowerCase()}`}
			accessible={false}
			importantForAccessibility="no-hide-descendants"
			accessibilityRole="button"
			hitSlop={staticHitSlop}
		>
			<CoinInfoBlock
				iconUri={coin.resolvedIconUrl}
				iconSize={iconSize}
				primaryText={coin.symbol}
				primaryTextStyle={symbolStyle}
				iconStyle={logoContainerStyle}
				testIdPrefix={testIdPrefix}
			/>
			
			{/* Only show price change for trending gainers, nothing for new coins */}
			{showPriceChange && changeValue !== undefined && (
				<View style={styles.changeContainer}>
					{changeValue > 0 && (
						<TrendUpIcon 
							size={12}
							color={getTrendColor(changeValue)}
						/>
					)}
					{changeValue < 0 && (
						<TrendDownIcon 
							size={12}
							color={getTrendColor(changeValue)}
						/>
					)}
					<Text
						style={[styles.change, { color: getTrendColor(changeValue) }]}
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

// Memoize the component to prevent unnecessary re-renders
export default React.memo(HorizontalTickerCard, (prevProps, nextProps) => {
	return (
		prevProps.coin.address === nextProps.coin.address &&
		prevProps.coin.symbol === nextProps.coin.symbol &&
		prevProps.coin.resolvedIconUrl === nextProps.coin.resolvedIconUrl &&
		prevProps.coin.price24hChangePercent === nextProps.coin.price24hChangePercent &&
		prevProps.testIdPrefix === nextProps.testIdPrefix &&
		prevProps.containerStyle === nextProps.containerStyle &&
		prevProps.showPriceChange === nextProps.showPriceChange &&
		prevProps.size === nextProps.size
	);
});
