import React from 'react';
import { View } from 'react-native';
import { Image, Text } from '@gluestack-ui/themed';
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
  if (isNaN(periodChange)) return null;

  const isPositive = periodChange >= 0;
  const formattedPrice = `$${formatPrice(price)}`;
  const formattedChange = formatValueChange(valueChange, periodChange);

  return (
    <View style={{ padding: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Image
          source={{ uri: icon_url || DEFAULT_TOKEN_ICON }}
          alt={`${name || 'Token'} icon`}
          width={32}
          height={32}
          rounded="$full"
          resizeMode="contain"
        />
        {name && (
          <Text
            color="$text"
            fontSize="$xl"
            fontWeight="$bold"
            ml="$2"
          >
            {name}
          </Text>
        )}
      </View>
      <Text
        color="$text"
        fontSize="$3xl"
        fontWeight="$bold"
        mb="$2"
      >
        {formattedPrice}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text
          color={isPositive ? '$success' : '$error'}
          fontSize="$lg"
          fontWeight="$semibold"
        >
          {formattedChange}
        </Text>
        <Text
          color="$textSecondary"
          fontSize="$base"
          ml="$1"
        >
          {period}
        </Text>
      </View>
    </View>
  );
};

export default PriceDisplay;
