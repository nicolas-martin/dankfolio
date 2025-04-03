import { Coin, RootStackParamList, } from '../../types/index';
import { WalletBalanceResponse } from '../../services/api';
import { ToastProps } from '../../components/Common/Toast/toast_types';
import Clipboard from '@react-native-clipboard/clipboard';
import { CoinDetailScreenNavigationProp } from '../CoinDetail/coindetail_types';

export const calculateTotalValue = (
    walletBalance: WalletBalanceResponse
): { totalValue: number } => {
    const totalValue = walletBalance.tokens.reduce((sum, token) => sum + token.value, 0);
    return { totalValue };
};

export const handleTokenPress = (
    token: Coin,
    navigate: CoinDetailScreenNavigationProp['navigate']
): void => {
    navigate('CoinDetail', { coin: token });
};

export const copyToClipboard = (
    text: string,
    symbol: string,
    showToast: (params: ToastProps) => void
): void => {
    Clipboard.setString(text);
    showToast({
        type: 'success',
        message: `${symbol} copied to clipboard! 📋`
    });
};

export const formatAddress = (address: string): string => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
};
