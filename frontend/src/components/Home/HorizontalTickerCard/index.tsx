import React, { useCallback, useMemo } from 'react';
import { TouchableOpacity } from 'react-native'; // Keep View if needed for layout
import { Text } from 'react-native-paper';
// CachedImage might not be directly used if CoinInfoBlock handles its own image
import { formatTimeAgo } from '@/utils/timeFormat';
import CoinInfoBlock from '@components/Common/CoinInfoBlock'; // Import CoinInfoBlock
import { HorizontalTickerCardProps } from './types';
import { useStyles } from './styles';

// Defined outside the component for static objects
const staticHitSlop = { top: 10, bottom: 10, left: 10, right: 10 };

const HorizontalTickerCard: React.FC<HorizontalTickerCardProps> = ({ coin, onPress, containerStyle, testIdPrefix = 'new-coin' }) => {
	const styles = useStyles();
	const timeAgo = formatTimeAgo(coin.jupiterListedAt);

	// Memoize the press handler to prevent unnecessary re-renders
	const handlePress = useCallback(() => {
		onPress(coin);
	}, [coin, onPress]);

	// Memoize the combined style to prevent JSX array creation
	const combinedStyle = useMemo(() => [styles.container, containerStyle], [styles.container, containerStyle]);

	return (
		<TouchableOpacity
			style={combinedStyle}
			onPress={handlePress}
			testID={`${testIdPrefix}-card-${coin.symbol.toLowerCase()}`}
			accessible={false}
			importantForAccessibility="no-hide-descendants"
			accessibilityRole="button"
			hitSlop={staticHitSlop} // Use constant object
		>
			<CoinInfoBlock
				iconUri={coin.resolvedIconUrl}
				iconSize={48}
				primaryText={coin.symbol}
				// No secondary text in this specific block, or pass timeAgo if CoinInfoBlock is made more flexible
				primaryTextStyle={styles.symbol}
				iconStyle={styles.logoContainer} // Pass logoContainer style to the icon part of CoinInfoBlock
				testIdPrefix={testIdPrefix}
			/>
			{/* <Text style={styles.symbol} numberOfLines={1} testID={`${testIdPrefix}-symbol-${coin.symbol.toLowerCase()}`}>
				{coin.symbol}
			</Text> */}
			{/* This Text for symbol is now part of CoinInfoBlock */}
			<Text 
				style={styles.timeAgo} 
				numberOfLines={1} 
				testID={`${testIdPrefix}-time-${coin.symbol.toLowerCase()}`}
				accessible={true}
				accessibilityRole="text"
			>
				{timeAgo}
			</Text>
		</TouchableOpacity>
	);
};

// Memoize the component to prevent unnecessary re-renders
export default React.memo(HorizontalTickerCard, (prevProps, nextProps) => {
	return (
		prevProps.coin.address === nextProps.coin.address &&
		prevProps.coin.symbol === nextProps.coin.symbol &&
		prevProps.coin.resolvedIconUrl === nextProps.coin.resolvedIconUrl &&
		prevProps.coin.jupiterListedAt === nextProps.coin.jupiterListedAt &&
		prevProps.testIdPrefix === nextProps.testIdPrefix &&
		prevProps.containerStyle === nextProps.containerStyle // Add containerStyle to comparison
	);
});
