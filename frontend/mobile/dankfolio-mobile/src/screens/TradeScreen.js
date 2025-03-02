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
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getKeypairFromPrivateKey } from '../utils/solanaWallet';

// Small default amount for safety
const DEFAULT_AMOUNT = "0.001";

const TradeScreen = ({ route, navigation }) => {
  const { wallet } = route.params;
  const [isLoading, setIsLoading] = useState(false);
  const [fromCoin, setFromCoin] = useState('');
  const [toCoin, setToCoin] = useState('');
  const [amount, setAmount] = useState(DEFAULT_AMOUNT);
  const [availableCoins, setAvailableCoins] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Predefined coin list for demo
  const COIN_LIST = [
    { id: 'So11111111111111111111111111111111111111112', name: 'SOL', symbol: 'SOL' },
    { id: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', name: 'USD Coin', symbol: 'USDC' },
    { id: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', name: 'USDT', symbol: 'USDT' },
  ];

  useEffect(() => {
    setAvailableCoins(COIN_LIST);
    if (COIN_LIST.length >= 2) {
      setFromCoin(COIN_LIST[0].id);
      setToCoin(COIN_LIST[1].id);
    }
  }, []);

  const getCoinNameById = (id) => {
    const coin = availableCoins.find(c => c.id === id);
    return coin ? `${coin.name} (${coin.symbol})` : id.substring(0, 8) + '...';
  };

  const handleTradeSubmit = async () => {
    console.log('Trade submit clicked:', { fromCoin, toCoin, amount });
    
    try {
      // Basic validation
      if (!fromCoin || !toCoin || fromCoin === toCoin) {
        console.error('Invalid coins selected');
        return;
      }
      
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        console.error('Invalid amount');
        return;
      }

      // Execute trade directly without confirmation
      try {
        setIsSubmitting(true);
        
        // Create and sign transaction
        console.log('Creating and signing transaction...', {
          fromCoin,
          toCoin,
          parsedAmount,
          hasPrivateKey: !!wallet.privateKey
        });

        // Get connection from solanaWallet
        const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
        
        // Convert amount to lamports
        const amountInLamports = Math.floor(parsedAmount * LAMPORTS_PER_SOL);
        
        // Check if input/output is SOL
        const isInputSol = fromCoin === 'So11111111111111111111111111111111111111112';
        const isOutputSol = toCoin === 'So11111111111111111111111111111111111111112';
        
        // Create keypair from private key
        const keypair = getKeypairFromPrivateKey(wallet.privateKey);
        
        const success = await createAndSignSwapTransaction(
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

        if (!success) {
          throw new Error('Failed to create and sign transaction');
        }

        console.log('Transaction completed successfully');
        
        // Reset form
        setAmount(DEFAULT_AMOUNT);
        setIsSubmitting(false);
        
        // Show success message
        Alert.alert(
          'Success',
          'Trade completed successfully!',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        
      } catch (error) {
        console.error('Trade failed:', error);
        setIsSubmitting(false);
        Alert.alert('Error', error.message || 'Failed to complete trade');
      }
    } catch (error) {
      console.error('Trade submission error:', error);
      Alert.alert('Error', 'Failed to submit trade');
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
});

export default TradeScreen; 