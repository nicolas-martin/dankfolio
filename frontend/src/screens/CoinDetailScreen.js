import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PriceChart from '../components/PriceChart';
import { secureStorage } from '../utils/solanaWallet';
import { fetchOHLCVData } from '../services/priceService';

const defaultIcon = 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png';

const timeframes = [
  { label: '15m', value: '15M' },
  { label: '1H', value: '1H' },
  { label: '4H', value: '4H' },
  { label: '1D', value: '1D' },
  { label: '1W', value: '1W' },
];

const CoinDetailScreen = ({ route, navigation }) => {
  const { coin, coins } = route.params;
  const [isLoading, setIsLoading] = useState(true);
  const [chartData, setChartData] = useState([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState('1H');
  const [wallet, setWallet] = useState(null);
  const [priceStats, setPriceStats] = useState({
    high24h: 0,
    low24h: 0,
    volume24h: 0,
  });

  // Return coin icon URL or fallback to default
  const getIconUrl = useCallback(() => {
    return coin.icon_url || coin.iconUrl || defaultIcon;
  }, [coin]);

  const fetchPriceData = useCallback(async (timeframe) => {
    setIsLoading(true);
    try {
      const data = await fetchOHLCVData(coin.id, 'So11111111111111111111111111111111111111112', timeframe);
      if (data.length > 0) {
        setChartData(data);
        // Calculate 24h stats
        const last24h = data.slice(-24);
        if (last24h.length > 0) {
          const high24h = Math.max(...last24h.map(d => d.high));
          const low24h = Math.min(...last24h.map(d => d.low));
          const volume24h = last24h.reduce((sum, d) => sum + d.volume, 0);
          setPriceStats({ high24h, low24h, volume24h });
        }
      }
    } catch (error) {
      console.error('Error fetching price data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [coin.id]);

  // Get coin description or return a default message
  const getCoinDescription = useCallback(() => {
    if (coin.description && coin.description.trim() !== '') {
      return coin.description;
    }
    return `${coin.name} (${coin.symbol}) is a token on the Solana blockchain. Trade this meme token with DankFolio's secure trading platform.`;
  }, [coin]);

  useEffect(() => {
    const loadWallet = async () => {
      try {
        const savedWallet = await secureStorage.getWallet();
        if (savedWallet) setWallet(savedWallet);
      } catch (error) {
        console.error('Error loading wallet:', error);
      }
    };

    loadWallet();
    fetchPriceData(selectedTimeframe);
  }, [selectedTimeframe, fetchPriceData]);

  const formatPrice = (price) => {
    if (!price) return 'N/A';
    return price < 0.01 ? price.toFixed(6) : price.toFixed(2);
  };

  const formatVolume = (volume) => {
    if (!volume) return 'N/A';
    if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`;
    if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`;
    if (volume >= 1e3) return `$${(volume / 1e3).toFixed(2)}K`;
    return `$${volume.toFixed(2)}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.coinHeader}>
            <Image source={{ uri: getIconUrl() }} style={styles.coinIcon} />
            <View style={styles.coinInfo}>
              <Text style={styles.coinName}>{coin.name}</Text>
              <Text style={styles.coinSymbol}>{coin.symbol}</Text>
            </View>
          </View>
        </View>

        {/* Price Info */}
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Current Price</Text>
          <Text style={styles.price}>${formatPrice(coin.price)}</Text>
          {coin.priceChange !== undefined && (
            <View style={styles.priceChangeContainer}>
              <Ionicons
                name={coin.priceChange >= 0 ? "caret-up" : "caret-down"}
                size={16}
                color={coin.priceChange >= 0 ? "#4CAF50" : "#F44336"}
              />
              <Text style={[styles.priceChangeText, { color: coin.priceChange >= 0 ? "#4CAF50" : "#F44336" }]}>
                {Math.abs(coin.priceChange)}% (24h)
              </Text>
            </View>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>24h High</Text>
            <Text style={styles.statValue}>${formatPrice(priceStats.high24h)}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>24h Low</Text>
            <Text style={styles.statValue}>${formatPrice(priceStats.low24h)}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>24h Volume</Text>
            <Text style={styles.statValue}>{formatVolume(priceStats.volume24h)}</Text>
          </View>
        </View>

        {/* Timeframe Selector */}
        <View style={styles.timeframeContainer}>
          {timeframes.map((tf) => (
            <TouchableOpacity
              key={tf.value}
              style={[
                styles.timeframeButton,
                selectedTimeframe === tf.value && styles.timeframeButtonActive
              ]}
              onPress={() => setSelectedTimeframe(tf.value)}
            >
              <Text style={[
                styles.timeframeText,
                selectedTimeframe === tf.value && styles.timeframeTextActive
              ]}>
                {tf.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Price Chart */}
        <View style={styles.chartContainer}>
          {isLoading ? (
            <ActivityIndicator size="large" color="#6A5ACD" />
          ) : (
            <PriceChart
              data={chartData}
              loading={isLoading}
              color="#6A5ACD"
              onTimeframeChange={setSelectedTimeframe}
            />
          )}
        </View>

        {/* Description */}
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionTitle}>About {coin.name}</Text>
          <Text style={styles.descriptionText}>{getCoinDescription()}</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.buyButton]}
            onPress={() =>
              navigation.navigate('Trade', {
                initialFromCoin: 'SOL',
                initialToCoin: coin.symbol,
                wallet,
                coins
              })
            }
          >
            <Text style={styles.actionButtonText}>Buy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.sellButton]}
            onPress={() =>
              navigation.navigate('Trade', {
                initialFromCoin: coin.symbol,
                initialToCoin: 'USDC',
                wallet,
                coins
              })
            }
          >
            <Text style={styles.actionButtonText}>Sell</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0F0F1E' 
  },
  scrollContent: { 
    paddingHorizontal: 16, 
    paddingBottom: 24 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 16, 
    marginBottom: 24 
  },
  backButton: { 
    padding: 8, 
    borderRadius: 8, 
    backgroundColor: '#262640', 
    marginRight: 16 
  },
  coinHeader: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  coinIcon: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    marginRight: 12 
  },
  coinInfo: { 
    justifyContent: 'center' 
  },
  coinName: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#FFFFFF' 
  },
  coinSymbol: { 
    fontSize: 14, 
    color: '#9F9FD5' 
  },
  priceContainer: { 
    backgroundColor: '#262640', 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 16 
  },
  priceLabel: { 
    fontSize: 14, 
    color: '#9F9FD5', 
    marginBottom: 4 
  },
  price: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#FFFFFF', 
    marginBottom: 8 
  },
  priceChangeContainer: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  priceChangeText: { 
    fontSize: 16, 
    fontWeight: '500', 
    marginLeft: 4 
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#262640',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16
  },
  statItem: {
    alignItems: 'center'
  },
  statLabel: {
    fontSize: 12,
    color: '#9F9FD5',
    marginBottom: 4
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  timeframeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    backgroundColor: '#262640',
    borderRadius: 12,
    padding: 8
  },
  timeframeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8
  },
  timeframeButtonActive: {
    backgroundColor: '#6A5ACD'
  },
  timeframeText: {
    color: '#9F9FD5',
    fontSize: 14,
    fontWeight: '500'
  },
  timeframeTextActive: {
    color: '#FFFFFF'
  },
  chartContainer: {
    backgroundColor: '#262640',
    borderRadius: 12,
    padding: 16,
    height: 300,
    marginBottom: 16,
    justifyContent: 'center'
  },
  descriptionContainer: { 
    backgroundColor: '#262640', 
    borderRadius: 12, 
    padding: 16, 
    marginVertical: 16 
  },
  descriptionTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#FFFFFF', 
    marginBottom: 8 
  },
  descriptionText: { 
    fontSize: 14, 
    lineHeight: 22, 
    color: '#E0E0E0' 
  },
  actionButtonsContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: 16 
  },
  actionButton: { 
    flex: 1, 
    borderRadius: 12, 
    padding: 16, 
    alignItems: 'center', 
    marginHorizontal: 8 
  },
  buyButton: { 
    backgroundColor: '#4CAF50' 
  },
  sellButton: { 
    backgroundColor: '#F44336' 
  },
  actionButtonText: { 
    color: '#FFFFFF', 
    fontWeight: 'bold', 
    fontSize: 16 
  },
});

export default CoinDetailScreen;
