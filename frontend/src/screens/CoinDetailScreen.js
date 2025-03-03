import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PriceChart from '../components/PriceChart';
import { secureStorage } from '../utils/solanaWallet';

const defaultIcon = 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png';

const CoinDetailScreen = ({ route, navigation }) => {
  const { coin, coins } = route.params;
  const [isLoading, setIsLoading] = useState(true);
  const [chartData, setChartData] = useState([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState('1D');
  const [wallet, setWallet] = useState(null);

  // Return coin icon URL or fallback to default
  const getIconUrl = useCallback(() => {
    return coin.icon_url || coin.iconUrl || defaultIcon;
  }, [coin]);

  // Generate mock chart data based on selected timeframe
  const generateMockChartData = useCallback((timeframe) => {
    const numPoints = timeframe === '1D' ? 24 : timeframe === '1W' ? 7 : timeframe === '1M' ? 30 : 12;
    const data = [];
    let baseValue = coin.price || 100;
    for (let i = 0; i < numPoints; i++) {
      const randomChange = (Math.random() - 0.5) * 0.1;
      baseValue = baseValue * (1 + randomChange);
      let label = '';
      if (timeframe === '1D') label = `${i}h`;
      else if (timeframe === '1W') label = `Day ${i + 1}`;
      else if (timeframe === '1M') label = `Week ${Math.floor(i / 7) + 1}`;
      else label = `Month ${i + 1}`;
      data.push({ value: baseValue, label: i % 4 === 0 ? label : '' });
    }
    return data;
  }, [coin.price]);

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
    setChartData(generateMockChartData(selectedTimeframe));
    setIsLoading(false);
  }, [selectedTimeframe, generateMockChartData]);

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
          <Text style={styles.price}>${coin.price || 'N/A'}</Text>
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

        {/* Price Chart */}
        <PriceChart
          data={chartData}
          loading={isLoading}
          color="#6A5ACD"
          onTimeframeChange={setSelectedTimeframe}
        />

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
  container: { flex: 1, backgroundColor: '#1A1A2E' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 24 },
  header: { flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 24 },
  backButton: { padding: 8, borderRadius: 8, backgroundColor: '#262640', marginRight: 16 },
  coinHeader: { flexDirection: 'row', alignItems: 'center' },
  coinIcon: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  coinInfo: { justifyContent: 'center' },
  coinName: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  coinSymbol: { fontSize: 14, color: '#9F9FD5' },
  priceContainer: { backgroundColor: '#262640', borderRadius: 12, padding: 16, marginBottom: 16 },
  priceLabel: { fontSize: 14, color: '#9F9FD5', marginBottom: 4 },
  price: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 8 },
  priceChangeContainer: { flexDirection: 'row', alignItems: 'center' },
  priceChangeText: { fontSize: 16, fontWeight: '500', marginLeft: 4 },
  descriptionContainer: { backgroundColor: '#262640', borderRadius: 12, padding: 16, marginVertical: 16 },
  descriptionTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 8 },
  descriptionText: { fontSize: 14, lineHeight: 22, color: '#E0E0E0' },
  actionButtonsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  actionButton: { flex: 1, borderRadius: 12, padding: 16, alignItems: 'center', marginHorizontal: 8 },
  buyButton: { backgroundColor: '#4CAF50' },
  sellButton: { backgroundColor: '#F44336' },
  actionButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
});

export default CoinDetailScreen;
