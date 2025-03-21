import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { formatNumber, formatPrice } from '../../../utils/numberFormat';
import { CoinCardProps } from './types';
import { styles } from './styles';

const DEFAULT_LOGO = 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png';

const CoinCard: React.FC<CoinCardProps> = ({ coin, onPress }) => {
  const logoUrl = coin.icon_url || DEFAULT_LOGO;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(coin)}
      testID="coin-card"
    >
      <View style={styles.leftSection}>
        <Image
          source={{ uri: logoUrl }}
          style={styles.logo}
        />
        <View style={styles.nameSection}>
          <Text style={styles.symbol}>{coin.symbol}</Text>
          <Text style={styles.name} numberOfLines={1}>{coin.name || coin.symbol}</Text>
        </View>
      </View>

      <View style={styles.rightSection}>
        <Text style={styles.price}>{formatPrice(Number(coin.price))}</Text>
        {typeof coin.daily_volume === 'number' && (
          <Text style={styles.volume}>Vol: {formatNumber(coin.daily_volume, true)}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default CoinCard; 