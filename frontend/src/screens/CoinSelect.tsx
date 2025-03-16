import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import api from '../services/api';
import { Coin } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'CoinSelect'>;

const CoinSelect: React.FC<Props> = ({ navigation, route }) => {
  const { onSelect, excludeCoinId, currentCoinId } = route.params;
  const [coins, setCoins] = useState<Coin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCoins = async () => {
      try {
        setLoading(true);
        const availableCoins = await api.getAvailableCoins();
        setCoins(availableCoins.filter(coin => coin.id !== excludeCoinId));
        setError(null);
      } catch (err) {
        setError('Failed to load coins');
        console.error('Error fetching coins:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCoins();
  }, [excludeCoinId]);

  const filteredCoins = coins.filter(coin =>
    coin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    coin.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (coinId: string) => {
    onSelect(coinId);
    navigation.goBack();
  };

  const renderItem = ({ item }: { item: Coin }) => (
    <TouchableOpacity
      style={[
        styles.coinItem,
        item.id === currentCoinId && styles.selectedCoin
      ]}
      onPress={() => handleSelect(item.id)}
    >
      <Image
        source={{ uri: item.icon_url }}
        style={styles.coinIcon}
        defaultSource={{ uri: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png' }}
      />
      <View style={styles.coinInfo}>
        <Text style={styles.coinSymbol}>{item.symbol}</Text>
        <Text style={styles.coinName}>{item.name}</Text>
      </View>
      <Text style={styles.coinPrice}>${item.price.toFixed(4)}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Select Coin</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9F9FD5" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search coins..."
          placeholderTextColor="#9F9FD5"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color="#6A5ACD" />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <FlatList
          data={filteredCoins}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A3E',
    margin: 20,
    padding: 10,
    borderRadius: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    color: '#fff',
  },
  listContent: {
    padding: 20,
  },
  coinItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A3E',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  selectedCoin: {
    borderColor: '#6A5ACD',
    borderWidth: 1,
  },
  coinIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  coinInfo: {
    flex: 1,
    marginLeft: 15,
  },
  coinSymbol: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  coinName: {
    color: '#9F9FD5',
    fontSize: 14,
  },
  coinPrice: {
    color: '#fff',
    fontSize: 16,
  },
  loader: {
    flex: 1,
  },
  error: {
    color: '#F44336',
    textAlign: 'center',
    margin: 20,
  },
});

export default CoinSelect; 