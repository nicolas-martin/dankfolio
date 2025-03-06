import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions } from 'react-native';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// Chart adapter to abstract the specific chart library implementation
const ChartAdapter = {
    LineChart: ({ 
        data, 
        width, 
        height, 
        onPointClick, 
        showTooltip, 
        tooltipContent,
        tooltipPosition,
        style = {},
        config = {}
    }) => {
        // Determine if price trend is negative
        const prices = data.datasets[0].data;
        const isNegativeTrend = prices.length > 1 && prices[0] > prices[prices.length - 1];
        const lineColor = isNegativeTrend ? '#FF5252' : '#00C853';

        // Custom tooltip component
        const CustomTooltip = ({ active, payload, coordinate }) => {
            if (active && payload && payload.length) {
                const { x, y } = coordinate || {};
                return (
                    <View style={[
                        styles.tooltip,
                        {
                            position: 'absolute',
                            left: x,
                            top: y - 40,
                            transform: [{
                                translateX: x > (width / 2) ? -100 : 10
                            }]
                        }
                    ]}>
                        <Text style={[styles.tooltipText, { color: lineColor }]}>
                            ${payload[0].value}
                        </Text>
                    </View>
                );
            }
            return null;
        };

        // Custom dot component
        const CustomDot = (props) => {
            const { cx, cy, payload } = props;
            return (
                <circle 
                    cx={cx} 
                    cy={cy} 
                    r={3} 
                    stroke={lineColor}
                    strokeWidth={2} 
                    fill="#1E1E30" 
                />
            );
        };

        return (
            <ResponsiveContainer width="100%" height={height}>
                <LineChart
                    data={data.datasets[0].data.map((value, index) => ({
                        value,
                        timestamp: index
                    }))}
                    margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
                    onMouseMove={(e) => {
                        if (e && e.activePayload) {
                            onPointClick(e.activePayload[0].payload);
                        }
                    }}
                >
                    <defs>
                        <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={lineColor} stopOpacity={0.1}/>
                            <stop offset="95%" stopColor={lineColor} stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <XAxis 
                        dataKey="timestamp" 
                        hide={true}
                    />
                    <YAxis 
                        hide={true}
                        domain={['auto', 'auto']}
                    />
                    <Tooltip 
                        content={<CustomTooltip />}
                        cursor={{ 
                            stroke: lineColor, 
                            strokeWidth: 1, 
                            strokeDasharray: '5 5',
                            strokeOpacity: 0.5
                        }}
                        isAnimationActive={false}
                        animationDuration={0}
                        position={{ x: 'auto', y: 'auto' }}
                        wrapperStyle={{ outline: 'none' }}
                        allowEscapeViewBox={{ x: true, y: true }}
                    />
                    <Line
                        type="monotone"
                        dataKey="value"
                        stroke={lineColor}
                        strokeWidth={2}
                        dot={false}
                        activeDot={<CustomDot />}
                        isAnimationActive={false}
                        fill="url(#colorGradient)"
                    />
                </LineChart>
            </ResponsiveContainer>
        );
    }
};

/**
 * PriceChart component for displaying crypto price history
 * 
 * @param {Object} props
 * @param {Array} props.data - Price history data points
 * @param {string} props.timeframe - Current timeframe
 * @param {Function} props.onTimeframeChange - Function to call when timeframe is changed
 */
const PriceChart = ({ data = [], timeframe = '1D', onTimeframeChange }) => {
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0, visible: false, value: 0 });
    
    const timeframes = [
        { label: '15m', value: '15m' },
        { label: '1H', value: '1H' },
        { label: '4H', value: '4H' },
        { label: '1D', value: '1D' },
        { label: '1W', value: '1W' },
    ];

    // Format data for the chart - use raw values
    const chartData = {
        labels: data.map(() => ''),
        datasets: [{
            data: data.map(item => Number(item.value))
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
                            timeframe === tf.value && {
                                backgroundColor: chartData.datasets[0].data.length > 1 && 
                                    chartData.datasets[0].data[0] > chartData.datasets[0].data[chartData.datasets[0].data.length - 1] 
                                    ? '#FF5252' 
                                    : '#00C853'
                            },
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
            <View style={[styles.chartContainer, { height: 220 }]}>
                <ChartAdapter.LineChart
                    data={chartData}
                    width={Dimensions.get('window').width - 32}
                    height={220}
                    onPointClick={() => {}}
                    showTooltip={true}
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
        backgroundColor: 'rgba(30, 30, 48, 0.9)',
        padding: 8,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#FF5252',
        zIndex: 10,
        pointerEvents: 'none'
    },
    tooltipText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
        whiteSpace: 'nowrap'
    }
});

export default PriceChart; 
