import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Coin, RootStackParamList } from '@/types/index';

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
