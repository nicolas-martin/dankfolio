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
import { createAndSignSwapTransaction } from '../utils/solanaWallet';
import api from '../services/api';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getKeypairFromPrivateKey } from '../utils/solanaWallet';

// Minimum amount that works with the Raydium API (in SOL)
const MIN_AMOUNT = "0.0001";
// Default amount for new trades
const DEFAULT_AMOUNT = "0.0001";

// Add debounce time constant
const QUOTE_DEBOUNCE_MS = 500;

// Custom Notification Component
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

// Create a memoized input component to prevent unnecessary re-renders
const AmountInput = memo(({ value, onChangeText, onFocus, inputRef }) => {
  return (
    <TextInput
      style={styles.amountInput}
      value={value}
      onChangeText={onChangeText}
      placeholder="0.00"
      placeholderTextColor="#9F9FD5"
      selectionColor="#6A5ACD"
      ref={inputRef}
      onFocus={onFocus}
      // These props help with input behavior, especially on web
      autoCorrect={false}
      spellCheck={false}
      autoCapitalize="none"
      // Critical for web - prevent default behavior that might cause focus loss
      onBlur={(e) => e.preventDefault()}
      // Use the appropriate keyboard type based on platform
      keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
    />
  );
});

const TradeScreen = ({ route, navigation }) => {
  const { initialFromCoin, initialToCoin, wallet, coins } = route.params || {};

  // Add ref for input focus management
  const amountInputRef = useRef(null);

  const [isLoading, setIsLoading] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [fromCoin, setFromCoin] = useState('');
  const [toCoin, setToCoin] = useState('');
  const [fromAmount, setFromAmount] = useState(DEFAULT_AMOUNT);
  const [toAmount, setToAmount] = useState('');
  const [availableCoins, setAvailableCoins] = useState(coins || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [exchangeRate, setExchangeRate] = useState('');
  const [tradeDetails, setTradeDetails] = useState({
    estimatedFee: '0.00',
    spread: '0.00',
    gasFee: '0.00',
  });

  // Notification state
  const [notification, setNotification] = useState({
    show: false,
    type: 'info', // 'success', 'error', 'warning', 'info'
    message: '',
  });

  // Helper function to show notifications
  const showNotification = (type, message) => {
    setNotification({
      show: true,
      type,
      message,
    });

    // Auto-hide notification after 5 seconds
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 5000);
  };

  const debounceTimerRef = useRef(null);

  const fetchTradeQuote = async (amount, fromId, toId, trigger = 'Manual input') => {
    if (!amount || !fromId || !toId) {
      console.log('❌ [TradeScreen] Missing required parameters:', { amount, fromId, toId });
      return null;
    }

    console.log('🔍 [TradeScreen] Fetching quote:', {
      source: 'TradeScreen.fetchTradeQuote',
      trigger,
      params: { amount, fromId, toId }
    });

    try {
      const numAmount = parseFloat(amount);
      if (numAmount < parseFloat(MIN_AMOUNT)) {
        showNotification('warning', `Minimum trade amount is ${MIN_AMOUNT} SOL`);
        return null;
      }

      const response = await api.getTradeQuote(fromId, toId, amount);
      
      console.log('📊 [TradeScreen] Quote response:', {
        source: 'TradeScreen.fetchTradeQuote',
        response
      });

      // Update UI with the fresh quote
      setToAmount(response.estimatedAmount);
      setExchangeRate(`${response.exchangeRate} ${getCoinById(toCoin)?.symbol || ''}`);
      
      // Set all fees from the nested fee object
      setTradeDetails({
        estimatedFee: String(response.fee?.total || '0.00'),
        spread: String(response.fee?.spread || '0.00'),
        gasFee: String(response.fee?.gas || '0.00')
      });
      
      console.log('✅ [TradeScreen] Updated UI with fees:', {
        source: 'TradeScreen.fetchTradeQuote',
        fees: response.fee
      });

      return response;
    } catch (error) {
      console.error('❌ [TradeScreen] Error fetching quote:', {
        source: 'TradeScreen.fetchTradeQuote',
        error: error.message
      });
      
      if (error.data?.error?.includes('INSUFFICIENT_LIQUIDITY')) {
        showNotification('error', 'Insufficient liquidity for this trade amount');
      } else if (error.data?.error?.includes('REQ_AMOUNT_ERROR')) {
        showNotification('error', `Minimum trade amount is ${MIN_AMOUNT} SOL`);
      }
      
      return null;
    }
  };

  useEffect(() => {
    if (coins?.length > 0) {
      console.log('Route params:', route.params);
      console.log('Available coins from home:', coins);
      setAvailableCoins(coins);
      initializeCoins();
    } else {
      console.error('No coins provided from home screen');
      showNotification('error', 'Error loading coins');
    }
  }, [coins, initialFromCoin, initialToCoin]);

  const initializeCoins = () => {
    if (availableCoins.length < 2) return;

    console.log('🔄 [TradeScreen] Initializing coins:', { 
      source: 'TradeScreen.initializeCoins',
      initialFromCoin, 
      initialToCoin 
    });

    let newFromCoin = '';
    let newToCoin = '';

    // Set the from coin based on initialFromCoin
    if (initialFromCoin) {
      const fromCoinObj = availableCoins.find(c => c.symbol === initialFromCoin);
      if (fromCoinObj) {
        newFromCoin = fromCoinObj.id;
        setFromCoin(fromCoinObj.id);
        console.log('✅ [TradeScreen] Set fromCoin:', { 
          symbol: fromCoinObj.symbol, 
          id: fromCoinObj.id 
        });
      }
    }

    // Set the to coin based on initialToCoin
    if (initialToCoin) {
      const toCoinObj = availableCoins.find(c => c.symbol === initialToCoin);
      if (toCoinObj) {
        newToCoin = toCoinObj.id;
        setToCoin(toCoinObj.id);
        console.log('✅ [TradeScreen] Set toCoin:', { 
          symbol: toCoinObj.symbol, 
          id: toCoinObj.id 
        });
      }
    }

    // Only fetch quote if we have both coins and a valid amount
    if (newFromCoin && newToCoin && fromAmount) {
      // Use the actual fromAmount instead of DEFAULT_AMOUNT
      console.log('🔄 [TradeScreen] Initial quote fetch:', {
        source: 'TradeScreen.initializeCoins',
        fromAmount,
        fromCoin: newFromCoin,
        toCoin: newToCoin
      });
      
      // Don't use debounce for initial fetch
      fetchTradeQuote(fromAmount, newFromCoin, newToCoin);
    }
  };

  const getCoinById = (id) => {
    return availableCoins.find(c => c.id === id);
  };

  const handleAmountChange = useCallback((text) => {
    // Remove any non-numeric characters except decimal point
    const sanitized = text.replace(/[^\d.]/g, '');

    // Ensure only one decimal point
    const parts = sanitized.split('.');
    const formattedValue = parts[0] + (parts.length > 1 ? '.' + parts[1] : '');

    // Update the input value
    setFromAmount(formattedValue);

    // Don't proceed if we don't have valid coins selected
    if (!fromCoin || !toCoin) {
      console.log('⚠️ [TradeScreen] Coins not selected yet');
      return;
    }

    // Clear any existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Show loading state
    setQuoteLoading(true);

    // Debounce the quote fetch
    debounceTimerRef.current = setTimeout(async () => {
      try {
        await fetchTradeQuote(formattedValue, fromCoin, toCoin, 'Amount change');
      } catch (error) {
        console.error('Error in handleAmountChange:', error);
        showNotification('error', 'Failed to get quote');
      } finally {
        setQuoteLoading(false);
      }
    }, QUOTE_DEBOUNCE_MS);
  }, [fromCoin, toCoin]);

  const handleSwapCoins = () => {
    console.log('🔄 [TradeScreen] Swapping coins:', {
      source: 'TradeScreen.handleSwapCoins',
      fromCoin,
      toCoin,
      fromAmount,
      toAmount
    });

    // Store current values before swap
    const oldFromAmount = fromAmount;
    const oldToAmount = toAmount;
    const oldFromCoin = fromCoin;
    const oldToCoin = toCoin;

    // Swap the coins
    setFromCoin(oldToCoin);
    setToCoin(oldFromCoin);

    // Use the previous "to" amount as the new "from" amount and fetch new quote
    if (oldToAmount && parseFloat(oldToAmount) > 0) {
      setFromAmount(oldToAmount);
      fetchTradeQuote(oldToAmount, oldToCoin, oldFromCoin, 'Swap coins');
    } else {
      // If we don't have a valid "to" amount, fetch quote with current amount
      fetchTradeQuote(oldFromAmount, oldToCoin, oldFromCoin, 'Swap coins');
    }
  };

  const handleTradeSubmit = async () => {
    Keyboard.dismiss();
    console.log('Trade submit clicked:', { fromCoin, toCoin, amount: fromAmount });

    if (!fromCoin || !toCoin || fromCoin === toCoin) {
      console.error('Invalid coins selected');
      showNotification('error', 'Please select different coins');
      return;
    }

    if (isNaN(fromAmount) || fromAmount == "") {
      console.error('Invalid amount');
      showNotification('error', 'Please enter a valid amount');
      return;
    }

    // Execute trade
    try {
      setIsSubmitting(true);

      // Create connection to Solana mainnet with better RPC endpoint
      // USE AN ENV VARIABLE HERE
      const connection = new Connection('https://api.mainnet-beta.solana.com', {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 60000, // 60 seconds
      });

      // Convert amount to lamports
      // TODO: It's not always SOLANA. We have to ge the decimals from the coin object
      const amountInLamports = Math.floor(parsedAmount * LAMPORTS_PER_SOL);

      // Check if input/output is SOL
      const isInputSol = fromCoin === 'So11111111111111111111111111111111111111112';
      const isOutputSol = toCoin === 'So11111111111111111111111111111111111111112';

      // Create keypair from private key
      const keypair = getKeypairFromPrivateKey(wallet.privateKey);

      console.log('Creating and signing transaction...', {
        fromCoinId: fromCoin,
        toCoinId: toCoin,
        amount: parsedAmount,
        hasWallet: !!keypair
      });

      // Create and sign the swap transaction
      const signedTransaction = await createAndSignSwapTransaction(
        connection,
        keypair,
        fromCoin,
        toCoin,
        amountInLamports,
        // TODO: Make slippage configurable
        1, // 1% slippage
        isInputSol,
        isOutputSol,
        null, // Let the function handle ATA
        null, // Let the function handle ATA
        'V0'  // Use versioned transactions
      );

      if (!signedTransaction) {
        throw new Error('Failed to create and sign transaction');
      }

      console.log('Transaction signed successfully, length:', signedTransaction?.length);

      // Find coin symbols for better logging
      const fromCoinSymbol = getCoinById(fromCoin)?.symbol || 'Unknown';
      const toCoinSymbol = getCoinById(toCoin)?.symbol || 'Unknown';

      try {
        // Send the signed transaction to our backend for execution
        console.log('Sending trade to backend for execution...');
        const result = await api.executeTrade(
          fromCoin,
          toCoin,
          parsedAmount,
          signedTransaction
        );

        console.log('Trade execution result:', result);

        // Show success message with transaction details
        showNotification(
          'success',
          `Successfully swapped ${parsedAmount} ${fromCoinSymbol} to ${toCoinSymbol}!${result.transaction_hash ? `\n\nTransaction ID: ${result.transaction_hash}` : ''}`
        );
      } catch (apiError) {
        console.error('Backend API error:', apiError);
      }

      setIsSubmitting(false);

      // Navigate back after successful trade
      setTimeout(() => {
        navigation.goBack();
      }, 2000);

    } catch (error) {
      console.error('Trade failed:', error);
      setIsSubmitting(false);

      let errorMessage = 'Failed to complete trade';

      // Enhanced error handling for different error types
      if (error.data?.error) {
        errorMessage = error.data.error;

        // Look for specific Solana errors
        if (errorMessage.includes('address table')) {
          errorMessage = 'Transaction failed: Address Lookup Table issue. Please try again.';
        } else if (errorMessage.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds to complete this transaction.';
        } else if (errorMessage.includes('failed to simulate transaction')) {
          errorMessage = 'Transaction simulation failed. Please try with a different amount.';
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Log detailed error for debugging
      console.error('Detailed error:', {
        message: error.message,
        data: error.data,
        stack: error.stack
      });

      showNotification('error', errorMessage);
    }
  };

  const renderCoinItem = (id, isFrom) => {
    const coin = getCoinById(id);
    if (!coin) return null;

    return (
      <View style={styles.coinItemContainer}>
        <View style={styles.coinDetails}>
          <Image
            source={{ uri: coin.icon_url }}
            style={styles.coinIcon}
          />
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
            <AmountInput
              value={fromAmount}
              onChangeText={handleAmountChange}
              inputRef={amountInputRef}
            />
          ) : (
            <View>
              {quoteLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#6A5ACD" />
                  <Text style={styles.loadingText}>Calculating...</Text>
                </View>
              ) : (
                <Text style={styles.amountText}>{toAmount || '0.00'}</Text>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  const getTradeButtonLabel = () => {
    const fromCoinSymbol = getCoinById(fromCoin)?.symbol || '';
    const toCoinSymbol = getCoinById(toCoin)?.symbol || '';
    return `Swap ${fromCoinSymbol} to ${toCoinSymbol}`;
  };

  if (isLoading && availableCoins.length === 0) {
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
          {/* Header with back button and title */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Exchange</Text>
            <TouchableOpacity style={styles.notificationButton}>
              <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Trade card */}
          <View style={styles.tradeCard}>
            {/* From coin */}
            {renderCoinItem(fromCoin, true)}

            {/* Swap button */}
            <TouchableOpacity style={styles.swapButton} onPress={handleSwapCoins}>
              <View style={styles.swapButtonInner}>
                <Ionicons name="swap-vertical" size={24} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            {/* To coin */}
            {renderCoinItem(toCoin, false)}
          </View>

          {/* Exchange rate */}
          {exchangeRate ? (
            <Text style={styles.exchangeRate}>{exchangeRate}</Text>
          ) : null}

          {/* Fee information */}
          <View style={styles.feeInfoContainer}>
            <View style={styles.feeItem}>
              <Text style={styles.feeLabel}>Estimate fee</Text>
              <Text style={styles.feeValue}>{tradeDetails.estimatedFee} usd</Text>
            </View>
            <View style={styles.feeItem}>
              <Text style={styles.feeLabel}>You will receive</Text>
              <Text style={styles.feeValue}>
                {quoteLoading ?
                  'Calculating...' :
                  `${toAmount} ${getCoinById(toCoin)?.symbol || ''}`
                }
              </Text>
            </View>
            <View style={styles.feeItem}>
              <Text style={styles.feeLabel}>Spread</Text>
              <Text style={styles.feeValue}>{tradeDetails.spread}%</Text>
            </View>
            <View style={styles.feeItem}>
              <Text style={styles.feeLabel}>Gas fee</Text>
              <Text style={styles.feeValue}>{tradeDetails.gasFee} {getCoinById(fromCoin)?.symbol}</Text>
            </View>
          </View>

          {/* Trade details and fees */}
          <View style={styles.tradeDetailsContainer}>
            <Text style={styles.exchangeRateLabel}>Exchange Rate:</Text>
            <Text style={styles.exchangeRateValue}>
              {exchangeRate
                ? `1 ${getCoinById(fromCoin)?.symbol} ≈ ${exchangeRate} ${getCoinById(toCoin)?.symbol}`
                : `Calculating...`
              }
            </Text>

            <View style={styles.feesContainer}>
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>Estimated Fee:</Text>
                <Text style={styles.feeValue}>
                  ${tradeDetails.estimatedFee}
                </Text>
              </View>
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>Price Impact:</Text>
                <Text style={styles.feeValue}>
                  ${tradeDetails.spread}
                </Text>
              </View>
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>Network Fee:</Text>
                <Text style={styles.feeValue}>
                  ${tradeDetails.gasFee}
                </Text>
              </View>
            </View>
          </View>

          {/* Trade button */}
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
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E',
  },
  keyboardAvoidContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingTop: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#262640',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#262640',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tradeCard: {
    backgroundColor: '#262640',
    borderRadius: 16,
    marginBottom: 20,
    padding: 2, // Thin border effect
    position: 'relative',
  },
  coinItemContainer: {
    backgroundColor: '#262640',
    padding: 16,
    borderRadius: 14,
  },
  coinDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  coinIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  coinSymbolContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coinSymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginRight: 4,
  },
  balanceText: {
    fontSize: 14,
    color: '#9F9FD5',
    marginTop: 2,
  },
  amountContainer: {
    marginTop: 4,
  },
  amountInput: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    padding: 0,
  },
  amountText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  swapButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -20,
    zIndex: 10,
  },
  swapButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6A5ACD',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  exchangeRate: {
    textAlign: 'center',
    color: '#9F9FD5',
    fontSize: 14,
    marginBottom: 20,
  },
  feeInfoContainer: {
    backgroundColor: '#262640',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  feeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  feeLabel: {
    color: '#9F9FD5',
    fontSize: 14,
  },
  feeValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  tradeButton: {
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 16,
  },
  tradeButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tradeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  tradeButtonDisabled: {
    opacity: 0.7,
  },
  notification: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  notificationIcon: {
    marginRight: 8,
    fontSize: 16,
  },
  notificationText: {
    color: '#fff',
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 16,
    fontSize: 16,
  },
  tradeDetailsContainer: {
    backgroundColor: '#262640',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  exchangeRateLabel: {
    color: '#9F9FD5',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  exchangeRateValue: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  feesContainer: {
    marginTop: 16,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  debugButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#6A5ACD44',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6A5ACD',
  },
  debugButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  loadingText: {
    marginLeft: 8,
    color: '#9F9FD5',
    fontSize: 16,
  },
});

export default TradeScreen;