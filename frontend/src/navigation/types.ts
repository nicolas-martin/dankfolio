import { Wallet, Coin } from '../types';
import { Dispatch, SetStateAction } from 'react';

export type RootStackParamList = {
        Home: undefined;
        Trade: { 
                wallet: Wallet | null;
                initialFromCoin?: Coin | null;
                initialToCoin?: Coin | null;
        };
        History: undefined;
        Profile: {
                walletAddress?: string;
        };
        CoinDetail: {
                coinId: string;
                coinName: string;
        };
        CoinSelect: {
                onSelect: (coin: Coin) => void;
                excludeCoinId?: string;
                currentCoinId?: string;
        };
};
