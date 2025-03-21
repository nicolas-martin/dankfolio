import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/index';
import { Coin } from '../../types/index';

export type TradeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Trade'>;

export interface TradeScreenProps {
    navigation: TradeScreenNavigationProp;
    route: {
        params: {
            coin: Coin;
            isBuy: boolean;
        };
    };
} 