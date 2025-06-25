import React, { useCallback, useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import CachedImage from '@/components/Common/CachedImage';
import { NewListingCardProps } from './types';
import { useStyles } from './styles';

const NewListingCard: React.FC<NewListingCardProps> = ({
	coin,
	onPress,
	containerStyle,
	testIdPrefix = 'new-listing',
}) => {
	const styles = useStyles();

	const handlePress = useCallback(() => {
		onPress(coin);
	}, [coin, onPress]);

	const cardStyle = useMemo(() => {
		return containerStyle ? [styles.card, containerStyle] : styles.card;
	}, [styles.card, containerStyle]);

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
			{/* Icon container - always reserve space for consistent layout */}
			<View style={styles.iconContainer}>
				{coin.resolvedIconUrl && (
					<CachedImage
						uri={coin.resolvedIconUrl}
						size={20}
						showLoadingIndicator={true}
						borderRadius={10}
						testID={`${testIdPrefix}-icon-${coin.symbol.toLowerCase()}`}
					/>
				)}
			</View>
			
			{/* Symbol text */}
			<Text
				style={styles.symbol}
				numberOfLines={1}
				ellipsizeMode="tail"
				testID={`${testIdPrefix}-symbol-${coin.symbol.toLowerCase()}`}
				accessible={true}
				accessibilityRole="text"
			>
				{coin.symbol}
			</Text>
		</TouchableOpacity>
	);
};

export default React.memo(NewListingCard, (prevProps, nextProps) => {
	return (
		prevProps.coin.address === nextProps.coin.address &&
		prevProps.coin.symbol === nextProps.coin.symbol &&
		prevProps.coin.resolvedIconUrl === nextProps.coin.resolvedIconUrl
	);
}); 