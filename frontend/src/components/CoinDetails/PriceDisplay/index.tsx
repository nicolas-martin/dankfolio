import React from 'react';
import { View, Text } from 'react-native';
import PlatformImage from '../../Common/PlatformImage';
import { PriceDisplayProps } from './types';
import { styles } from './styles';

const DEFAULT_TOKEN_ICON = 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png';

const formatPrice = (price: number): string => {
  if (price < 0.01) {
    return price.toFixed(8);
  }
  if (price < 1) {
    return price.toFixed(6);
  }
  if (price < 10) {
    return price.toFixed(4);
  }
  return price.toFixed(2);
};

const formatPercentage = (value: number): string => {
  return value.toFixed(2);
};

const PriceDisplay: React.FC<PriceDisplayProps> = ({
  price,
  periodChange,
  valueChange,
  period,
  icon_url,
  name,
}) => {
  if (isNaN(periodChange)) return null;

  const isPositive = periodChange >= 0;
  const arrow = isPositive ? '↑' : '↓';
  const formattedPrice = `$${formatPrice(price)}`;
  const formattedChange = `${arrow} $${Math.abs(valueChange).toFixed(8)} (${formatPercentage(periodChange)}%)`;

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <PlatformImage
          source={{ uri: icon_url || DEFAULT_TOKEN_ICON }}
          style={styles.icon}
          resizeMode="contain"
          alt={`${name || 'Token'} icon`}
        />
        {name && <Text style={styles.name}>{name}</Text>}
      </View>
      <Text style={styles.price}>{formattedPrice}</Text>
      <View style={styles.changeRow}>
        <Text style={[
          styles.change,
          isPositive ? styles.positiveChange : styles.negativeChange
        ]}>
          {formattedChange}
        </Text>
        <Text style={styles.period}> {period}</Text>
      </View>
    </View>
  );
};

export default PriceDisplay; 