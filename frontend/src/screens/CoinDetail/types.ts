import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Coin, RootStackParamList } from '../../types/index';
import { WalletBalanceResponse } from '../../services/api';

export type CoinDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CoinDetail'>;

export type CoinDetailScreenRouteProp = RouteProp<{
	CoinDetail: {
		coinName: string;
		daily_volume?: number;
		coin: Coin;
		solCoin: Coin;
		walletBalance?: WalletBalanceResponse;
	};
}, 'CoinDetail'>;

export interface TimeframeOption {
	label: string;
	value: string;
}
