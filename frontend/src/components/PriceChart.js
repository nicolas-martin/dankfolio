import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

/**
 * PriceChart component for displaying crypto price history
 * 
 * @param {Object} props
 * @param {Array} props.data - Price history data points
 * @param {string} props.timeframe - Current timeframe
 * @param {Function} props.onTimeframeChange - Function to call when timeframe is changed
 */
const PriceChart = ({ data = [], timeframe = '1D', onTimeframeChange }) => {
    const timeframes = [
        { label: '15m', value: '15M' },
        { label: '1H', value: '1H' },
        { label: '4H', value: '4H' },
        { label: '1D', value: '1D' },
        { label: '1W', value: '1W' },
    ];

    // Format data for the chart
    const chartData = {
        labels: data.map(() => ''), // Empty labels for cleaner look
        datasets: [{
            data: data.map(item => parseFloat(item.value))
        }]
    };

    return (
        <View style={styles.container}>
            <View style={styles.timeframeContainer}>
                {timeframes.map((tf) => (
                    <TouchableOpacity
                        key={tf.value}
                        style={[
                            styles.timeframeButton,
                            timeframe === tf.value && styles.timeframeButtonActive,
                        ]}
                        onPress={() => onTimeframeChange(tf.value)}
                    >
                        <Text style={[
                            styles.timeframeText,
                            timeframe === tf.value && styles.timeframeTextActive,
                        ]}>
                            {tf.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            <View style={styles.chartContainer}>
                <LineChart
                    data={chartData}
                    width={Dimensions.get('window').width - 32} // -32 for container padding
                    height={220}
                    chartConfig={{
                        backgroundColor: '#262640',
                        backgroundGradientFrom: '#262640',
                        backgroundGradientTo: '#262640',
                        decimalPlaces: 2,
                        color: (opacity = 1) => `rgba(106, 90, 205, ${opacity})`,
                        labelColor: (opacity = 1) => `rgba(159, 159, 213, ${opacity})`,
                        style: {
                            borderRadius: 16
                        },
                        propsForDots: {
                            r: '3',
                            strokeWidth: '1',
                            stroke: '#6A5ACD'
                        }
                    }}
                    bezier
                    style={{
                        marginVertical: 8,
                        borderRadius: 12
                    }}
                    withDots={true}
                    withShadow={false}
                    withInnerLines={false}
                    withOuterLines={true}
                    withVerticalLines={false}
                    withHorizontalLines={true}
                    withVerticalLabels={false}
                    withHorizontalLabels={true}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
        container: {
                backgroundColor: '#262640',
                borderRadius: 12,
                padding: 16,
                marginVertical: 8,
        },
        timeframeContainer: {
                flexDirection: 'row',
                justifyContent: 'center',
                padding: 8,
                backgroundColor: '#1E1E30',
                borderRadius: 8,
                marginBottom: 16,
        },
        timeframeButton: {
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 4,
                marginHorizontal: 4,
        },
        timeframeButtonActive: {
                backgroundColor: '#6A5ACD',
        },
        timeframeText: {
                color: '#9F9FD5',
                fontSize: 14,
                fontWeight: '500',
        },
        timeframeTextActive: {
                color: '#FFFFFF',
        },
        chartContainer: {
                backgroundColor: '#262640',
                borderRadius: 12,
                overflow: 'hidden',
        },
});

export default PriceChart; 
