import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTheme, Text } from 'react-native-paper';
import { CachedImage } from '@/components/Common/CachedImage';
import { formatPrice, formatPercentage } from '@/utils/numberFormat'; // Ensure this path is correct
import { HorizontalTickerCardProps } from './types';
import { styles } from './styles';

const HorizontalTickerCard: React.FC<HorizontalTickerCardProps> = ({ coin, onPress }) => {
    const theme = useTheme();

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={() => onPress(coin)}
            testID={`horizontal-ticker-card-${coin.mintAddress}`}
            activeOpacity={0.7}
        >
            <View style={styles.logoContainer}>
                <CachedImage
                    uri={coin.resolvedIconUrl}
                    size={32} // Adjust size as needed
                    borderRadius={16} // Half of size
                    testID={`coin-icon-${coin.mintAddress}`}
                />
            </View>
            <Text style={styles.symbol} numberOfLines={1}>
                {coin.symbol}
            </Text>
            <Text style={styles.price} numberOfLines={1}>
                {formatPrice(Number(coin.price))}
            </Text>
            {coin.change24h !== undefined && (
                <Text style={[
                    styles.change,
                    coin.change24h > 0 ? styles.changePositive :
                    coin.change24h < 0 ? styles.changeNegative :
                    styles.changeNeutral
                ]} numberOfLines={1}>
                    {formatPercentage(coin.change24h, 1, true)}
                </Text>
            )}
        </TouchableOpacity>
    );
};

export default HorizontalTickerCard;
