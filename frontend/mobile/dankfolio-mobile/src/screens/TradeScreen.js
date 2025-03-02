import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  Alert, 
  ActivityIndicator, 
  SafeAreaView, 
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { createAndSignSwapTransaction } from '../utils/solanaWallet';
import api from '../services/api';
import { trackTransaction } from '../utils/transactionTracker';
import notificationManager from '../utils/notificationManager';

// Small default amount for safety
const DEFAULT_AMOUNT = "0.001"; // Tiny default amount

const TradeScreen = ({ route, navigation }) => {
  const { wallet } = route.params;
  const [isLoading, setIsLoading] = useState(false);
  const [fromCoin, setFromCoin] = useState('');
  const [toCoin, setToCoin] = useState('');
  const [amount, setAmount] = useState(DEFAULT_AMOUNT);
  const [availableCoins, setAvailableCoins] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [networkStatus, setNetworkStatus] = useState({
    status: 'unknown',
    solPrice: 0,
    averageFee: 0.000005,
  });
  const [tradeEstimate, setTradeEstimate] = useState(null);
  
  // Predefined coin list for demo
  const COIN_LIST = [
    { id: 'So11111111111111111111111111111111111111112', name: 'SOL', symbol: 'SOL' },
    { id: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', name: 'USD Coin', symbol: 'USDC' },
    { id: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', name: 'USDT', symbol: 'USDT' },
    // Add more meme coins as needed
    { id: 'MEME123456789', name: 'Doge Coin', symbol: 'DOGE' },
    { id: 'MEME987654321', name: 'Pepe Coin', symbol: 'PEPE' },
  ];

  useEffect(() => {
    fetchAvailableCoins();
    fetchNetworkStatus();
    
    // Refresh network status every 30 seconds
    const networkStatusInterval = setInterval(fetchNetworkStatus, 30000);
    
    return () => {
      clearInterval(networkStatusInterval);
    };
  }, []);

  const fetchAvailableCoins = async () => {
    try {
      setIsLoading(true);
      // Try to fetch coins from API
      const coins = await api.getAvailableCoins().catch(() => COIN_LIST);
      setAvailableCoins(coins);
      
      // Set default values
      if (coins.length >= 2) {
        setFromCoin(coins[0].id);
        setToCoin(coins[1].id);
      }
    } catch (error) {
      console.error('Error fetching coins:', error);
      // Use predefined list as fallback
      setAvailableCoins(COIN_LIST);
      if (COIN_LIST.length >= 2) {
        setFromCoin(COIN_LIST[0].id);
        setToCoin(COIN_LIST[1].id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNetworkStatus = async () => {
    try {
      const stats = await api.getNetworkStatus();
      
      // Check if network status changed
      if (networkStatus.status !== stats.status) {
        // Notify user of status change via notification manager
        notificationManager.networkAlert(stats.status);
      }
      
      setNetworkStatus(stats);
    } catch (error) {
      console.error('Failed to fetch network status:', error);
    }
  };

  const getCoinNameById = (id) => {
    const coin = availableCoins.find(c => c.id === id);
    return coin ? `${coin.name} (${coin.symbol})` : id.substring(0, 8) + '...';
  };

  const handleTradeSubmit = async () => {
    try {
      // Validate inputs
      if (!fromCoin) {
        Alert.alert('Error', 'Please select a source coin');
        return;
      }
      if (!toCoin) {
        Alert.alert('Error', 'Please select a destination coin');
        return;
      }
      if (fromCoin === toCoin) {
        Alert.alert('Error', 'Source and destination coins must be different');
        return;
      }
      
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        Alert.alert('Error', 'Please enter a valid amount');
        return;
      }
      
      // Check if network status is available before proceeding
      if (networkStatus.status === 'degraded') {
        Alert.alert(
          '⚠️ Network Status Warning',
          'The Solana network is currently experiencing issues. Trades may be delayed or fail. Do you want to proceed anyway?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Proceed Anyway', 
              style: 'destructive',
              onPress: () => showTradeConfirmation(parsedAmount)
            }
          ]
        );
        return;
      }
      
      // If network is ok, proceed directly to confirmation
      showTradeConfirmation(parsedAmount);
    } catch (error) {
      console.error('Trade validation error:', error);
      Alert.alert('❌ Error', 'Failed to validate trade parameters');
    }
  };
  
  // New function to show trade confirmation
  const showTradeConfirmation = (parsedAmount) => {
    // Calculate approximate fee based on network status
    const estimatedFee = networkStatus.averageFee || 0.000005;
    const totalCost = parsedAmount + estimatedFee;
    
    // Get coin names for display
    const fromCoinName = getCoinNameById(fromCoin);
    const toCoinName = getCoinNameById(toCoin);
    
    Alert.alert(
      '⚠️ Real Money Warning',
      `You are about to trade ${parsedAmount} ${fromCoinName} for ${toCoinName} on the Solana mainnet using REAL MONEY.
      \nEstimated network fee: ${estimatedFee} SOL
      \nTotal cost: ${totalCost} SOL
      \nAre you sure you want to proceed?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Proceed',
          onPress: async () => {
            await executeTradeAfterConfirmation(parsedAmount);
          }
        }
      ]
    );
  };

  const executeTradeAfterConfirmation = async (parsedAmount) => {
    let transactionSignature = null;
    let transactionTracker = null;
    
    try {
      setIsSubmitting(true);
      
      // Show processing indicator
      Alert.alert(
        '⏳ Processing Transaction',
        'Your transaction is being prepared and signed. Please wait...',
        [{ text: 'OK' }],
        { cancelable: false }
      );
      
      // Create and sign the transaction locally (now async)
      const signedTransaction = await createAndSignSwapTransaction(
        fromCoin,
        toCoin,
        parsedAmount,
        wallet.privateKey
      );
      
      // Update alert to show submission status
      Alert.alert(
        '📡 Submitting Transaction',
        'Your transaction is being submitted to the network...',
        [{ text: 'OK' }],
        { cancelable: false }
      );
      
      // Send only the signed transaction to the backend
      const result = await api.executeTrade(
        fromCoin,
        toCoin,
        parsedAmount,
        signedTransaction
      );
      
      // Get coin symbols for notification
      const fromSymbol = availableCoins.find(c => c.id === fromCoin)?.symbol || 'Unknown';
      const toSymbol = availableCoins.find(c => c.id === toCoin)?.symbol || 'Unknown';
      
      // Create trade details for notifications
      const tradeDetails = {
        amount: parsedAmount,
        fromCoinId: fromCoin,
        toCoinId: toCoin,
        fromSymbol,
        toSymbol,
        timestamp: new Date().toISOString(),
        transactionId: result.transaction_id || result.signature,
        showAlert: false // Don't show alert from notification manager since we'll handle it manually
      };
      
      // Send trade submitted notification
      await notificationManager.tradeSubmitted(tradeDetails);
      
      // Check if we have a transaction signature
      transactionSignature = result.transaction_id || result.signature;
      
      if (transactionSignature) {
        console.log(`🔄 Tracking transaction confirmation: ${transactionSignature}`);
        
        // Show tracking alert with pending status
        Alert.alert(
          '⏳ Transaction Submitted',
          `Your trade has been submitted to the Solana network and is awaiting confirmation.
          \nThis usually takes 15-30 seconds. You'll receive a notification when complete.`,
          [{ text: 'OK' }]
        );
        
        // Start tracking the transaction
        transactionTracker = trackTransaction(
          transactionSignature,
          // Success callback
          async (confirmedTx) => {
            setIsSubmitting(false);
            
            // Update trade details with confirmation info
            const confirmedTradeDetails = {
              ...tradeDetails,
              confirmationTime: new Date().toISOString(),
              confirmations: confirmedTx.confirmations,
              blockTime: confirmedTx.blockTime,
              showAlert: true // Show alert from notification manager
            };
            
            // Send trade confirmed notification
            await notificationManager.tradeConfirmed(confirmedTradeDetails);
            
            // Show success message with detailed information
            Alert.alert(
              '✅ Trade Confirmed',
              `Your trade of ${parsedAmount} ${fromSymbol} to ${toSymbol} has been confirmed!
              \nTransaction ID: ${transactionSignature}
              \nConfirmations: ${confirmedTx.confirmations}
              \nBlock Time: ${new Date(confirmedTx.blockTime * 1000).toLocaleString()}`,
              [
                { text: 'OK' },
                { text: 'View History', onPress: () => navigation.navigate('History') }
              ]
            );
            
            // Reset form after success
            setAmount(DEFAULT_AMOUNT);
          },
          // Error callback
          async (error) => {
            setIsSubmitting(false);
            
            console.error('Transaction confirmation failed:', error);
            
            // Update trade details with error info
            const failedTradeDetails = {
              ...tradeDetails,
              errorTime: new Date().toISOString(),
              errorMessage: error.message,
              showAlert: true // Show alert from notification manager
            };
            
            // Send trade failed notification
            await notificationManager.tradeFailed(failedTradeDetails);
            
            Alert.alert(
              '⚠️ Transaction Status Unknown',
              `Your trade was submitted but we couldn't confirm its success. 
              \nTransaction ID: ${transactionSignature}
              \nError: ${error.message}
              \nYou can check the status in your transaction history.`,
              [
                { text: 'OK' },
                { text: 'View History', onPress: () => navigation.navigate('History') }
              ]
            );
          },
          // Options
          {
            maxAttempts: 15, // Check for 30 seconds
            interval: 2000, // Every 2 seconds
            confirmationLevel: 1 // Wait for at least 1 confirmation
          }
        );
      } else {
        // No transaction signature, but trade was submitted successfully
        setIsSubmitting(false);
        
        Alert.alert(
          '🎉 Trade Submitted',
          `Your trade of ${parsedAmount} ${fromSymbol} to ${toSymbol} has been submitted successfully!`,
          [
            { text: 'OK' },
            { text: 'View History', onPress: () => navigation.navigate('History') }
          ]
        );
        
        // Reset form after success
        setAmount(DEFAULT_AMOUNT);
      }
    } catch (error) {
      console.error('Trade execution error:', error);
      setIsSubmitting(false);
      
      // More user-friendly error message with categorization
      let errorTitle = '❌ Trade Failed';
      let errorMessage = 'Failed to execute trade';
      
      if (error.message.includes('validation failed')) {
        errorTitle = '❌ Invalid Trade Parameters';
        errorMessage = error.message;
      } else if (error.message.includes('Authentication error')) {
        errorTitle = '🔒 Authentication Required';
        errorMessage = error.message;
      } else if (error.message.includes('Network error')) {
        errorTitle = '📡 Network Error';
        errorMessage = 'Cannot connect to the trading server. Please check your internet connection and try again.';
      } else if (error.message.includes('insufficient funds')) {
        errorTitle = '💰 Insufficient Funds';
        errorMessage = 'You do not have enough funds to complete this trade. Please reduce the amount or add funds to your wallet.';
      } else if (error.response?.data?.error) {
        // Backend API error
        errorMessage = `Server error: ${error.response.data.error}`;
      } else if (error.message) {
        // Client-side error with message
        errorMessage = error.message;
      }
      
      // Get coin symbols for notification 
      let fromSymbol = 'Unknown';
      let toSymbol = 'Unknown';
      
      try {
        fromSymbol = availableCoins.find(c => c.id === fromCoin)?.symbol || 'Unknown';
        toSymbol = availableCoins.find(c => c.id === toCoin)?.symbol || 'Unknown';
      } catch (e) {
        console.error('Error getting coin symbols:', e);
      }
      
      // Send trade failed notification
      notificationManager.tradeFailed({
        amount: parsedAmount,
        fromCoinId: fromCoin,
        toCoinId: toCoin,
        fromSymbol,
        toSymbol,
        timestamp: new Date().toISOString(),
        errorMessage: errorMessage,
        errorTime: new Date().toISOString(),
        showAlert: false // Don't show alert, we'll handle it manually
      });
      
      Alert.alert(errorTitle, errorMessage);
    } finally {
      // Make sure we stop tracking if there was an error but tracking had started
      if (transactionTracker && setIsSubmitting) {
        transactionTracker.stop();
      }
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6A5ACD" />
        <Text style={styles.loadingText}>Loading coins...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>🔄 Trade Memes</Text>
            <Text style={styles.subtitle}>Swap tokens securely</Text>
            
            {/* Network Status Indicator */}
            <View style={[
              styles.networkStatus,
              networkStatus.status === 'healthy' 
                ? styles.networkHealthy 
                : networkStatus.status === 'degraded' 
                  ? styles.networkDegraded 
                  : styles.networkUnknown
            ]}>
              <Text style={styles.networkStatusText}>
                {networkStatus.status === 'healthy' 
                  ? '✅ Network: Healthy' 
                  : networkStatus.status === 'degraded' 
                    ? '⚠️ Network: Degraded' 
                    : '❓ Network: Unknown'}
              </Text>
              {networkStatus.solPrice > 0 && (
                <Text style={styles.networkStatusText}>SOL: ${networkStatus.solPrice.toFixed(2)}</Text>
              )}
            </View>
          </View>
          
          <View style={styles.formContainer}>
            <View style={styles.warningBanner}>
              <Text style={styles.warningTitle}>⚠️ USING REAL MONEY ⚠️</Text>
              <Text style={styles.warningText}>
                This app uses real SOL on Solana mainnet.
                We recommend using small amounts for testing.
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Trade Details</Text>
            
            <Text style={styles.label}>From Coin:</Text>
            <View style={styles.selectContainer}>
              {availableCoins.map(coin => (
                <TouchableOpacity
                  key={coin.id}
                  style={[
                    styles.coinOption,
                    fromCoin === coin.id && styles.selectedCoin
                  ]}
                  onPress={() => setFromCoin(coin.id)}
                >
                  <Text 
                    style={[
                      styles.coinOptionText,
                      fromCoin === coin.id && styles.selectedCoinText
                    ]}
                  >
                    {coin.symbol}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <Text style={styles.label}>To Coin:</Text>
            <View style={styles.selectContainer}>
              {availableCoins.map(coin => (
                <TouchableOpacity
                  key={coin.id}
                  style={[
                    styles.coinOption,
                    toCoin === coin.id && styles.selectedCoin
                  ]}
                  onPress={() => setToCoin(coin.id)}
                >
                  <Text 
                    style={[
                      styles.coinOptionText,
                      toCoin === coin.id && styles.selectedCoinText
                    ]}
                  >
                    {coin.symbol}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <Text style={styles.label}>Amount:</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter amount"
              placeholderTextColor="#999"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />
            
            {/* Trade Summary Section */}
            {fromCoin && toCoin && amount && parseFloat(amount) > 0 && (
              <View style={styles.summaryContainer}>
                <Text style={styles.summaryTitle}>Trade Summary</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>From:</Text>
                  <Text style={styles.summaryValue}>{getCoinNameById(fromCoin)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>To:</Text>
                  <Text style={styles.summaryValue}>{getCoinNameById(toCoin)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Amount:</Text>
                  <Text style={styles.summaryValue}>{amount} {availableCoins.find(c => c.id === fromCoin)?.symbol}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Est. Network Fee:</Text>
                  <Text style={styles.summaryValue}>{networkStatus.averageFee || '0.000005'} SOL</Text>
                </View>
              </View>
            )}
            
            <TouchableOpacity
              style={[
                styles.submitButton,
                (isSubmitting || !fromCoin || !toCoin || !amount) && styles.disabledButton
              ]}
              onPress={handleTradeSubmit}
              disabled={isSubmitting || !fromCoin || !toCoin || !amount}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {fromCoin && toCoin 
                    ? `Swap ${availableCoins.find(c => c.id === fromCoin)?.symbol || 'Token'} to ${availableCoins.find(c => c.id === toCoin)?.symbol || 'Token'}`
                    : 'Submit Trade'
                  }
                </Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
              disabled={isSubmitting}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9F9FD5',
  },
  warningBanner: {
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ff3333',
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 6,
  },
  warningText: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
  },
  formContainer: {
    padding: 20,
    marginHorizontal: 16,
    backgroundColor: '#262640',
    borderRadius: 12,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    color: '#9F9FD5',
    marginBottom: 8,
  },
  selectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  coinOption: {
    backgroundColor: '#3A3A5A',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  selectedCoin: {
    backgroundColor: '#6A5ACD',
  },
  coinOptionText: {
    color: '#fff',
  },
  selectedCoinText: {
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#3A3A5A',
    color: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  summaryContainer: {
    backgroundColor: '#3A3A5A',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    color: '#9F9FD5',
    fontSize: 14,
  },
  summaryValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  securityInfoContainer: {
    backgroundColor: '#2A2A45',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#6A5ACD',
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  securityText: {
    color: '#9F9FD5',
    fontSize: 14,
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: '#6A5ACD',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#4A4A6A',
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#5A5A7A',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  networkStatus: {
    marginTop: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    alignItems: 'center',
  },
  networkHealthy: {
    backgroundColor: 'rgba(46, 204, 113, 0.2)',
    borderWidth: 1,
    borderColor: '#2ecc71',
  },
  networkDegraded: {
    backgroundColor: 'rgba(241, 196, 15, 0.2)',
    borderWidth: 1,
    borderColor: '#f1c40f',
  },
  networkUnknown: {
    backgroundColor: 'rgba(149, 165, 166, 0.2)',
    borderWidth: 1,
    borderColor: '#95a5a6',
  },
  networkStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default TradeScreen; 