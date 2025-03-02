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
 * @param {number} props.coin.priceChange - 24h price change percentage
 * @param {number} props.coin.balance - User's balance of this coin (optional)
 * @param {Function} props.onPress - Function to call when card is pressed
 */
const CoinCard = ({ coin, onPress }) => {
  // Default icon for coins that don't have specific icons
  const defaultIcon = 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png';
  
  // Get icon based on coin symbol or use default
  const getIconUrl = (symbol) => {
    const lowercaseSymbol = symbol.toLowerCase();
    const iconMapping = {
      sol: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png',
      usdc: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
      usdt: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png',
      btc: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/bitcoin/info/logo.png',
      eth: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
    };
    
    return iconMapping[lowercaseSymbol] || defaultIcon;
  };
  
  // Format price with appropriate decimal places
  const formatPrice = (price) => {
    if (!price && price !== 0) return 'N/A';
    
    if (price < 0.01) return price.toFixed(6);
    if (price < 1) return price.toFixed(4);
    if (price < 10000) return price.toFixed(2);
    return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };
  
  // Format balance
  const formatBalance = (balance) => {
    if (!balance && balance !== 0) return '0.00';
    
    if (balance < 0.01) return balance.toFixed(6);
    if (balance < 1) return balance.toFixed(4);
    return balance.toFixed(2);
  };
  
  // Determine color for price change
  const getPriceChangeColor = (change) => {
    if (!change && change !== 0) return '#ffffff';
    return change >= 0 ? '#4CAF50' : '#F44336';
  };

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={() => onPress(coin)}
      activeOpacity={0.7}
    >
      <View style={styles.leftSection}>
        <Image
          source={{ uri: getIconUrl(coin.symbol) }}
          style={styles.coinIcon}
        />
        <View style={styles.coinInfo}>
          <Text style={styles.coinSymbol}>{coin.symbol}</Text>
          <Text style={styles.coinName}>{coin.name}</Text>
        </View>
      </View>
      
      <View style={styles.rightSection}>
        <Text style={styles.coinPrice}>${formatPrice(coin.price)}</Text>
        
        {coin.priceChange !== undefined && (
          <Text 
            style={[
              styles.priceChange, 
              { color: getPriceChangeColor(coin.priceChange) }
            ]}
          >
            {coin.priceChange >= 0 ? '+' : ''}{coin.priceChange}%
          </Text>
        )}
        
        {coin.balance !== undefined && (
          <Text style={styles.balance}>
            {formatBalance(coin.balance)} {coin.symbol}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#262640',
    borderRadius: 12,
    marginVertical: 6,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  leftSection: {
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
  coinSymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  coinName: {
    fontSize: 14,
    color: '#9F9FD5',
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  coinPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  priceChange: {
    fontSize: 14,
    fontWeight: '500',
  },
  balance: {
    fontSize: 12,
    color: '#9F9FD5',
    marginTop: 2,
  },
});

export default CoinCard; 