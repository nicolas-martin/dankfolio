import { Coin, Wallet } from '../../types/index';
import { WalletBalanceResponse } from '../../services/api';
import api from '../../services/api';
import { secureStorage } from '../../services/solana';
import { TimeframeOption } from './types';

type ToastType = 'success' | 'error' | 'info' | 'warning';
interface ToastParams {
    type: ToastType;
    message: string;
    txHash?: string;
}

export const TIMEFRAMES: TimeframeOption[] = [
    { label: "15m", value: "15m" },
    { label: "1H", value: "1H" },
    { label: "4H", value: "4H" },
    { label: "1D", value: "1D" },
];

export const formatNumber = (num: number): string => {
    if (num >= 1000000000) {
        return (num / 1000000000).toFixed(2) + 'B';
    }
    if (num >= 1000000) {
        return (num / 1000000).toFixed(2) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(2) + 'K';
    }
    return num.toFixed(2);
};

export const loadWallet = async (coinId: string): Promise<{ wallet: Wallet | null; balance: number }> => {
    try {
        const savedWallet = await secureStorage.getWallet();
        if (savedWallet) {
            if (savedWallet.tokens) {
                const token = savedWallet.tokens.find(t => t.mint === coinId);
                return {
                    wallet: savedWallet,
                    balance: token?.amount || 0
                };
            } else {
                console.log('⚠️ No tokens in wallet');
                return { wallet: savedWallet, balance: 0 };
            }
        }
        return { wallet: null, balance: 0 };
    } catch (error) {
        console.error('Error loading wallet:', error);
        return { wallet: null, balance: 0 };
    }
};

export const fetchPriceHistory = async (
    coinId: string,
    timeframe: string,
    setLoading: (loading: boolean) => void,
    setPriceHistory: (history: { x: Date; y: number }[]) => void,
    coin: Coin | null
) => {
    try {
        setLoading(true);

        // If no coin is provided, we can't fetch the price history
        if (!coin) {
            console.error('❌ No coin provided for price history');
            setPriceHistory([]);
            return;
        }

        const time_from = Math.floor(Date.now() / 1000);
        const points = 100;
        var durationPerPoint = 900;
        
        switch (timeframe) {
            case '15m':
                durationPerPoint = 900;
                break;
            case '1H':
                durationPerPoint = 3600;
                break;
            case '4H':
                durationPerPoint = 14400;
                break;
            case '1D':
                durationPerPoint = 86400;
                break;
            case '1W':
                durationPerPoint = 604800;
                break;
            default:
                throw new Error(`Invalid timeframe: ${timeframe}`);
        }

        const time_to = time_from - (points * durationPerPoint);

        const response = await api.getPriceHistory(
            coinId,
            timeframe,
            time_to.toString(),
            time_from.toString(),
            "token"
        );

        if (response?.data?.items) {
            const mapped = response.data.items
                .filter(item => item.value !== null && item.unixTime !== null)
                .map(item => ({
                    x: new Date(item.unixTime * 1000),
                    y: item.value
                }));
            setPriceHistory(mapped);
        } else {
            setPriceHistory([]);
        }
    } catch (error) {
        console.error("Error fetching price history:", error);
        setPriceHistory([]);
    } finally {
        setLoading(false);
    }
};

export const fetchCoinData = async (
    coinId: string,
    initialCoin: Coin | null,
    setMetadataLoading: (loading: boolean) => void,
    setCoin: (coin: Coin | null) => void
) => {
    if (!initialCoin) return;
    setMetadataLoading(true);

    try {
        // If daily_volume is 0, it means we're coming from profile page
        // and need fresh data
        if (initialCoin.daily_volume === 0) {
            const freshCoinData = await api.getCoinByID(coinId);
            setCoin({ ...initialCoin, ...freshCoinData });
        } else {
            setCoin(initialCoin);
        }
    } catch (error) {
        console.error('❌ Failed to fetch coin details:', error);
        setCoin(initialCoin);
    }

    setMetadataLoading(false);
};

export const handleTradeNavigation = (
    coin: Coin | null,
    solCoin: Coin | null,
    walletBalance: WalletBalanceResponse | undefined,
    showToast: (params: ToastParams) => void,
    navigate: (screen: string, params: any) => void
) => {
    if (coin && solCoin) {
        // Prevent trading the same coin
        if (coin.id === solCoin.id) {
            showToast({
                type: 'error',
                message: 'Cannot trade a coin for itself'
            });
            return;
        }

        // Special handling for SOL balance - already in SOL format
        const fromBalance = solCoin.id === 'So11111111111111111111111111111111111111112'
            ? (walletBalance?.sol_balance || 0)
            : walletBalance?.tokens.find(token => token.id === solCoin.id)?.balance || 0;

        const toBalance = coin.id === 'So11111111111111111111111111111111111111112'
            ? (walletBalance?.sol_balance || 0)
            : walletBalance?.tokens.find(token => token.id === coin.id)?.balance || 0;

        navigate('Trade', {
            initialFromCoin: {
                ...solCoin,
                balance: fromBalance
            },
            initialToCoin: {
                ...coin,
                balance: toBalance
            }
        });
    }
}; 