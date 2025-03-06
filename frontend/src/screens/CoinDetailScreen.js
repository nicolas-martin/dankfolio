import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Image, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PriceChart from '../components/PriceChart';
import { secureStorage } from '../utils/solanaWallet';
import api from '../services/api';

const defaultIcon = 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png';

const CoinDetailScreen = ({ route, navigation }) => {
  const { coin, coins } = route.params;
  const [isLoading, setIsLoading] = useState(true);
  const [chartData, setChartData] = useState([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState('1H');
  const [wallet, setWallet] = useState(null);
  const [metadata, setMetadata] = useState(null);
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
      const now = Math.floor(Date.now() / 1000);
      const points = 100;
      let durationPerPoint;

      switch (timeframe) {
        case '15m':
          durationPerPoint = 900; // 15 minutes in seconds
          break;
        case '1H':
          durationPerPoint = 3600; // 1 hour in seconds
          break;
        case '4H':
          durationPerPoint = 14400; // 4 hours in seconds
          break;
        case '1D':
          durationPerPoint = 86400; // 1 day in seconds
          break;
        case '1W':
          durationPerPoint = 604800; // 1 week in seconds
          break;
        case '1M':
          durationPerPoint = 2592000; // 1 month in seconds
          break;
        default:
          durationPerPoint = 86400; // 1 day in seconds
      }

      const timeFrom = now - (points * durationPerPoint);

      console.log('⏰ Time range:', {
        timeFrom: new Date(timeFrom * 1000).toISOString(),
        timeTo: new Date(now * 1000).toISOString(),
        uiTimeframe: timeframe,
        timeframe,
        rangeDuration: `${points} data points`
      });

      const response = await api.getPriceHistory(
        coin.address || coin.id,
        timeframe,
        timeFrom,
        now,
        "token"
      );

      console.log('📈 Received price history response:', {
        itemsCount: response?.items?.length,
      });

      if (response?.items?.length > 0) {
        const chartData = response.items
          .filter(item => item.value !== null && item.unixTime !== null)
          .map(item => ({
            timestamp: item.unixTime,
            value: parseFloat(item.value)
          }));

        console.log('📊 Chart Data Mapping:', {
          firstItem: response.items[0],
          mappedFirstItem: chartData[0],
          itemsCount: chartData.length
        });

        setChartData(chartData);

        // Calculate 24h stats from the data
        const values = chartData.map(d => d.value);
        const stats = {
          high24h: Math.max(...values),
          low24h: Math.min(...values),
          volume24h: response.totalVolume || 0
        };
        console.log('📈 Calculated stats:', stats);
        setPriceStats(stats);
      } else {
        console.warn('⚠️ No price data items received');
        setChartData([]);
        setPriceStats({
          high24h: 0,
          low24h: 0,
          volume24h: 0
        });
      }
    } catch (error) {
      console.error('❌ Error in fetchPriceData:', {
        error: error.message,
        coin: coin.address,
        timeframe
      });
      setChartData([]);
      setPriceStats({
        high24h: 0,
        low24h: 0,
        volume24h: 0
      });
    } finally {
      setIsLoading(false);
    }
  }, [coin.address]);

  const fetchMetadata = useCallback(async () => {
    try {
      const data = await api.getCoinMetadata(coin.address || coin.id);
      setMetadata(data);
    } catch (error) {
      console.error('Error fetching metadata:', error);
    }
  }, [coin.address, coin.id]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const savedWallet = await secureStorage.getWallet();
        if (savedWallet) setWallet(savedWallet);
        await fetchMetadata();
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
    fetchPriceData(selectedTimeframe);
  }, [selectedTimeframe, fetchPriceData, fetchMetadata]);

  const formatVolume = (volume) => {
    if (!volume) return 'N/A';
    if (volume >= 1e9) return `${(volume / 1e9).toFixed(2)}B`;
    if (volume >= 1e6) return `${(volume / 1e6).toFixed(2)}M`;
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(2)}K`;
    return `${volume.toFixed(2)}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF"/>
          </TouchableOpacity>
          <View style={styles.coinHeader}>
            <Image source={{ uri: getIconUrl() }} style={styles.coinIcon}/>
            <View style={styles.coinInfo}>
              <Text style={styles.coinName}>{coin.name}</Text>
              <Text style={styles.coinSymbol}>{coin.symbol}</Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>24h High</Text>
            <Text style={styles.statValue}>${priceStats.high24h}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>24h Low</Text>
            <Text style={styles.statValue}>${priceStats.low24h}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>24h Volume</Text>
            <Text style={styles.statValue}>${formatVolume(coin.daily_volume || priceStats.volume24h)}</Text>
          </View>
        </View>

        {/* Tags */}
        {coin.tags && coin.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {coin.tags.map((tag, index) => (
              <View key={index} style={styles.tagBadge}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Price Chart */}
        <View style={styles.chartContainer}>
          {isLoading ? (
            <ActivityIndicator size="large" color="#6A5ACD" />
          ) : (
            <PriceChart
              data={chartData}
              timeframe={selectedTimeframe}
              onTimeframeChange={setSelectedTimeframe}
              tokenLogo={getIconUrl()}
              mintAddress={coin.address || coin.id}
            />
          )}
        </View>

        {/* Metadata Section */}
        {metadata && (
          <View style={styles.metadataContainer}>
            <Text style={styles.metadataTitle}>Token Information</Text>
            <View style={styles.metadataSection}>
              <Text style={styles.metadataSectionTitle}>Links</Text>
              <View style={styles.metadataLinks}>
                {metadata.website && (
                  <TouchableOpacity style={styles.linkButton} onPress={() => Linking.openURL(metadata.website)}>
                    <Ionicons name="globe-outline" size={20} color="#9F9FD5"/>
                    <Text style={styles.linkText}>Website</Text>
                  </TouchableOpacity>
                )}
                {metadata.twitter && (
                  <TouchableOpacity style={styles.linkButton} onPress={() => Linking.openURL(`https://twitter.com/${metadata.twitter}`)}>
                    <Ionicons name="logo-twitter" size={20} color="#9F9FD5"/>
                    <Text style={styles.linkText}>Twitter</Text>
                  </TouchableOpacity>
                )}
                {metadata.discord && (
                  <TouchableOpacity style={styles.linkButton} onPress={() => Linking.openURL(metadata.discord)}>
                    <Ionicons name="logo-discord" size={20} color="#9F9FD5"/>
                    <Text style={styles.linkText}>Discord</Text>
                  </TouchableOpacity>
                )}
                {metadata.telegram && (
                  <TouchableOpacity style={styles.linkButton} onPress={() => Linking.openURL(`https://t.me/${metadata.telegram}`)}>
                    <Ionicons name="paper-plane-outline" size={20} color="#9F9FD5"/>
                    <Text style={styles.linkText}>Telegram</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <View style={styles.metadataSection}>
              <Text style={styles.metadataSectionTitle}>Details</Text>
              <View style={styles.metadataGrid}>
                <View style={styles.metadataItem}>
                  <Text style={styles.metadataLabel}>Symbol</Text>
                  <Text style={styles.metadataValue}>{metadata.symbol?.toUpperCase()}</Text>
                </View>
                <View style={styles.metadataItem}>
                  <Text style={styles.metadataLabel}>Name</Text>
                  <Text style={styles.metadataValue}>{metadata.name}</Text>
                </View>
                <View style={styles.metadataItem}>
                  <Text style={styles.metadataLabel}>Address</Text>
                  <Text style={styles.metadataValue} numberOfLines={1} ellipsizeMode="middle">{metadata.address}</Text>
                </View>
                {metadata.coingecko_id && (
                  <View style={styles.metadataItem}>
                    <Text style={styles.metadataLabel}>CoinGecko ID</Text>
                    <Text style={styles.metadataValue}>{metadata.coingecko_id}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

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
  chartContainer: {
    height: 400,
    backgroundColor: '#262640',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
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
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  tagBadge: {
    backgroundColor: '#262640',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    color: '#9F9FD5',
    fontSize: 12,
    fontWeight: '500',
  },
  metadataContainer: {
    backgroundColor: '#262640',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  metadataTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  metadataSection: {
    marginBottom: 16,
  },
  metadataSectionTitle: {
    fontSize: 14,
    color: '#9F9FD5',
    marginBottom: 8,
  },
  metadataLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
    borderRadius: 8,
    padding: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  linkText: {
    color: '#9F9FD5',
    marginLeft: 6,
    fontSize: 14,
  },
  metadataGrid: {
    flexDirection: 'column',
  },
  metadataItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A2E',
  },
  metadataLabel: {
    color: '#9F9FD5',
    fontSize: 14,
  },
  metadataValue: {
    color: '#FFFFFF',
    fontSize: 14,
    maxWidth: '60%',
  },
});

export default CoinDetailScreen;

