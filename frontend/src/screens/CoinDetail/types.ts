import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { Coin } from '../../types';

export type CoinDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CoinDetail'>;

export interface CoinDetailScreenProps {
    navigation: CoinDetailScreenNavigationProp;
    route: {
        params: {
            coin: Coin;
        };
    };
} 