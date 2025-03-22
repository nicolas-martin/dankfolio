import React from 'react';
import { View, Text } from 'react-native';
import PlatformImage from '../../Common/PlatformImage';
import { PriceDisplayProps } from './types';
import { styles } from './styles';
import { DEFAULT_TOKEN_ICON, formatValueChange } from './scripts';

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
  const formattedPrice = `$${formatPrice(price)}`;
  const formattedChange = formatValueChange(valueChange, periodChange);

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