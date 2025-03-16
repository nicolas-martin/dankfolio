import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, SafeAreaView, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getKeypairFromPrivateKey, buildAndSignSwapTransaction } from '../utils/solanaWallet';
import api from '../services/api';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Coin } from '../types';
import {
  TradeScreenProps,
  AmountInputProps,
  TradeDetails,
  NotificationState,
  TradeNotificationProps,
  TradeQuoteResponse
} from '../types/trade';

const MIN_AMOUNT = "0.0001";
const DEFAULT_AMOUNT = "0.0001";
const QUOTE_DEBOUNCE_MS = 500;

const Notification: React.FC<TradeNotificationProps> = memo(({ type, message, onDismiss }) => {
  if (!message) return null;
  const bgColor = type === 'success' ? '#4CAF50' : type === 'warning' ? '#FF9800' : '#F44336';
  const icon = type === 'success' ? '✅' : type === 'warning' ? '⚠️' : '❌';
  return (
    <TouchableOpacity
      style={[styles.notification, { backgroundColor: bgColor }]}
      onPress={onDismiss}
      activeOpacity={0.8}
    >
      <Text style={styles.notificationIcon}>{icon}</Text>
      <Text style={styles.notificationText}>{message}</Text>
    </TouchableOpacity>
  );
});

const DEFAULT_ICON =
  'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png';

const getCoinIcon = (coinObj: Coin): string => {
  return coinObj.icon_url || coinObj.iconUrl || DEFAULT_ICON;
};

const AmountInput: React.FC<AmountInputProps> = memo(({ value, onChangeText, onFocus, inputRef }) => (
  <TextInput
    style={styles.amountInput}
    value={value}
    onChangeText={onChangeText}
    placeholder="0.00"
    placeholderTextColor="#9F9FD5"
    selectionColor="#6A5ACD"
    ref={inputRef}
    onFocus={onFocus}
    autoCorrect={false}
    spellCheck={false}
    autoCapitalize="none"
    onBlur={(e) => e.preventDefault()}
    keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
  />
));

const getNotificationStyle = (type: NotificationState['type']) => {
  switch (type) {
    case 'success':
      return styles.notificationSuccess;
    case 'error':
      return styles.notificationError;
    case 'warning':
      return styles.notificationWarning;
    case 'info':
    default:
      return styles.notificationInfo;
  }
};

const TradeScreen: React.FC<TradeScreenProps> = ({ route, navigation }) => {
  const { initialFromCoin, initialToCoin, wallet, coins } = route.params || {};
  const amountInputRef = useRef<TextInput>(null);
  const initializedRef = useRef<boolean>(false);

  const [fromCoin, setFromCoin] = useState<string>('');
  const [toCoin, setToCoin] = useState<string>('');
  const [fromAmount, setFromAmount] = useState<string>(DEFAULT_AMOUNT);
  const [toAmount, setToAmount] = useState<string>('0');
  const [availableCoins, setAvailableCoins] = useState<Coin[]>([]);
  const [exchangeRate, setExchangeRate] = useState<string>('');
  const [tradeDetails, setTradeDetails] = useState<TradeDetails>({
    estimatedFee: '0.00',
    spread: '0.00',
    gasFee: '0.00',
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [quoteLoading, setQuoteLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<NotificationState>({
    visible: false,
    type: 'info',
    message: ''
  });
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotification = useCallback((type: NotificationState['type'], message: string) => {
    setNotification({ visible: true, type, message });
    setTimeout(() => setNotification(prev => ({ ...prev, visible: false })), 5000);
  }, []);

  const getCoinById = (id: string): Coin | undefined => availableCoins.find(c => c.id === id);

  const fetchTradeQuote = useCallback(async (amount: string) => {
    if (!amount || !fromCoin || !toCoin) return;
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    try {
      setQuoteLoading(true);
      const response = await api.getTradeQuote(fromCoin, toCoin, amount);
      const toCoinObj = getCoinById(toCoin);
      if (!toCoinObj) {
        throw new Error('To coin not found');
      }

      const toDecimals = toCoinObj.decimals || 9;
      const estimatedAmountInSol = response.estimatedAmount / Math.pow(10, toDecimals);
      setToAmount(estimatedAmountInSol.toFixed(toDecimals));

      setExchangeRate(`${response.exchangeRate} ${toCoinObj?.symbol || ''}`);
      setTradeDetails({
        estimatedFee: String(response.fee?.total || '0.00'),
        spread: String(response.fee?.spread || '0.00'),
        gasFee: String(response.fee?.gas || '0.00'),
      });
    } catch (error: any) {
      console.error('Error fetching trade quote:', error);
      showNotification('error', error.message || 'Failed to fetch quote');
    } finally {
      setQuoteLoading(false);
    }
  }, [fromCoin, toCoin, showNotification]);

  const initializeCoins = useCallback(async () => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    try {
      const coins = await api.getAvailableCoins();
      setAvailableCoins(coins);

      if (initialFromCoin && initialToCoin) {
        setFromCoin(initialFromCoin.id);
        setToCoin(initialToCoin.id);

        if (fromAmount) {
          await fetchTradeQuote(fromAmount);
        }
      }
    } catch (error) {
      console.error('Error initializing coins:', error);
      showNotification('error', 'Failed to load available coins');
    }
  }, [initialFromCoin, initialToCoin, fromAmount, fetchTradeQuote, showNotification]);

  useEffect(() => {
    initializeCoins();
  }, [initializeCoins]);

  const handleAmountChange = useCallback((text: string) => {
    const sanitized = text.replace(/[^\d.]/g, '');
    const parts = sanitized.split('.');
    const formatted = parts[0] + (parts[1] ? '.' + parts[1] : '');
    setFromAmount(formatted);
    if (!fromCoin || !toCoin) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setQuoteLoading(true);
    fetchTradeQuote(formatted);
  }, [fromCoin, toCoin]);

  const handleSwapCoins = () => {
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
    try {
      setIsSubmitting(true);
      const response = await api.executeTrade(fromCoin, toCoin, fromAmount, 'dummy-signed-tx');
      if (response.success) {
        showNotification('success', 'Trade executed successfully!');
        if (response.txHash) {
          console.log('Transaction hash:', response.txHash);
        }
      } else {
        showNotification('error', response.error || 'Trade failed');
      }
    } catch (error: any) {
      console.error('Error submitting trade:', error);
      showNotification('error', error.message || 'Failed to submit trade');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCoinItem = (coinId: string, isFrom: boolean) => {
    const coin = getCoinById(coinId);
    if (!coin) return null;

    return (
      <View style={styles.coinContainer}>
        <Image
          source={{ uri: getCoinIcon(coin) }}
          style={styles.coinIcon}
          defaultSource={{ uri: DEFAULT_ICON }}
        />
        <View style={styles.coinInfo}>
          <Text style={styles.coinSymbol}>{coin.symbol}</Text>
          <Text style={styles.coinName}>{coin.name}</Text>
        </View>
        <Text style={styles.coinBalance}>
          Balance: {coin.balance?.toFixed(4) || '0.0000'}
        </Text>
      </View>
    );
  };

  const getTradeButtonLabel = (): string => {
    if (isSubmitting) return 'Processing...';
    if (!fromCoin || !toCoin) return 'Select coins';
    if (!fromAmount || parseFloat(fromAmount) <= 0) return 'Enter amount';
    if (fromCoin === toCoin) return 'Select different coins';
    return 'Swap';
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Swap</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.tradeContainer}>
          {/* From Section */}
          <View style={styles.tradeSection}>
            <Text style={styles.label}>From</Text>
            <Pressable
              style={styles.coinSelector}
              onPress={() =>
                navigation.navigate('CoinSelect', {
                  onSelect: setFromCoin,
                  excludeCoinId: toCoin,
                  currentCoinId: fromCoin,
                })
              }
            >
              {fromCoin ? (
                renderCoinItem(fromCoin, true)
              ) : (
                <Text style={styles.placeholderText}>Select coin</Text>
              )}
            </Pressable>
            <AmountInput
              value={fromAmount}
              onChangeText={handleAmountChange}
              inputRef={amountInputRef}
            />
          </View>

          {/* Swap Button */}
          <TouchableOpacity
            style={styles.swapButton}
            onPress={handleSwapCoins}
            disabled={!fromCoin || !toCoin}
          >
            <Ionicons name="swap-vertical" size={24} color="#fff" />
          </TouchableOpacity>

          {/* To Section */}
          <View style={styles.tradeSection}>
            <Text style={styles.label}>To</Text>
            <Pressable
              style={styles.coinSelector}
              onPress={() =>
                navigation.navigate('CoinSelect', {
                  onSelect: setToCoin,
                  excludeCoinId: fromCoin,
                  currentCoinId: toCoin,
                })
              }
            >
              {toCoin ? (
                renderCoinItem(toCoin, false)
              ) : (
                <Text style={styles.placeholderText}>Select coin</Text>
              )}
            </Pressable>
            <View style={styles.toAmountContainer}>
              {quoteLoading ? (
                <ActivityIndicator size="small" color="#6A5ACD" />
              ) : (
                <Text style={styles.toAmount}>{toAmount || '0.00'}</Text>
              )}
            </View>
          </View>

          {/* Trade Details */}
          {fromCoin && toCoin && fromAmount && toAmount && (
            <View style={styles.tradeDetails}>
              <Text style={styles.exchangeRate}>Rate: {exchangeRate}</Text>
              <Text style={styles.feeDetail}>
                Network Fee: {tradeDetails.gasFee} SOL
              </Text>
              <Text style={styles.feeDetail}>
                Price Impact: {tradeDetails.spread}%
              </Text>
            </View>
          )}

          {/* Trade Button */}
          <TouchableOpacity
            style={[
              styles.tradeButton,
              (isSubmitting ||
                !fromCoin ||
                !toCoin ||
                fromCoin === toCoin ||
                !fromAmount ||
                parseFloat(fromAmount) <= 0) &&
                styles.disabledButton,
            ]}
            onPress={handleSubmitTrade}
            disabled={
              isSubmitting ||
              !fromCoin ||
              !toCoin ||
              fromCoin === toCoin ||
              !fromAmount ||
              parseFloat(fromAmount) <= 0
            }
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.tradeButtonText}>{getTradeButtonLabel()}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {notification.visible && (
        <View style={[styles.notification, getNotificationStyle(notification.type)]}>
          <Text style={styles.notificationText}>{notification.message}</Text>
          <TouchableOpacity onPress={() => setNotification(prev => ({ ...prev, visible: false }))}>
            <Text style={styles.notificationText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    padding: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 44,
  },
  tradeContainer: {
    backgroundColor: '#2A2A3E',
    borderRadius: 20,
    padding: 20,
  },
  tradeSection: {
    marginBottom: 20,
  },
  label: {
    color: '#9F9FD5',
    marginBottom: 10,
  },
  coinSelector: {
    backgroundColor: '#1A1A2E',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  coinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coinIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  coinInfo: {
    flex: 1,
  },
  coinSymbol: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  coinName: {
    color: '#9F9FD5',
    fontSize: 12,
  },
  coinBalance: {
    color: '#9F9FD5',
    fontSize: 12,
  },
  placeholderText: {
    color: '#9F9FD5',
  },
  amountInput: {
    backgroundColor: '#1A1A2E',
    borderRadius: 10,
    padding: 15,
    color: '#fff',
    fontSize: 24,
    textAlign: 'right',
  },
  swapButton: {
    backgroundColor: '#6A5ACD',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginVertical: -10,
    zIndex: 1,
  },
  toAmountContainer: {
    backgroundColor: '#1A1A2E',
    borderRadius: 10,
    padding: 15,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  toAmount: {
    color: '#fff',
    fontSize: 24,
  },
  tradeDetails: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#1A1A2E',
    borderRadius: 10,
  },
  exchangeRate: {
    color: '#fff',
    marginBottom: 10,
  },
  feeDetail: {
    color: '#9F9FD5',
    marginBottom: 5,
  },
  tradeButton: {
    backgroundColor: '#6A5ACD',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: {
    opacity: 0.5,
  },
  tradeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  notification: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    zIndex: 1000,
  },
  notificationIcon: {
    marginRight: 10,
    fontSize: 20,
  },
  notificationText: {
    color: '#fff',
    flex: 1,
  },
  notificationSuccess: {
    backgroundColor: '#4CAF50',
  },
  notificationError: {
    backgroundColor: '#F44336',
  },
  notificationWarning: {
    backgroundColor: '#FF9800',
  },
  notificationInfo: {
    backgroundColor: '#2196F3',
  },
});

export default TradeScreen; 