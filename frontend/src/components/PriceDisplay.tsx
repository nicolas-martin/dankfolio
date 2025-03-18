import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface PriceDisplayProps {
    price: number;
    symbol?: string;
    periodChange?: number;
    period?: string;
    valueChange?: number;
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

const PriceDisplay: React.FC<PriceDisplayProps> = ({ price, periodChange, period, valueChange }) => {
    const isPositive = periodChange && periodChange > 0;
    const isNegative = periodChange && periodChange < 0;
    
    return (
        <View style={styles.container}>
            <View style={styles.priceContainer}>
                <Text style={styles.price}>${formatPrice(price)}</Text>
            </View>
            {periodChange !== undefined && !isNaN(periodChange) && valueChange !== undefined && (
                <View style={[
                    styles.changeContainer, 
                    isPositive && styles.positiveChange,
                    isNegative && styles.negativeChange
                ]}>
                    <Text style={[
                        styles.changeText,
                        isPositive && styles.positiveText,
                        isNegative && styles.negativeText
                    ]}>
                        {isPositive ? '↑' : '↓'} ${formatPrice(Math.abs(valueChange))} ({formatPercentage(Math.abs(periodChange))}%) {period}
                    </Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#1E1E2E',
        borderRadius: 12,
        padding: 16,
        marginVertical: 8,
    },
    priceContainer: {
        alignItems: 'center',
    },
    price: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    changeContainer: {
        marginTop: 8,
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderRadius: 8,
        alignSelf: 'center',
    },
    positiveChange: {
        backgroundColor: '#1B4D3E',
    },
    negativeChange: {
        backgroundColor: '#4D1B1B',
    },
    changeText: {
        fontSize: 14,
        fontWeight: '600',
    },
    positiveText: {
        color: '#4CAF50',
    },
    negativeText: {
        color: '#FF4444',
    },
});

export default PriceDisplay; 