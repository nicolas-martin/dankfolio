import { Wallet, Coin } from '../types/index';
import { WalletBalanceResponse } from '../services/api';
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
                walletBalance?: WalletBalanceResponse;
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
