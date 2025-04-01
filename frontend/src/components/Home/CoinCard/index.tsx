import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Text, Card, useTheme } from 'react-native-paper';
import { formatNumber, formatPrice } from '../../../utils/numberFormat';
import { CoinCardProps } from './coincard_types';
import { DEFAULT_LOGO } from './coincard_scripts';
import { styles } from './coincard_styles';

const CoinCard: React.FC<CoinCardProps> = ({ coin, onPress }) => {
  const theme = useTheme();

  const logoUrl = coin.icon_url || DEFAULT_LOGO;

  return (
    <Card style={styles.card} onPress={() => onPress(coin)}>
      <Card.Content style={styles.content}>
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
      </Card.Content>
    </Card>
  );
};

export default CoinCard;
