import { Coin } from '@/types'; // Assuming Coin type is available

import { StyleProp, ViewStyle } from 'react-native';

export interface HorizontalTickerCardProps {
	coin: Coin; // Or select specific fields if Coin is too broad
	onPress: (coin: Coin) => void;
	testIdPrefix?: 'trending-coin' | 'new-coin'; // Controls testID prefix
	containerStyle?: StyleProp<ViewStyle>;
	showPriceChange?: boolean; // New prop to show price change instead of time ago
	size?: 'small' | 'large'; // New prop to control card size
}
