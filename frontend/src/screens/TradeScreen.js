import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { createAndSignSwapTransaction, getKeypairFromPrivateKey } from '../utils/solanaWallet';
import api from '../services/api';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';

const MIN_AMOUNT = "0.0001";
const DEFAULT_AMOUNT = "0.0001";
const QUOTE_DEBOUNCE_MS = 500;

const Notification = ({ type, message, onDismiss }) => {
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
};

const AmountInput = memo(({ value, onChangeText, onFocus, inputRef }) => (
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

const TradeScreen = ({ route, navigation }) => {
  const { initialFromCoin, initialToCoin, wallet, coins } = route.params || {};
  const amountInputRef = useRef(null);
  const debounceTimerRef = useRef(null);

  const [fromCoin, setFromCoin] = useState('');
  const [toCoin, setToCoin] = useState('');
  const [fromAmount, setFromAmount] = useState(DEFAULT_AMOUNT);
  const [toAmount, setToAmount] = useState('');
  const [availableCoins, setAvailableCoins] = useState(coins || []);
  const [exchangeRate, setExchangeRate] = useState('');
  const [tradeDetails, setTradeDetails] = useState({
    estimatedFee: '0.00',
    spread: '0.00',
    gasFee: '0.00',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, type: 'info', message: '' });

  const showNotification = (type, message) => {
    setNotification({ show: true, type, message });
    setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 5000);
  };

  const getCoinById = (id) => availableCoins.find(c => c.id === id);

  const fetchTradeQuote = async (amount, fromId, toId, trigger = 'Manual input') => {
    if (!amount || !fromId || !toId) return null;
    const numAmount = parseFloat(amount);
    if (numAmount < parseFloat(MIN_AMOUNT)) {
      showNotification('warning', `Minimum trade amount is ${MIN_AMOUNT} SOL`);
      return null;
    }
    try {
      const response = await api.getTradeQuote(fromId, toId, amount);
      setToAmount(response.estimatedAmount);
      setExchangeRate(`${response.exchangeRate} ${getCoinById(toCoin)?.symbol || ''}`);
      setTradeDetails({
        estimatedFee: String(response.fee?.total || '0.00'),
        spread: String(response.fee?.spread || '0.00'),
        gasFee: String(response.fee?.gas || '0.00'),
      });
      return response;
    } catch (error) {
      const errMsg = error.data?.error || error.message;
      if (errMsg.includes('INSUFFICIENT_LIQUIDITY')) {
        showNotification('error', 'Insufficient liquidity for this trade amount');
      } else if (errMsg.includes('REQ_AMOUNT_ERROR')) {
        showNotification('error', `Minimum trade amount is ${MIN_AMOUNT} SOL`);
      } else {
        showNotification('error', 'Failed to fetch quote');
      }
      return null;
    }
  };

  const initializeCoins = useCallback(() => {
    if (availableCoins.length < 2) return;
    let newFromCoin = '', newToCoin = '';
    if (initialFromCoin) {
      const coinObj = availableCoins.find(c => c.symbol === initialFromCoin);
      if (coinObj) {
        newFromCoin = coinObj.id;
        setFromCoin(coinObj.id);
      }
    }
    if (initialToCoin) {
      const coinObj = availableCoins.find(c => c.symbol === initialToCoin);
      if (coinObj) {
        newToCoin = coinObj.id;
        setToCoin(coinObj.id);
      }
    }
    if (newFromCoin && newToCoin && fromAmount) {
      fetchTradeQuote(fromAmount, newFromCoin, newToCoin);
    }
  }, [availableCoins, initialFromCoin, initialToCoin, fromAmount]);

  useEffect(() => {
    if (coins?.length > 0) {
      setAvailableCoins(coins);
      initializeCoins();
    } else {
      showNotification('error', 'Error loading coins');
    }
  }, [coins, initializeCoins]);

  const handleAmountChange = useCallback((text) => {
    const sanitized = text.replace(/[^\d.]/g, '');
    const parts = sanitized.split('.');
    const formatted = parts[0] + (parts[1] ? '.' + parts[1] : '');
    setFromAmount(formatted);
    if (!fromCoin || !toCoin) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setQuoteLoading(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        await fetchTradeQuote(formatted, fromCoin, toCoin, 'Amount change');
      } catch {
        showNotification('error', 'Failed to get quote');
      } finally {
        setQuoteLoading(false);
      }
    }, QUOTE_DEBOUNCE_MS);
  }, [fromCoin, toCoin]);

  const handleSwapCoins = () => {
    const [oldFromCoin, oldToCoin, oldFromAmount, oldToAmount] = [fromCoin, toCoin, fromAmount, toAmount];
    setFromCoin(oldToCoin);
    setToCoin(oldFromCoin);
    const newAmount = oldToAmount && parseFloat(oldToAmount) > 0 ? oldToAmount : oldFromAmount;
    setFromAmount(newAmount);
    fetchTradeQuote(newAmount, oldToCoin, oldFromCoin, 'Swap coins');
  };

  const handleTradeSubmit = async () => {
    Keyboard.dismiss();
    if (!fromCoin || !toCoin || fromCoin === toCoin) {
      showNotification('error', 'Please select different coins');
      return;
    }
    if (!fromAmount || isNaN(fromAmount)) {
      showNotification('error', 'Please enter a valid amount');
      return;
    }
    try {
      setIsSubmitting(true);
      const connection = new Connection('https://api.mainnet-beta.solana.com', {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 60000,
      });
      const parsedAmount = parseFloat(fromAmount);
      const amountInLamports = Math.floor(parsedAmount * LAMPORTS_PER_SOL);
      const isInputSol = fromCoin === 'So11111111111111111111111111111111111111112';
      const isOutputSol = toCoin === 'So11111111111111111111111111111111111111112';
      const keypair = getKeypairFromPrivateKey(wallet.privateKey);
      const signedTx = await createAndSignSwapTransaction(
        connection,
        keypair,
        fromCoin,
        toCoin,
        amountInLamports,
        1,
        isInputSol,
        isOutputSol,
        null,
        null,
        'V0'
      );
      if (!signedTx) throw new Error('Failed to create and sign transaction');
      const fromCoinSymbol = getCoinById(fromCoin)?.symbol || 'Unknown';
      const toCoinSymbol = getCoinById(toCoin)?.symbol || 'Unknown';
      const result = await api.executeTrade(fromCoin, toCoin, parsedAmount, signedTx);
      showNotification(
        'success',
        `Successfully swapped ${parsedAmount} ${fromCoinSymbol} to ${toCoinSymbol}!` +
          (result.transaction_hash ? `\nTransaction ID: ${result.transaction_hash}` : '')
      );
      setTimeout(() => navigation.goBack(), 2000);
    } catch (error) {
      let errorMessage = 'Failed to complete trade';
      if (error.data?.error) {
        errorMessage = error.data.error;
        if (errorMessage.includes('address table')) {
          errorMessage = 'Transaction failed: Address Lookup Table issue. Please try again.';
        } else if (errorMessage.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds to complete this transaction.';
        } else if (errorMessage.includes('failed to simulate transaction')) {
          errorMessage = 'Transaction simulation failed. Please try a different amount.';
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      showNotification('error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCoinItem = (id, isFrom) => {
    const coin = getCoinById(id);
    if (!coin) return null;
    return (
      <View style={styles.coinItemContainer}>
        <View style={styles.coinDetails}>
          <Image source={{ uri: coin.icon_url }} style={styles.coinIcon} />
          <View>
            <View style={styles.coinSymbolContainer}>
              <Text style={styles.coinSymbol}>{coin.symbol}</Text>
              <Ionicons name="chevron-down" size={16} color="#9F9FD5" />
            </View>
            <Text style={styles.balanceText}>
              Balance: {coin.balance || '0'} {coin.symbol}
            </Text>
          </View>
        </View>
        <View style={styles.amountContainer}>
          {isFrom ? (
            <AmountInput value={fromAmount} onChangeText={handleAmountChange} inputRef={amountInputRef} />
          ) : quoteLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#6A5ACD" />
              <Text style={styles.loadingText}>Calculating...</Text>
            </View>
          ) : (
            <Text style={styles.amountText}>{toAmount || '0.00'}</Text>
          )}
        </View>
      </View>
    );
  };

  const getTradeButtonLabel = () => {
    const fromSymbol = getCoinById(fromCoin)?.symbol || '';
    const toSymbol = getCoinById(toCoin)?.symbol || '';
    return `Swap ${fromSymbol} to ${toSymbol}`;
  };

  if (!availableCoins.length) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#6A5ACD" />
        <Text style={styles.loadingText}>Loading available coins...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidContainer}
      >
        <Pressable style={styles.content} onPress={Keyboard.dismiss}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Exchange</Text>
            <TouchableOpacity style={styles.notificationButton}>
              <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.tradeCard}>
            {renderCoinItem(fromCoin, true)}
            <TouchableOpacity style={styles.swapButton} onPress={handleSwapCoins}>
              <View style={styles.swapButtonInner}>
                <Ionicons name="swap-vertical" size={24} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            {renderCoinItem(toCoin, false)}
          </View>
          {exchangeRate ? <Text style={styles.exchangeRate}>{exchangeRate}</Text> : null}
          <View style={styles.feeInfoContainer}>
            <View style={styles.feeItem}>
              <Text style={styles.feeLabel}>Estimate fee</Text>
              <Text style={styles.feeValue}>{tradeDetails.estimatedFee} usd</Text>
            </View>
            <View style={styles.feeItem}>
              <Text style={styles.feeLabel}>You will receive</Text>
              <Text style={styles.feeValue}>
                {quoteLoading ? 'Calculating...' : `${toAmount} ${getCoinById(toCoin)?.symbol || ''}`}
              </Text>
            </View>
            <View style={styles.feeItem}>
              <Text style={styles.feeLabel}>Spread</Text>
              <Text style={styles.feeValue}>{tradeDetails.spread}%</Text>
            </View>
            <View style={styles.feeItem}>
              <Text style={styles.feeLabel}>Gas fee</Text>
              <Text style={styles.feeValue}>
                {tradeDetails.gasFee} {getCoinById(fromCoin)?.symbol}
              </Text>
            </View>
          </View>
          <View style={styles.tradeDetailsContainer}>
            <Text style={styles.exchangeRateLabel}>Exchange Rate:</Text>
            <Text style={styles.exchangeRateValue}>
              {exchangeRate
                ? `1 ${getCoinById(fromCoin)?.symbol} ≈ ${exchangeRate} ${getCoinById(toCoin)?.symbol}`
                : `Calculating...`}
            </Text>
            <View style={styles.feesContainer}>
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>Estimated Fee:</Text>
                <Text style={styles.feeValue}>${tradeDetails.estimatedFee}</Text>
              </View>
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>Price Impact:</Text>
                <Text style={styles.feeValue}>${tradeDetails.spread}</Text>
              </View>
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>Network Fee:</Text>
                <Text style={styles.feeValue}>${tradeDetails.gasFee}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.tradeButton, isSubmitting && styles.tradeButtonDisabled]}
            onPress={handleTradeSubmit}
            disabled={isSubmitting}
          >
            <LinearGradient
              colors={['#6A5ACD', '#9F9FD5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.tradeButtonGradient}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.tradeButtonText}>{getTradeButtonLabel()}</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Pressable>
      </KeyboardAvoidingView>
      {notification.show && (
        <Notification
          type={notification.type}
          message={notification.message}
          onDismiss={() => setNotification(prev => ({ ...prev, show: false }))}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A2E' },
  keyboardAvoidContainer: { flex: 1 },
  content: { flex: 1, padding: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingTop: 8,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#262640', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
  notificationButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#262640', alignItems: 'center', justifyContent: 'center',
  },
  tradeCard: { backgroundColor: '#262640', borderRadius: 16, marginBottom: 20, padding: 2 },
  coinItemContainer: { backgroundColor: '#262640', padding: 16, borderRadius: 14 },
  coinDetails: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  coinIcon: { width: 36, height: 36, borderRadius: 18, marginRight: 12 },
  coinSymbolContainer: { flexDirection: 'row', alignItems: 'center' },
  coinSymbol: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', marginRight: 4 },
  balanceText: { fontSize: 14, color: '#9F9FD5', marginTop: 2 },
  amountContainer: { marginTop: 4 },
  amountInput: { fontSize: 32, fontWeight: 'bold', color: '#FFFFFF', padding: 0 },
  amountText: { fontSize: 32, fontWeight: 'bold', color: '#FFFFFF' },
  swapButton: { position: 'absolute', top: '50%', left: '50%', marginLeft: -20, marginTop: -20, zIndex: 10 },
  swapButtonInner: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#6A5ACD',
    alignItems: 'center', justifyContent: 'center', shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5,
  },
  exchangeRate: { textAlign: 'center', color: '#9F9FD5', fontSize: 14, marginBottom: 20 },
  feeInfoContainer: { backgroundColor: '#262640', borderRadius: 12, padding: 16, marginBottom: 24 },
  feeItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  feeLabel: { color: '#9F9FD5', fontSize: 14 },
  feeValue: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
  tradeButton: { borderRadius: 28, overflow: 'hidden', marginBottom: 16 },
  tradeButtonGradient: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  tradeButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  tradeButtonDisabled: { opacity: 0.7 },
  notification: {
    position: 'absolute', top: 60, left: 16, right: 16, padding: 16, borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', zIndex: 100, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5,
  },
  notificationIcon: { marginRight: 8, fontSize: 16 },
  notificationText: { color: '#fff', flex: 1 },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  loadingContainer: { flexDirection: 'row', alignItems: 'center' },
  loadingText: { marginLeft: 8, color: '#9F9FD5', fontSize: 16 },
  feeInfoContainer: { backgroundColor: '#262640', borderRadius: 12, padding: 16, marginBottom: 24 },
  tradeDetailsContainer: { backgroundColor: '#262640', borderRadius: 12, padding: 16, marginBottom: 24 },
  exchangeRateLabel: { color: '#9F9FD5', fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  exchangeRateValue: { color: '#FFFFFF', fontSize: 14 },
  feesContainer: { marginTop: 16 },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
});

export default TradeScreen;
