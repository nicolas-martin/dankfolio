import React, { useCallback, useMemo } from 'react'; // Add useMemo
import { TouchableOpacity } from 'react-native'; // Keep View if needed for layout
import { Text } from 'react-native-paper';
// CachedImage might not be directly used if CoinInfoBlock handles its own image
import { formatPercentage } from '@/utils/numberFormat';
import { formatTimeAgo } from '@/utils/timeFormat';
import CoinInfoBlock from '@/components/Common/CoinInfoBlock'; // Import CoinInfoBlock
import { HorizontalTickerCardProps } from './types';
import { useStyles } from './styles';

// Defined outside the component for static objects
const staticHitSlop = { top: 10, bottom: 10, left: 10, right: 10 };

const HorizontalTickerCard: React.FC<HorizontalTickerCardProps> = ({ coin, onPress, testIdPrefix = 'new-coin' }) => {
	const styles = useStyles();
	const timeAgo = formatTimeAgo(coin.jupiterListedAt);

	// Memoize the press handler to prevent unnecessary re-renders
	const handlePress = useCallback(() => {
		onPress(coin);
	}, [coin, onPress]);

	const changeTextStyle = useMemo(() => [ // Memoized style
		styles.change,
		coin.change24h > 0 ? styles.changePositive :
		coin.change24h < 0 ? styles.changeNegative :
		styles.changeNeutral
	], [styles.change, styles.changePositive, styles.changeNegative, styles.changeNeutral, coin.change24h]);

	return (
		<TouchableOpacity
			style={styles.container}
			onPress={handlePress}
			testID={`${testIdPrefix}-card-${coin.symbol.toLowerCase()}`}
			accessible={true}
			accessibilityRole="button"
			accessibilityLabel={`${coin.symbol.toLowerCase()} ticker card`}
			accessibilityHint="Double tap to view coin details"
			hitSlop={staticHitSlop} // Use constant object
		>
			<CoinInfoBlock
				iconUri={coin.resolvedIconUrl}
				iconSize={48}
				primaryText={coin.symbol}
				// No secondary text in this specific block, or pass timeAgo if CoinInfoBlock is made more flexible
				containerStyle={styles.coinInfoContainer} // Add specific styling for this container if needed
				primaryTextStyle={styles.symbol}
				iconStyle={styles.logoContainer} // Pass logoContainer style to the icon part of CoinInfoBlock
				textContainerStyle={styles.symbolTextContainer} // Style for the text part of CoinInfoBlock
				testIdPrefix={testIdPrefix}
			/>
			{/* <Text style={styles.symbol} numberOfLines={1} testID={`${testIdPrefix}-symbol-${coin.symbol.toLowerCase()}`}>
				{coin.symbol}
			</Text> */}
			{/* This Text for symbol is now part of CoinInfoBlock */}
			<Text style={styles.timeAgo} numberOfLines={1} testID={`${testIdPrefix}-time-${coin.symbol.toLowerCase()}`}>
				{timeAgo}
			</Text>
			{coin.change24h !== undefined && (
				<Text style={changeTextStyle} numberOfLines={1} testID={`${testIdPrefix}-change-${coin.symbol.toLowerCase()}`}>
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
