import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';

/**
 * CoinCard component for displaying individual coins
 * 
 * @param {Object} props
 * @param {Object} props.coin - Coin data object
 * @param {string} props.coin.symbol - Coin symbol
 * @param {string} props.coin.name - Coin name
 * @param {string} props.coin.id - Coin ID
 * @param {number} props.coin.price - Current price
 * @param {number} props.coin.price_change_24h - 24h price change percentage
 * @param {number} props.coin.balance - User's balance of this coin (optional)
 * @param {Function} props.onPress - Function to call when card is pressed
 */
const CoinCard = ({ coin, onPress }) => {
  // Default to SOL logo if no icon URL is provided
  const DEFAULT_LOGO = 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png';
  const logoUrl = coin.iconUrl || DEFAULT_LOGO;

  // Format price for display
  const formatPrice = (price) => {
    if (!price) return '$0.00';

    // Handle different price magnitudes
    if (price >= 1000) {
      return `$${Number(price).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
    } else if (price >= 1) {
      return `$${Number(price).toFixed(2)}`;
    } else if (price >= 0.01) {
      return `$${Number(price).toFixed(4)}`;
    } else {
      return `$${Number(price).toExponential(2)}`;
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(coin)}
    >
      <View style={styles.leftSection}>
        <Image
          source={{ uri: logoUrl }}
          style={styles.logo}
        // Remove the defaultSource prop since we're using a default URL
        />
        <View style={styles.nameSection}>
          <Text style={styles.symbol}>{coin.symbol}</Text>
          <Text style={styles.name} numberOfLines={1}>{coin.name || coin.symbol}</Text>
        </View>
      </View>

      <View style={styles.rightSection}>
        <Text style={styles.price}>{formatPrice(coin.price)}</Text>
        {coin.priceChange24h && (
          <Text style={[
            styles.priceChange,
            coin.priceChange24h >= 0 ? styles.positive : styles.negative
          ]}>
            {coin.priceChange24h >= 0 ? '↑' : '↓'} {Math.abs(coin.priceChange24h).toFixed(2)}%
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#333355',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 3,
  },
  rightSection: {
    alignItems: 'flex-end',
    flex: 1,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#4A4A6A',
  },
  nameSection: {
    justifyContent: 'center',
  },
  symbol: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  name: {
    color: '#9F9FD5',
    fontSize: 14,
    marginTop: 2,
  },
  price: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  priceChange: {
    fontSize: 14,
    fontWeight: '500',
  },
  positive: {
    color: '#4CAF50',
  },
  negative: {
    color: '#F44336',
  },
});

export default CoinCard; 
