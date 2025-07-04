import { Coin } from '@/types';
import { StyleProp, ViewStyle } from 'react-native';

export interface TrendingGainerCardProps {
	coin: Coin;
	onPress: (coin: Coin) => void;
	containerStyle?: StyleProp<ViewStyle>;
	testIdPrefix?: string;
} 
