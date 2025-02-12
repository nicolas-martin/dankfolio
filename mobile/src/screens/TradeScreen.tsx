import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { tradeService } from '../services/tradeService';
import { formatCurrency } from '../utils/formatters';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { TradePreview } from '../components/TradePreview';

export const TradeScreen = ({ route, navigation }) => {
  const { coinId, symbol, type, currentPrice } = route.params;
  const { wallet } = useAuth();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  const calculateTotal = () => {
    const quantity = parseFloat(amount) || 0;
    return quantity * currentPrice;
  };

  const handlePreviewTrade = async () => {
    try {
      setLoading(true);
      const preview = await tradeService.previewTrade({
        coinId,
        type,
        amount: parseFloat(amount),
        price: currentPrice,
      });
      setPreviewData(preview);
    } catch (error) {
      Alert.alert('Preview Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmTrade = async () => {
    try {
      setLoading(true);
      await tradeService.executeTrade({
        coinId,
        type,
        amount: parseFloat(amount),
        price: currentPrice,
      });
      Alert.alert('Success', `Successfully ${type === 'buy' ? 'bought' : 'sold'} ${amount} ${symbol}`);
      navigation.navigate('Portfolio');
    } catch (error) {
      Alert.alert('Trade Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {type === 'buy' ? 'Buy' : 'Sell'} {symbol}
      </Text>
      
      <View style={styles.priceInfo}>
        <Text style={styles.label}>Current Price:</Text>
        <Text style={styles.value}>{formatCurrency(currentPrice)}</Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Amount:</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="Enter amount..."
        />
      </View>

      <View style={styles.totalContainer}>
        <Text style={styles.label}>Total:</Text>
        <Text style={styles.value}>{formatCurrency(calculateTotal())}</Text>
      </View>

      {previewData && (
        <TradePreview
          data={previewData}
          onConfirm={handleConfirmTrade}
          onCancel={() => setPreviewData(null)}
        />
      )}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <TouchableOpacity
          style={[
            styles.previewButton,
            { backgroundColor: type === 'buy' ? '#22c55e' : '#ef4444' }
          ]}
          onPress={handlePreviewTrade}
        >
          <Text style={styles.buttonText}>Preview {type === 'buy' ? 'Buy' : 'Sell'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  priceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 8,
  },
  value: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  previewButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 