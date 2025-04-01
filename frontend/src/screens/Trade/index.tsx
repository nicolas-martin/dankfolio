import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import {
  Box,
  Text,
} from '@gluestack-ui/themed';

import CoinSelector from '../../components/Trade/CoinSelector';
import SwapButton from '../../components/Trade/SwapButton';
import TradeDetails from '../../components/Trade/TradeDetails';
import TradeButton from '../../components/Trade/TradeButton';

import { Coin } from '../../types';
import { TradeScreenParams } from './trade_types';
import { TradeDetailsProps } from '../../components/Trade/TradeDetails/tradedetails_types';

import { usePortfolioStore } from '../../store/portfolio';
import { useToastStore } from '../../store/toast';

import {
  DEFAULT_AMOUNT,
  QUOTE_DEBOUNCE_MS,
  fetchTradeQuote,
  handleSwapCoins,
  handleTrade
} from './trade_scripts';
import { styles } from './trade_styles';

const Trade: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<Record<string, TradeScreenParams>, string>>();
  const { initialFromCoin, initialToCoin } = route.params || {};
  const { wallet } = usePortfolioStore();
  const showToast = useToastStore((state) => state.showToast);

  const amountInputRef = useRef<TextInput>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [fromCoin, setFromCoin] = useState<Coin>(initialFromCoin);
  const [toCoin, setToCoin] = useState<Coin>(initialToCoin);
  const [fromAmount, setFromAmount] = useState(DEFAULT_AMOUNT);
  const [toAmount, setToAmount] = useState('0');
  const [tradeDetails, setTradeDetails] = useState<TradeDetailsProps>({
    exchangeRate: '0',
    gasFee: '0',
    priceImpactPct: '0',
    totalFee: '0'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);

  if (!wallet) {
    return (
      <Box flex={1} bg="$background" justifyContent="center" alignItems="center">
        <Text color="$text" fontSize="$lg">No wallet connected. Please connect a wallet to trade.</Text>
      </Box>
    );
  }

  const getQuote = useCallback((amount: string) => {
    if (parseFloat(amount) === 0) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchTradeQuote(
        amount,
        fromCoin,
        toCoin,
        setQuoteLoading,
        setToAmount,
        setTradeDetails,
      );
    }, QUOTE_DEBOUNCE_MS);
  }, [fromCoin, toCoin]);

  useEffect(() => {
    getQuote(fromAmount);
  }, [fromAmount, fromCoin, toCoin, getQuote]);

  const onSwapPress = useCallback(() => {
    handleSwapCoins(
      fromCoin,
      toCoin,
      setFromCoin,
      setToCoin,
      fromAmount,
      setFromAmount,
      toAmount,
      setToAmount
    );
  }, [fromCoin, toCoin, fromAmount, toAmount]);

  const onTradePress = useCallback(() => {
    handleTrade(
      fromCoin,
      toCoin,
      fromAmount,
      0.5, // 0.5% slippage
      wallet,
      navigation,
      setIsSubmitting
    );
  }, [fromCoin, toCoin, fromAmount, navigation, wallet]);

  const getTradeButtonLabel = (): string => {
    if (isSubmitting) return 'Processing...';
    if (!fromCoin || !toCoin) return 'Select coins';
    if (!fromAmount || parseFloat(fromAmount) <= 0) return 'Enter amount';
    if (fromCoin.id === toCoin.id) return 'Cannot trade same coin';
    return 'Swap';
  };

  return (
    <Box flex={1} bg="$background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView style={styles.scrollView}>
          <Box p="$4">
            {/* From Coin Selector */}
            <CoinSelector
              label="From"
              selectedCoin={fromCoin || undefined}
              amount={fromAmount}
              onAmountChange={setFromAmount}
              onCoinSelect={() => {
                const coin = fromCoin;
                if (coin) {
                  setFromCoin(coin);
                }
              }}
              isInput
              inputRef={amountInputRef as React.RefObject<TextInput>}
            />

            {/* Value Info */}
            {fromCoin && fromAmount && parseFloat(fromAmount) > 0 && (
              <Box my="$2">
                <Text color="$text" fontSize="$lg">
                  ≈ ${(parseFloat(fromAmount) * (fromCoin.price || 0)).toFixed(6)}
                </Text>
                <Text color="$textSecondary" fontSize="$base">
                  1 {fromCoin.symbol} = ${fromCoin.price ? fromCoin.price.toFixed(2) : '0.00'}
                </Text>
              </Box>
            )}

            {/* Swap Button */}
            <SwapButton onPress={onSwapPress} />

            {/* To Coin Selector */}
            <CoinSelector
              label="To"
              selectedCoin={toCoin || undefined}
              amount={toAmount}
              isAmountLoading={quoteLoading}
              onCoinSelect={() => {
                const coin = toCoin;
                if (coin) {
                  setToCoin(coin);
                }
              }}
            />

            {/* Trade Details */}
            <TradeDetails
              exchangeRate={tradeDetails.exchangeRate}
              gasFee={tradeDetails.gasFee}
              priceImpactPct={tradeDetails.priceImpactPct}
              totalFee={tradeDetails.totalFee}
            />

            {/* Trade Button */}
            <TradeButton
              onPress={onTradePress}
              isSubmitting={isSubmitting}
              disabled={!fromCoin || !toCoin || !fromAmount || !toAmount || isSubmitting}
              label={getTradeButtonLabel()}
            />
          </Box>
        </ScrollView>
      </KeyboardAvoidingView>
    </Box>
  );
};

export default Trade;
