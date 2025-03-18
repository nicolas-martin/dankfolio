import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PlatformImage from './PlatformImage';

interface PriceDisplayProps {
    price: number;
    periodChange: number;
    valueChange: number;
    period: string;
    icon_url?: string;
    name?: string;
}

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
    name
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
                    source={{ 
                        uri: icon_url || 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png'
                    }}
                    style={styles.icon}
                    resizeMode="contain"
                    priority="normal"
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

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        alignItems: 'flex-start',
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    changeRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    icon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 8,
        backgroundColor: '#2A2A3E',
    },
    name: {
        fontSize: 16,
        color: '#9F9FD5',
        fontWeight: '500',
    },
    price: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    change: {
        fontSize: 16,
        fontWeight: '500',
    },
    period: {
        fontSize: 16,
        color: '#9F9FD5',
        fontWeight: '500',
    },
    positiveChange: {
        color: '#00C805',
        backgroundColor: 'rgba(0, 200, 5, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    negativeChange: {
        color: '#FF4B4B',
        backgroundColor: 'rgba(255, 75, 75, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
});

export default PriceDisplay; 