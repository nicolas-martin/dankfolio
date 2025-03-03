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
  // Handle both API and mock data formats
  const symbol = coin.symbol || '';
  const name = coin.name || '';
  const price = typeof coin.price === 'number' ? coin.price : 0;
  const priceChange = typeof coin.price_change_24h === 'number' ? coin.price_change_24h : 0;

  const balance = typeof coin.balance === 'number' ? coin.balance : 0;

  // Get icon URL from coin data
  const getIconUrl = () => {
    // If the coin has an icon_url from the API, use that
    if (coin.icon_url) return coin.icon_url;

    // Fallback to Solana logo if no icon URL is provided
    return 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png';
  };

  // Format price based on value
  const formatPrice = (value) => {
    if (value === undefined || value === null) return '$0.00';

    if (value < 0.01) return `$${value.toFixed(6)}`;
    if (value < 1) return `$${value.toFixed(4)}`;
    if (value < 1000) return `$${value.toFixed(2)}`;
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Format balance based on value
  const formatBalance = (value) => {
    if (value === undefined || value === null) return '0';

    if (value < 0.001) return value.toFixed(6);
    if (value < 1) return value.toFixed(4);
    if (value < 1000) return value.toFixed(2);
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(coin)}>
      <View style={styles.leftSection}>
        <Image
          source={{ uri: getIconUrl() }}
          style={styles.icon}
          defaultSource={{ uri: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png' }}
          onError={(e) => console.log('Image failed to load:', e.nativeEvent.error)}
        />
        <View style={styles.nameSection}>
          <Text style={styles.symbol}>{symbol}</Text>
          <Text style={styles.name}>{name}</Text>
        </View>
      </View>

      <View style={styles.rightSection}>
        <Text style={styles.price}>{formatPrice(price)}</Text>
        <View style={styles.detailsRow}>
          <Text
            style={[
              styles.priceChange,
              priceChange >= 0 ? styles.positive : styles.negative
            ]}
          >
            {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
          </Text>
          <Text style={styles.balance}>{formatBalance(balance)} {symbol}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E1E2D',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#2A2A3A',
  },
  nameSection: {
    justifyContent: 'center',
  },
  symbol: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  name: {
    color: '#9F9FD5',
    fontSize: 14,
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  price: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceChange: {
    fontSize: 14,
    marginRight: 8,
  },
  positive: {
    color: '#4CAF50',
  },
  negative: {
    color: '#F44336',
  },
  balance: {
    color: '#9F9FD5',
    fontSize: 14,
  },
});

export default CoinCard; 
