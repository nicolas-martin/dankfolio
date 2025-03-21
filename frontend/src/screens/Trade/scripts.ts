import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Coin } from '../../types/index';
import api from '../../services/api';
import { buildAndSignSwapTransaction, getKeypairFromPrivateKey } from '../../services/solana';
import { ToastProps } from '../../components/Common/Toast/types';
import { RefObject } from 'react';

export const MIN_AMOUNT = "0.0001";
export const DEFAULT_AMOUNT = "0.0001";
export const QUOTE_DEBOUNCE_MS = 500;

export const fetchTradeQuote = async (
    amount: string,
    fromCoin: Coin | null,
    toCoin: Coin | null,
    setQuoteLoading: (loading: boolean) => void,
    setToAmount: (amount: string) => void,
    setExchangeRate: (rate: string) => void,
    setTradeDetails: (details: { estimatedFee: string; spread: string; gasFee: string; }) => void,
    errorLogged: RefObject<string[]>
): Promise<void> => {
    if (!amount || !fromCoin || !toCoin) {
        return;
    }

    try {
        setQuoteLoading(true);
        const quote = await api.getTradeQuote(fromCoin.id, toCoin.id, amount);

        // Extract values from the quote response
        const {
            to_amount = '0',
            exchange_rate = '0',
            estimated_fee = '0',
            spread_amount = '0',
            gas_fee = '0'
        } = quote as any;

        setToAmount(to_amount);
        setExchangeRate(exchange_rate);
        setTradeDetails({
            estimatedFee: estimated_fee,
            spread: spread_amount,
            gasFee: gas_fee
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (!errorLogged.current.includes(errorMessage)) {
            console.error('❌ Error fetching trade quote:', errorMessage);
            errorLogged.current.push(errorMessage);
        }
    } finally {
        setQuoteLoading(false);
    }
};

export const handleSwapCoins = (
    fromCoin: Coin | null,
    toCoin: Coin | null,
    setFromCoin: (coin: Coin | null) => void,
    setToCoin: (coin: Coin | null) => void,
    fromAmount: string,
    setFromAmount: (amount: string) => void,
    toAmount: string,
    setToAmount: (amount: string) => void
): void => {
    setFromCoin(toCoin);
    setToCoin(fromCoin);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
};

export const handleTrade = async (
    fromCoin: Coin | null,
    toCoin: Coin | null,
    fromAmount: string,
    toAmount: string,
    setIsSubmitting: (submitting: boolean) => void,
    showToast: (params: ToastProps) => void,
    navigate: (screen: string) => void
): Promise<void> => {
    if (!fromCoin || !toCoin || !fromAmount || !toAmount) {
        showToast({
            type: 'error',
            message: 'Please select coins and enter an amount'
        });
        return;
    }

    try {
        setIsSubmitting(true);

        // Get keypair from private key
        const keypair = getKeypairFromPrivateKey(process.env.TEST_PRIVATE_KEY || '');

        // Build and sign the swap transaction
        const txHash = await buildAndSignSwapTransaction(
            keypair,
            fromCoin,
            toCoin,
            parseFloat(fromAmount) * LAMPORTS_PER_SOL,
            parseFloat(toAmount) * LAMPORTS_PER_SOL
        );

        showToast({
            type: 'success',
            message: 'Trade executed successfully! 🎉',
            txHash
        });

        // Navigate back to home screen
        navigate('Home');
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Trade error:', errorMessage);
        showToast({
            type: 'error',
            message: `Trade failed: ${errorMessage}`
        });
    } finally {
        setIsSubmitting(false);
    }
}; 