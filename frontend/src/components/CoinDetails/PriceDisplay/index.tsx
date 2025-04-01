import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { PriceDisplayProps } from './coindetails_types';
import { DEFAULT_TOKEN_ICON, formatValueChange } from './coindetails_scripts';

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
  const theme = useTheme(); // Always use the hook
  const styles = createStyles(theme);

  if (isNaN(periodChange)) return null;

  const isPositive = periodChange >= 0;
  const formattedPrice = `$${formatPrice(price)}`;
  const formattedChange = formatValueChange(valueChange, periodChange);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Image
          source={{ uri: icon_url || DEFAULT_TOKEN_ICON }}
          alt={`${name || 'Token'} icon`}
          style={styles.icon}
          resizeMode="contain"
        />
        {name && (
          <Text variant="titleLarge" style={[styles.nameText, { color: theme.colors.onSurface }]}>
            {name}
          </Text>
        )}
      </View>
      <Text variant="displaySmall" style={[styles.priceText, { color: theme.colors.onSurface }]}>
        {formattedPrice}
      </Text>
      <View style={styles.changeRow}>
        <Text
          variant="titleMedium"
          style={[
            styles.changeText,
            { color: isPositive ? theme.colors.primary : theme.colors.error } // Assuming success maps to primary
          ]}
        >
          {formattedChange}
        </Text>
        <Text
          variant="bodyMedium"
          style={[styles.periodText, { color: theme.colors.onSurfaceVariant }]}
        >
          {period}
        </Text>
      </View>
    </View>
  );
};

export default PriceDisplay;

// Helper function for styles
const createStyles = (theme: any) => StyleSheet.create({
  container: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 16, // $full approximation
  },
  nameText: {
    fontWeight: 'bold', // Paper variants handle weight, but explicit for clarity
    marginLeft: 8, // $2
  },
  priceText: {
    fontWeight: 'bold',
    marginBottom: 8, // $2
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeText: {
    // fontWeight: '600', // Paper variants handle weight
  },
  periodText: {
    marginLeft: 4, // $1
  },
});
