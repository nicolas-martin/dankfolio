import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { formatNumber, formatPrice, formatPercentage } from '../utils/numberFormat';
import { Coin } from '../types';

interface CoinCardProps {
    coin: Coin;
    onPress: (coin: Coin) => void;
}

const CoinCard: React.FC<CoinCardProps> = ({ coin, onPress }) => {
    // Default to SOL logo if no icon URL is provided
    const DEFAULT_LOGO = 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png';

    // Check both icon_url and iconUrl fields for maximum compatibility
    const logoUrl = coin.icon_url || coin.iconUrl || DEFAULT_LOGO;

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={() => onPress(coin)}

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
                {/* Display volume if available */}
                {typeof coin.daily_volume === 'number' && (
                    <Text style={styles.volume}>Vol: {formatNumber(coin.daily_volume, true)}</Text>
                )}
                {/* Display 24h price change if available */}
                {typeof coin.change_24h === 'number' && (
                    <Text style={[
                        styles.priceChange,
                        coin.change_24h >= 0 ? styles.positive : styles.negative
                    ]}>
                        {formatPercentage(coin.change_24h)}
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
        padding: 12,
        paddingVertical: 16, // Ensure minimum 44px touch target
        marginHorizontal: 8,
        marginBottom: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.5,
        minHeight: 48, // Minimum touch target height
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 2,
        minWidth: 0,
        paddingRight: 8,
    },
    rightSection: {
        alignItems: 'flex-end',
        flex: 1,
        marginLeft: 8,
    },
    nameSection: {
        flex: 1,
        justifyContent: 'center',
        minWidth: 0, // Allow text to truncate properly
        marginRight: 8,
    },
    logo: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 8,
        backgroundColor: '#4A4A6A',
    },
    symbol: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    name: {
        color: '#9F9FD5',
        fontSize: 14,
        marginTop: 4,
        maxWidth: '90%',
        letterSpacing: 0.25,
    },
    price: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    volume: {
        color: '#9F9FD5',
        fontSize: 12,
        marginBottom: 4,
        letterSpacing: 0.25,
    },
    priceChange: {
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 0.25,
    },
    positive: {
        color: '#4CAF50',
    },
    negative: {
        color: '#F44336',
    },
});

export default CoinCard;
