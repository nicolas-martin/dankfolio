import React, { useState, useEffect } from 'react';
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

// Small default amount for safety
const DEFAULT_AMOUNT = "0.001";

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

const TradeScreen = ({ route, navigation }) => {
  const initialFromCoin = route.params?.initialFromCoin;
  const initialToCoin = route.params?.initialToCoin;
  const { wallet } = route.params || {};
  
  const [isLoading, setIsLoading] = useState(false);
  const [fromCoin, setFromCoin] = useState('');
  const [toCoin, setToCoin] = useState('');
  const [fromAmount, setFromAmount] = useState(DEFAULT_AMOUNT);
  const [toAmount, setToAmount] = useState('');
  const [availableCoins, setAvailableCoins] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [exchangeRate, setExchangeRate] = useState('');
  const [estimatedFee, setEstimatedFee] = useState('4.28');
  const [spread, setSpread] = useState('0.2');
  const [gasFee, setGasFee] = useState('0.0045');
  
  // Notification state
  const [notification, setNotification] = useState({
    show: false,
    type: 'info', // 'success', 'error', 'warning', 'info'
    message: '',
  });
  
  // Show notification helper
  const showNotification = (type, message) => {
    setNotification({
      show: true,
      type,
      message,
    });
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setNotification(prev => ({...prev, show: false}));
    }, 5000);
  };
  
  // Predefined coin list for demo
  const COIN_LIST = [
    { id: 'So11111111111111111111111111111111111111112', name: 'Solana', symbol: 'SOL', balance: 1.234, price: 148.75 },
    { id: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', name: 'USD Coin', symbol: 'USDC', balance: 156.78, price: 1.00 },
    { id: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', name: 'Tether', symbol: 'USDT', balance: 50.25, price: 1.00 },
    { id: 'BTChTuTGsZSjpKL9P3KjzZ3mJ68jkACkEFEjvGGNn8L', name: 'Bitcoin', symbol: 'BTC', balance: 0.005, price: 58432.87 },
    { id: 'ETHW5opqnkWEs1tmJ3e3vSzh2QeDNANbQVXwQKNrFJM', name: 'Ethereum', symbol: 'ETH', balance: 0.12, price: 3211.56 },
    { id: 'pepeSTrAE2gSn9fB36A8EqaJxYqWJhVqtMBwDR3f43B', name: 'Pepe Coin', symbol: 'PEPE', balance: 1500000, price: 0.000012 },
    { id: 'dogeKOINusdc78aJSn9MefEqWjLntJD32YjFdpkfxGY', name: 'Dogecoin', symbol: 'DOGE', balance: 1250, price: 0.123 },
  ];

  useEffect(() => {
    setAvailableCoins(COIN_LIST);
    
    // Set initial coins based on params or defaults
    if (initialFromCoin && initialToCoin) {
      const fromCoinObj = COIN_LIST.find(c => c.symbol === initialFromCoin);
      const toCoinObj = COIN_LIST.find(c => c.symbol === initialToCoin);
      
      if (fromCoinObj && toCoinObj) {
        setFromCoin(fromCoinObj.id);
        setToCoin(toCoinObj.id);
        calculateConversion(DEFAULT_AMOUNT, fromCoinObj.id, toCoinObj.id);
      } else {
        setDefaultCoins();
      }
    } else {
      setDefaultCoins();
    }
  }, [initialFromCoin, initialToCoin]);

  const setDefaultCoins = () => {
    if (COIN_LIST.length >= 2) {
      setFromCoin(COIN_LIST[0].id);
      setToCoin(COIN_LIST[1].id);
      calculateConversion(DEFAULT_AMOUNT, COIN_LIST[0].id, COIN_LIST[1].id);
    }
  };

  const getCoinById = (id) => {
    return availableCoins.find(c => c.id === id);
  };

  const getIconUrl = (symbol) => {
    if (!symbol) return '';
    
    const lowercaseSymbol = symbol.toLowerCase();
    const iconMapping = {
      sol: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png',
      usdc: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
      usdt: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png',
      btc: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/bitcoin/info/logo.png',
      eth: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
      pepe: 'https://assets.coingecko.com/coins/images/29850/large/pepe-token.jpg?1682922725',
      doge: 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png?1547792256',
    };
    
    return iconMapping[lowercaseSymbol] || '';
  };

  const formatBalance = (balance) => {
    if (!balance && balance !== 0) return '0.00';
    
    if (balance < 0.01) return balance.toFixed(6);
    if (balance < 1) return balance.toFixed(4);
    return balance.toFixed(2);
  };

  const calculateConversion = (amount, fromId, toId) => {
    const from = getCoinById(fromId);
    const to = getCoinById(toId);
    
    if (from && to && !isNaN(parseFloat(amount))) {
      const fromValue = parseFloat(amount) * from.price;
      const converted = fromValue / to.price;
      
      setToAmount(converted.toFixed(converted < 0.01 ? 6 : converted < 1 ? 4 : 2));
      
      // Set exchange rate
      const rate = from.price / to.price;
      setExchangeRate(`1 ${from.symbol} = ${rate.toFixed(rate < 0.01 ? 6 : rate < 1 ? 4 : 2)} ${to.symbol}`);
    } else {
      setToAmount('0');
      setExchangeRate('');
    }
  };

  const handleAmountChange = (text) => {
    setFromAmount(text);
    calculateConversion(text, fromCoin, toCoin);
  };

  const handleSwapCoins = () => {
    const temp = fromCoin;
    setFromCoin(toCoin);
    setToCoin(temp);
    
    // Recalculate the conversion with swapped coins
    calculateConversion(fromAmount, toCoin, temp);
  };
  
  const handleTradeSubmit = async () => {
    Keyboard.dismiss();
    console.log('Trade submit clicked:', { fromCoin, toCoin, amount: fromAmount });
    
    try {
      // Basic validation
      if (!fromCoin || !toCoin || fromCoin === toCoin) {
        console.error('Invalid coins selected');
        showNotification('error', 'Please select different coins');
        return;
      }
      
      const parsedAmount = parseFloat(fromAmount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        console.error('Invalid amount');
        showNotification('error', 'Please enter a valid amount');
        return;
      }

      // Execute trade
      try {
        setIsSubmitting(true);
        
        // Create connection to Solana mainnet with better RPC endpoint
        const connection = new Connection('https://api.mainnet-beta.solana.com', {
          commitment: 'confirmed',
          confirmTransactionInitialTimeout: 60000, // 60 seconds
        });
        
        // Convert amount to lamports
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
        
        // Send the signed transaction to our backend for execution
        console.log('Sending trade to backend for execution...');
        const result = await api.executeTrade(
          fromCoin,
          toCoin,
          parsedAmount,
          signedTransaction
        );
        
        console.log('Trade execution result:', result);
        
        // Reset form
        setFromAmount(DEFAULT_AMOUNT);
        setIsSubmitting(false);
        
        // Show success message with transaction details
        showNotification(
          'success',
          `Successfully swapped ${parsedAmount} ${fromCoinSymbol} to ${toCoinSymbol}!\n\nTransaction ID: ${result.data?.transaction_hash || 'N/A'}`
        );
        
        // Navigate back after successful trade
        setTimeout(() => {
          navigation.goBack();
        }, 2000);
        
      } catch (error) {
        console.error('Trade failed:', error);
        setIsSubmitting(false);
        
        let errorMessage = 'Failed to complete trade';
        
        // Enhanced error handling for different error types
        if (error.response?.data?.error) {
          errorMessage = error.response.data.error;
          
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
          response: error.response?.data,
          stack: error.stack
        });
        
        showNotification('error', errorMessage);
      }
    } catch (e) {
      console.error('Outer error:', e);
      setIsSubmitting(false);
      showNotification('error', 'An unexpected error occurred');
    }
  };

  const renderCoinItem = (id, isFrom) => {
    const coin = getCoinById(id);
    if (!coin) return null;
    
    return (
      <View style={styles.coinItemContainer}>
        <View style={styles.coinDetails}>
          <Image 
            source={{ uri: getIconUrl(coin.symbol.toLowerCase()) }} 
            style={styles.coinIcon} 
          />
          <View>
            <View style={styles.coinSymbolContainer}>
              <Text style={styles.coinSymbol}>{coin.symbol}</Text>
              <Ionicons name="chevron-down" size={16} color="#9F9FD5" />
            </View>
            <Text style={styles.balanceText}>
              Balance: {formatBalance(coin.balance)} {coin.symbol}
            </Text>
          </View>
        </View>
        <View style={styles.amountContainer}>
          {isFrom ? (
            <TextInput
              style={styles.amountInput}
              value={fromAmount}
              onChangeText={handleAmountChange}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor="#9F9FD5"
              selectionColor="#6A5ACD"
            />
          ) : (
            <Text style={styles.amountText}>{toAmount}</Text>
          )}
        </View>
      </View>
    );
  };

  const getTradeButtonLabel = () => {
    const fromCoinSymbol = getCoinById(fromCoin)?.symbol || '';
    const toCoinSymbol = getCoinById(toCoin)?.symbol || '';
    
    if (fromCoinSymbol === 'USDC' || fromCoinSymbol === 'USDT') {
      return `Buy ${toCoinSymbol}`;
    } else if (toCoinSymbol === 'USDC' || toCoinSymbol === 'USDT') {
      return `Sell ${fromCoinSymbol}`;
    }
    
    return `Swap ${fromCoinSymbol} to ${toCoinSymbol}`;
  };

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
              <Text style={styles.feeValue}>{estimatedFee} usd</Text>
            </View>
            <View style={styles.feeItem}>
              <Text style={styles.feeLabel}>You will receive</Text>
              <Text style={styles.feeValue}>{toAmount} {getCoinById(toCoin)?.symbol}</Text>
            </View>
            <View style={styles.feeItem}>
              <Text style={styles.feeLabel}>Spread</Text>
              <Text style={styles.feeValue}>{spread}%</Text>
            </View>
            <View style={styles.feeItem}>
              <Text style={styles.feeLabel}>Gas fee</Text>
              <Text style={styles.feeValue}>{gasFee} {getCoinById(fromCoin)?.symbol}</Text>
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
});

export default TradeScreen; 