import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import api from '../services/api';
import { secureStorage } from '../utils/solanaWallet';
import PriceChart from '../components/PriceChart';
import { RootStackParamList } from '../navigation/types';
import { Trade, Wallet } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'History'>;

interface PriceHistoryItem {
  timestamp: string;
  value: number;
}

interface PriceHistoryResponse {
  items: Array<{
    value: string | null;
    unixTime: number | null;
  }>;
}

const HistoryScreen: React.FC<Props> = ({ navigation }) => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryItem[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [selectedToken, setSelectedToken] = useState('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'); // Default to BONK

  useEffect(() => {
    fetchTrades();
    loadWallet();
    fetchPriceHistory('15m'); // Default to 15m timeframe
  }, []);

  const fetchPriceHistory = async (type: string) => {
    try {
      setChartLoading(true);
      const response = await api.getPriceHistory(selectedToken, type) as PriceHistoryResponse;
      if (response?.items) {
        // Transform data for the chart
        const chartData = response.items
          .filter((item): item is { value: string; unixTime: number } => 
            item.value !== null && item.unixTime !== null
          )
          .map(item => ({
            timestamp: new Date(item.unixTime * 1000).toISOString(),
            value: parseFloat(item.value)
          }));
        setPriceHistory(chartData);
      } else {
        setPriceHistory([]);
      }
    } catch (error) {
      console.error('Error fetching price history:', error);
      Alert.alert('Error', 'Failed to fetch price history');
      setPriceHistory([]);
    } finally {
      setChartLoading(false);
    }
  };

  const fetchTrades = async () => {
    try {
      setIsLoading(true);
      const response = await api.getTrades();
      setTrades(response || []);
    } catch (error) {
      console.error('Error fetching trades:', error);
      // For demo, if the endpoint fails, show some sample data
      setTrades([
        {
          id: 'trade_1',
          from_coin_id: 'So11111111111111111111111111111111111111112',
          to_coin_id: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          amount: 0.5,
          fee: 0.0005,
          status: 'completed',
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: 'trade_2',
          from_coin_id: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          to_coin_id: 'MEME123456789',
          amount: 10,
          fee: 0.01,
          status: 'completed',
          created_at: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 'trade_3',
          from_coin_id: 'MEME123456789',
          to_coin_id: 'MEME987654321',
          amount: 5,
          fee: 0.005,
          status: 'failed',
          created_at: new Date(Date.now() - 1800000).toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const loadWallet = async () => {
    try {
      const savedWallet = await secureStorage.getWallet();
      if (savedWallet) {
        setWallet(savedWallet);
      }
    } catch (error) {
      console.error('Error loading wallet:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTrades();
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getCoinSymbol = (coinId: string): string => {
    // This is a simplified version for the demo
    // In a real app, you would likely have a more comprehensive mapping
    const coinMap: Record<string, string> = {
      'So11111111111111111111111111111111111111112': 'SOL',
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
      'MEME123456789': 'DOGE',
      'MEME987654321': 'PEPE',
    };

    return coinMap[coinId] || coinId.substring(0, 6) + '...';
  };

  const renderTradeItem = ({ item }: { item: Trade }) => {
    const fromSymbol = getCoinSymbol(item.from_coin_id);
    const toSymbol = getCoinSymbol(item.to_coin_id);

    return (
      <TouchableOpacity
        style={styles.tradeItem}
        onPress={() => Alert.alert(
          'Trade Details',
          `ID: ${item.id}\nFrom: ${fromSymbol}\nTo: ${toSymbol}\nAmount: ${item.amount}\nFee: ${item.fee}\nStatus: ${item.status}\nDate: ${formatDate(item.created_at)}`
        )}
      >
        <View style={styles.tradeHeader}>
          <Text style={styles.tradeType}>{`${fromSymbol} → ${toSymbol}`}</Text>
          <View style={[
            styles.statusBadge,
            item.status === 'completed' ? styles.statusCompleted :
              item.status === 'failed' ? styles.statusFailed :
                styles.statusPending
          ]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.tradeDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Amount:</Text>
            <Text style={styles.detailValue}>{item.amount} {fromSymbol}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Fee:</Text>
            <Text style={styles.detailValue}>{item.fee}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date:</Text>
            <Text style={styles.detailValue}>{formatDate(item.created_at)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6A5ACD" />
        <Text style={styles.loadingText}>Loading trades...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📜 Trade History</Text>
        <Text style={styles.subtitle}>Your meme trading activity</Text>
      </View>

      <PriceChart
        data={priceHistory}
        timeframe="15m"
        onTimeframeChange={fetchPriceHistory}
      />

      <FlatList
        data={trades}
        renderItem={renderTradeItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No trades found</Text>
            <TouchableOpacity
              style={styles.newTradeButton}
              onPress={() => navigation.navigate('Trade', { wallet })}
            >
              <Text style={styles.buttonText}>Make a Trade</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.buttonText}>Back</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E',
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
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9F9FD5',
  },
  listContent: {
    padding: 20,
  },
  tradeItem: {
    backgroundColor: '#262640',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  tradeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tradeType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusCompleted: {
    backgroundColor: '#4CAF50',
  },
  statusFailed: {
    backgroundColor: '#F44336',
  },
  statusPending: {
    backgroundColor: '#FFC107',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  tradeDetails: {
    backgroundColor: '#1A1A2E',
    borderRadius: 8,
    padding: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    color: '#9F9FD5',
    fontSize: 14,
  },
  detailValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#9F9FD5',
    fontSize: 16,
    marginBottom: 16,
  },
  newTradeButton: {
    backgroundColor: '#6A5ACD',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButton: {
    backgroundColor: '#6A5ACD',
    margin: 20,
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

export default HistoryScreen; 