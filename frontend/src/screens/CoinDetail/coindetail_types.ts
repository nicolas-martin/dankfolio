import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Coin } from '@/types/index';
import type { RootStackParamList } from '@/types/navigation';

export type CoinDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CoinDetail'>;

export type CoinDetailScreenRouteProp = RouteProp<{
	CoinDetail: {
		coin: Coin;
	};
}, 'CoinDetail'>;

export interface TimeframeOption {
	label: string;
	value: string;
}
