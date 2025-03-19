import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Coin } from '../types/index';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import TopBar from '../components/TopBar';
import CoinSelector from '../components/CoinSelector';
import SwapButton from '../components/SwapButton';
import TradeDetails from '../components/TradeDetails';
import TradeButton from '../components/TradeButton';
import PriceDisplay from '../components/PriceDisplay';
import api from '../services/api';
import { buildAndSignSwapTransaction, getKeypairFromPrivateKey, secureStorage } from '../services/solana';

const MIN_AMOUNT = "0.0001";
const DEFAULT_AMOUNT = "0.0001";
const QUOTE_DEBOUNCE_MS = 500;

// Default SOL coin data
const DEFAULT_SOL_COIN: Coin = {
  id: 'So11111111111111111111111111111111111111112',
  address: 'So11111111111111111111111111111111111111112', // SOL mint address
  name: 'Solana',
  symbol: 'SOL',
  decimals: 9,
  logo_url: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
  price: 0,
  daily_volume: 0
};

type TradeScreenParams = {
  initialFromCoin: Coin | null;
  initialToCoin: Coin | null;
};

const TradeScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<Record<string, TradeScreenParams>, string>>();
  const { initialFromCoin, initialToCoin } = route.params || {};
  
  const amountInputRef = useRef(null);
  const initializedRef = useRef(false);
  const debounceTimerRef = useRef(null);

  const [fromCoin, setFromCoin] = useState<Coin | null>(DEFAULT_SOL_COIN);
  const [toCoin, setToCoin] = useState<Coin | null>(null);
  const [fromAmount, setFromAmount] = useState(DEFAULT_AMOUNT);
  const [toAmount, setToAmount] = useState('0');
  const [availableCoins, setAvailableCoins] = useState<Coin[]>([DEFAULT_SOL_COIN]);
  const [exchangeRate, setExchangeRate] = useState('');
  const [tradeDetails, setTradeDetails] = useState({
    estimatedFee: '0.00',
    spread: '0.00',
    gasFee: '0.00',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);

  const getCoinById = (id: string): Coin | null => {
    if (id === DEFAULT_SOL_COIN.id) return DEFAULT_SOL_COIN;
    const coin = availableCoins.find(c => c.id === id);
    console.log('🔍 Getting coin by ID:', id, 'Result:', coin?.symbol);
    return coin || null;
  };

  const fetchTradeQuote = useCallback(async (amount: string) => {
    if (!amount || !fromCoin || !toCoin) {
      console.log('❌ Missing required data for quote:', { amount, fromCoin, toCoin });
      return;
    }

    // Validate coin addresses
    const fromAddress = fromCoin?.address || fromCoin?.id;
    const toAddress = toCoin?.address;

    if (!fromAddress || !toAddress) {
      console.log('❌ Invalid coin addresses:', { fromAddress, toAddress });
      return;
    }
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    try {
      setQuoteLoading(true);
      console.log('🔄 Fetching trade quote:', {
        fromAddress,
        toAddress,
        amount
      });
      
      const response = await api.getTradeQuote(
        fromAddress.trim(),
        toAddress.trim(),
        amount
      );
      
      console.log('📊 Trade quote response:', response);
      
      if (!response) {
        throw new Error('No response from trade quote');
      }

      // Use the raw estimatedAmount string from the API
      setToAmount(String(response.estimatedAmount));
      setExchangeRate(`${response.exchangeRate} ${toCoin.symbol || ''}`);
      setTradeDetails({
        estimatedFee: String(response.fee?.total || '0.00'),
        spread: String(response.fee?.spread || '0.00'),
        gasFee: String(response.fee?.gas || '0.00'),
      });
    } catch (error) {
      console.error('❌ Error fetching trade quote:', error);
      setToAmount('0');
      setExchangeRate('');
      setTradeDetails({
        estimatedFee: '0.00',
        spread: '0.00',
        gasFee: '0.00',
      });
    } finally {
      setQuoteLoading(false);
    }
  }, [fromCoin, toCoin]);

  // Initialize coins and fetch available coins on mount
  useEffect(() => {
    const initializeScreen = async () => {
      console.log('🔄 Initializing Trade Screen');
      
      // Initialize available coins first
      if (!initializedRef.current) {
        try {
          console.log('📥 Fetching available coins');
          const coins = await api.getAvailableCoins();
          setAvailableCoins([DEFAULT_SOL_COIN, ...coins]);
          initializedRef.current = true;

          // Set initial coins from navigation params after coins are loaded
          if (initialToCoin) {
            console.log('📥 Setting initial TO coin:', initialToCoin);
            const matchedToCoin = coins.find(c => c.id === initialToCoin.id) || initialToCoin;
            setToCoin(matchedToCoin);
            setFromCoin(DEFAULT_SOL_COIN);
          }
        } catch (error) {
          console.error('❌ Error fetching available coins:', error);
        }
      }
    };

    initializeScreen();
  }, []);

  // Fetch quote when coins or amount changes
  useEffect(() => {
    if (fromCoin && toCoin && fromAmount && parseFloat(fromAmount) > 0) {
      console.log('🔄 Coins or amount changed, fetching quote:', {
        from: fromCoin.symbol,
        to: toCoin.symbol,
        amount: fromAmount
      });
      fetchTradeQuote(fromAmount);
    }
  }, [fromCoin, toCoin, fromAmount, fetchTradeQuote]);

  const handleAmountChange = useCallback((text: string) => {
    const sanitized = text.replace(/[^\d.]/g, '');
    const parts = sanitized.split('.');
    const formatted = parts[0] + (parts[1] ? '.' + parts[1].slice(0, 9) : '');
    
    // Clear any existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set loading state immediately
    setQuoteLoading(true);
    setFromAmount(formatted);

    // Debounce the API call
    debounceTimerRef.current = setTimeout(() => {
      if (parseFloat(formatted) <= 0) {
        console.log('⚠️ Invalid amount for quote:', formatted);
        setQuoteLoading(false);
        setToAmount('0');
      }
    }, QUOTE_DEBOUNCE_MS) as any;

  }, []);

  const handleSwapCoins = () => {
    if (!fromCoin || !toCoin) return;
    
    const oldFromCoin = fromCoin;
    const oldToCoin = toCoin;
    const oldFromAmount = fromAmount;
    const oldToAmount = toAmount;

    setFromCoin(oldToCoin);
    setToCoin(oldFromCoin);
    setFromAmount(oldToAmount);
    setToAmount(oldFromAmount);

    const newAmount = parseFloat(oldToAmount) > 0 ? oldToAmount : oldFromAmount;
    fetchTradeQuote(newAmount);
  };

  const handleSubmitTrade = async () => {
    if (!fromCoin || !toCoin || !fromAmount) {
      console.error('❌ Missing required trade parameters');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Get the wallet from secure storage
      const savedWallet = await secureStorage.getWallet();
      if (!savedWallet) {
        throw new Error('No wallet found');
      }

      // Create a keypair from the private key
      const wallet = getKeypairFromPrivateKey(savedWallet.privateKey);

      const signedTransaction = await buildAndSignSwapTransaction(
        fromCoin.address || fromCoin.id,
        toCoin.address || toCoin.id,
        fromAmount,
        1, // 1% slippage
        wallet
      );

      const response = await api.executeTrade({
        from_coin_id: fromCoin.id,
        to_coin_id: toCoin.id,
        amount: parseFloat(fromAmount),
        private_key: signedTransaction
      });
      
      if (response.data) {
        console.log('✅ Trade executed successfully!');
        console.log('🔗 Transaction Hash:', response.data.transaction_hash);
        console.log('🌐 Explorer URL:', response.data.explorer_url);
      } else if (response.error) {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('❌ Error submitting trade:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTradeButtonLabel = (): string => {
    if (isSubmitting) return 'Processing...';
    if (!fromCoin || !toCoin) return 'Select coins';
    if (!fromAmount || parseFloat(fromAmount) <= 0) return 'Enter amount';
    if (fromCoin.id === toCoin.id) return 'Select different coins';
    return 'Swap';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <TopBar />
      <ScrollView
        style={styles.container}
        bounces={false}
        keyboardShouldPersistTaps="handled"
      >
        {toCoin && (
          <PriceDisplay 
            price={toCoin.price || 0}
            periodChange={0}
            valueChange={0}
            period="24h"
            icon_url={toCoin.logo_url}
            name={toCoin.name}
          />
        )}
        
        <View style={styles.tradeContainer}>
          <CoinSelector
            label="From"
            selectedCoin={fromCoin}
            excludeCoinId={toCoin?.id}
            amount={fromAmount}
            onAmountChange={handleAmountChange}
            onCoinSelect={(id) => {
              const coin = getCoinById(id);
              if (coin) setFromCoin(coin);
            }}
            isInput={true}
            inputRef={amountInputRef}
          />

          <SwapButton
            onPress={handleSwapCoins}
            disabled={!fromCoin || !toCoin}
          />

          <CoinSelector
            label="To"
            selectedCoin={toCoin}
            excludeCoinId={fromCoin?.id}
            amount={toAmount}
            isAmountLoading={quoteLoading}
            onCoinSelect={(id) => {
              const coin = getCoinById(id);
              if (coin) setToCoin(coin);
            }}
          />

          {fromCoin && toCoin && fromAmount && toAmount && (
            <TradeDetails
              exchangeRate={exchangeRate}
              gasFee={tradeDetails.gasFee}
              spread={tradeDetails.spread}
            />
          )}

          <TradeButton
            onPress={handleSubmitTrade}
            isSubmitting={isSubmitting}
            disabled={
              isSubmitting ||
              !fromCoin ||
              !toCoin ||
              fromCoin.id === toCoin.id ||
              !fromAmount ||
              parseFloat(fromAmount) <= 0
            }
            label={getTradeButtonLabel()}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#191B1F',
  },
  container: {
    flex: 1,
    backgroundColor: '#191B1F',
  },
  tradeContainer: {
    backgroundColor: '#2A2A3E',
    borderRadius: 20,
    padding: 20,
    margin: 20,
  },
});

export default TradeScreen; 