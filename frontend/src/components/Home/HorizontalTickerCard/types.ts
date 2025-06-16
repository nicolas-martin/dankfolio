import { Coin } from '@/types'; // Assuming Coin type is available

import { StyleProp, ViewStyle } from 'react-native';

export interface HorizontalTickerCardProps {
	coin: Coin; // Or select specific fields if Coin is too broad
	onPress: (coin: Coin) => void;
	testIdPrefix?: 'trending-coin' | 'new-coin'; // Controls testID prefix
	containerStyle?: StyleProp<ViewStyle>;
}
