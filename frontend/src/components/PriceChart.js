import React, { useState } from 'react';
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
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0, visible: true, value: 0 });
    
    const timeframes = [
        { label: '15m', value: '15m' },
        { label: '1H', value: '1H' },
        { label: '4H', value: '4H' },
        { label: '1D', value: '1D' },
        { label: '1W', value: '1W' },
    ];

    // Format data for the chart - use raw values
    const chartData = {
        labels: data.map(() => ''), // Empty labels for cleaner look
        datasets: [{
            data: data.map(item => Number(item.value)), // Ensure we're using the raw number
            color: (opacity = 1) => `rgba(255, 82, 82, ${opacity})`,
            strokeWidth: 2
        }]
    };

    // Display raw value without any formatting/truncation
    const formatValue = (value) => {
        if (value === null || value === undefined) return 'N/A';
        return `$${value}`;
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
                    width={Dimensions.get('window').width - 32}
                    height={220}
                    chartConfig={{
                        backgroundColor: 'transparent',
                        backgroundGradientFrom: '#1E1E30',
                        backgroundGradientTo: '#1E1E30',
                        decimalPlaces: 20, // Increased to show more decimals
                        color: (opacity = 1) => `rgba(255, 82, 82, ${opacity})`,
                        labelColor: (opacity = 1) => `rgba(159, 159, 213, ${opacity})`,
                        propsForLabels: {
                            fontSize: 10 // Smaller font size to fit more decimals
                        },
                        style: {
                            borderRadius: 16
                        },
                        propsForDots: {
                            r: '2',
                            strokeWidth: '1',
                            stroke: '#FF5252'
                        },
                        propsForBackgroundLines: {
                            strokeDasharray: '',
                            strokeWidth: 0.5,
                            stroke: 'rgba(159, 159, 213, 0.1)'
                        },
                        formatYLabel: (value) => value // Use raw value for Y-axis labels
                    }}
                    bezier
                    style={{
                        marginVertical: 8,
                        borderRadius: 12
                    }}
                    withDots={true}
                    withShadow={false}
                    withInnerLines={true}
                    withOuterLines={false}
                    withVerticalLines={false}
                    withHorizontalLines={true}
                    withVerticalLabels={false}
                    withHorizontalLabels={true}
                    decorator={() => {
                        if (tooltipPos.visible) {
                            return (
                                <View style={[
                                    styles.tooltip,
                                    {
                                        left: tooltipPos.x - 40,
                                        top: tooltipPos.y - 40
                                    }
                                ]}>
                                    <Text style={styles.tooltipText}>
                                        {formatValue(tooltipPos.value)}
                                    </Text>
                                </View>
                            );
                        }
                        return null;
                    }}
                    onDataPointClick={({value, x, y}) => {
                        setTooltipPos({
                            x,
                            y,
                            value,
                            visible: true
                        });
                        setTimeout(() => setTooltipPos(prev => ({...prev, visible: false})), 2000);
                    }}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#1E1E30', // Darker background
        borderRadius: 12,
        padding: 16,
        marginVertical: 8,
    },
    timeframeContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        padding: 8,
        backgroundColor: '#262640',
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
        backgroundColor: '#FF5252', // Red accent color
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
        backgroundColor: 'transparent',
        borderRadius: 12,
        overflow: 'hidden',
    },
    tooltip: {
        position: 'absolute',
        backgroundColor: 'rgba(30, 30, 48, 0.9)',
        padding: 8,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#FF5252',
    },
    tooltipText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    }
});

export default PriceChart; 
