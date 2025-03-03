import React, { useState, useEffect } from 'react';
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

const CoinDetailScreen = ({ route, navigation }) => {
  const { coin } = route.params;
  const [isLoading, setIsLoading] = useState(true);
  const [chartData, setChartData] = useState([]);
  const [timeframe, setTimeframe] = useState('1D');
  const [wallet, setWallet] = useState(null);

  // Default icon for coins that don't have specific icons
  const defaultIcon = 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png';

  // Get icon based on coin data
  const getIconUrl = () => {
    // Check both icon_url and iconUrl fields for maximum compatibility
    if (coin.icon_url) {
      return coin.icon_url;
    } else if (coin.iconUrl) {
      return coin.iconUrl;
    }

    // Fallback to default Solana logo
    return defaultIcon;
  };

  // Mock function to generate chart data
  const generateMockChartData = (tf) => {
    const numPoints = tf === '1D' ? 24 : tf === '1W' ? 7 : tf === '1M' ? 30 : 12;
    const mockData = [];
    let baseValue = coin.price || 100;

    for (let i = 0; i < numPoints; i++) {
      // Random fluctuation around the current price
      const randomChange = (Math.random() - 0.5) * 0.1;
      baseValue = baseValue * (1 + randomChange);

      let label = '';
      if (tf === '1D') {
        label = `${i}h`;
      } else if (tf === '1W') {
        label = `Day ${i + 1}`;
      } else if (tf === '1M') {
        label = `Week ${Math.floor(i / 7) + 1}`;
      } else {
        label = `Month ${i + 1}`;
      }

      mockData.push({
        value: baseValue,
        label: i % 4 === 0 ? label : '',
      });
    }

    return mockData;
  };

  useEffect(() => {
    // Load wallet from secure storage
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

    loadWallet();
  }, []);

  useEffect(() => {
    // Simulate API call to fetch chart data
    setIsLoading(true);

    // Simulate network delay
    const timer = setTimeout(() => {
      setChartData(generateMockChartData(timeframe));
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeframe]);

  // Format price with appropriate decimal places
  const formatPrice = (price) => {
    if (!price && price !== 0) return 'N/A';

    if (price < 0.01) return price.toFixed(6);
    if (price < 1) return price.toFixed(4);
    if (price < 10000) return price.toFixed(2);
    return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  // Get coin description or provide default
  const getCoinDescription = () => {
    // Return the description from the API if available
    if (coin.description && coin.description.trim() !== '') {
      return coin.description;
    }
    
    // Default description for coins without description
    return `${coin.name} (${coin.symbol}) is a cryptocurrency token on the Solana blockchain. Trade this meme token with DankFolio's secure and efficient trading platform.`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header with back button and coin info */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.coinHeader}>
            <Image
              source={{ uri: getIconUrl() }}
              style={styles.coinIcon}
            />
            <View style={styles.coinInfo}>
              <Text style={styles.coinName}>{coin.name}</Text>
              <Text style={styles.coinSymbol}>{coin.symbol}</Text>
            </View>
          </View>
        </View>

        {/* Price information */}
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
              <Text
                style={[
                  styles.priceChangeText,
                  { color: coin.priceChange >= 0 ? "#4CAF50" : "#F44336" }
                ]}
              >
                {Math.abs(coin.priceChange)}% (24h)
              </Text>
            </View>
          )}
        </View>

        {/* Price chart */}
        <PriceChart
          data={chartData}
          loading={isLoading}
          color="#6A5ACD"
          onTimeframeChange={setTimeframe}
        />

        {/* Coin description */}
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionTitle}>About {coin.name}</Text>
          <Text style={styles.descriptionText}>
            {getCoinDescription()}
          </Text>
        </View>

        {/* Action buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.buyButton]}
            onPress={() => navigation.navigate('Trade', {
              initialFromCoin: 'SOL',
              initialToCoin: coin.symbol,
              wallet
            })}
          >
            <Text style={styles.actionButtonText}>Buy</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.sellButton]}
            onPress={() => navigation.navigate('Trade', {
              initialFromCoin: coin.symbol,
              initialToCoin: 'USDC',
              wallet
            })}
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
    backgroundColor: '#1A1A2E',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#262640',
    marginRight: 16,
  },
  coinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coinIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  coinInfo: {
    justifyContent: 'center',
  },
  coinName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  coinSymbol: {
    fontSize: 14,
    color: '#9F9FD5',
  },
  priceContainer: {
    backgroundColor: '#262640',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  priceLabel: {
    fontSize: 14,
    color: '#9F9FD5',
    marginBottom: 4,
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  priceChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceChangeText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 4,
  },
  descriptionContainer: {
    backgroundColor: '#262640',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#E0E0E0',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  buyButton: {
    backgroundColor: '#4CAF50',
  },
  sellButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default CoinDetailScreen; 
