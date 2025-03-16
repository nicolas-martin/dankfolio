import React, { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions } from 'react-native';
import {
  VictoryChart,
  VictoryLine,
  VictoryAxis,
  VictoryArea,
  VictoryVoronoiContainer,
  VictoryTooltip,
} from 'victory-native';

interface PriceChartProps {
  data: Array<{ price: number; timestamp: number }>;
  onHover?: (dataPoint: { price: number; timestamp: number; percentChange: number } | null) => void;
  width?: number;
  height?: number;
  timeframe?: string;
  onTimeframeChange?: (timeframe: string) => void;
}

interface TimeframeOption {
  label: string;
  value: string;
}

const timeframes: TimeframeOption[] = [
  { label: '15m', value: '15m' },
  { label: '1H', value: '1H' },
  { label: '4H', value: '4H' },
  { label: '1D', value: '1D' },
  { label: '1W', value: '1W' }
];

const PriceChart: React.FC<PriceChartProps> = ({
  data,
  onHover,
  width = Dimensions.get('window').width - 40,
  height = 220,
  timeframe = '1H',
  onTimeframeChange
}) => {
  // Calculate price trend
  const prices = data.map(d => d.price);
  const isNegativeTrend = prices.length > 1 && prices[0] > prices[prices.length - 1];
  const lineColor = isNegativeTrend ? '#FF5252' : '#00C853';
  const fillColor = isNegativeTrend ? '#FF525233' : '#00C85333';

  // Format data for Victory
  const formattedData = data.map(d => ({
    x: new Date(d.timestamp * 1000),
    y: d.price,
    timestamp: d.timestamp
  }));

  // Calculate percent change
  const calculatePercentChange = useCallback((currentPrice: number) => {
    const initialPrice = data[0]?.price;
    if (!initialPrice) return 0;
    return ((currentPrice - initialPrice) / initialPrice) * 100;
  }, [data]);

  // Format time based on timeframe
  const formatTime = (timestamp: Date) => {
    switch (timeframe) {
      case '15m':
      case '1H':
      case '4H':
        return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      case '1D':
        return timestamp.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
      case '1W':
        return timestamp.toLocaleString([], { month: 'short', day: 'numeric' });
      default:
        return timestamp.toLocaleString();
    }
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
                backgroundColor: isNegativeTrend ? '#FF5252' : '#00C853'
              },
            ]}
            onPress={() => onTimeframeChange?.(tf.value)}
          >
            <Text style={[
              styles.timeframeText,
              timeframe === tf.value && styles.timeframeTextActive
            ]}>
              {tf.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.chartContainer, { height }]}>
        <VictoryChart
          height={height}
          width={width}
          padding={{ top: 20, bottom: 30, left: 50, right: 20 }}
          scale={{ x: "time" }}
          containerComponent={
            <VictoryVoronoiContainer
              onActivated={(points) => {
                const point = points[0];
                if (point && onHover) {
                  onHover({
                    price: point.y,
                    timestamp: point.datum.timestamp,
                    percentChange: calculatePercentChange(point.y)
                  });
                }
              }}
              onDeactivated={() => onHover?.(null)}
              labels={({ datum }) => `$${datum.y.toFixed(4)}`}
              labelComponent={
                <VictoryTooltip
                  style={{ fill: '#FFFFFF' }}
                  flyoutStyle={{
                    fill: '#000000CC',
                    stroke: 'none',
                  }}
                />
              }
            />
          }
        >
          <VictoryAxis
            dependentAxis
            style={{
              axis: { stroke: '#262640' },
              tickLabels: { fill: '#9F9FD5', fontSize: 10 },
              grid: { stroke: '#262640' }
            }}
          />
          <VictoryAxis
            style={{
              axis: { stroke: '#262640' },
              tickLabels: { fill: '#9F9FD5', fontSize: 10 },
              grid: { stroke: '#262640' }
            }}
            tickFormat={formatTime}
          />
          <VictoryArea
            data={formattedData}
            interpolation="monotoneX"
            style={{
              data: {
                fill: fillColor,
                stroke: "none"
              }
            }}
          />
          <VictoryLine
            data={formattedData}
            interpolation="monotoneX"
            style={{
              data: {
                stroke: lineColor,
                strokeWidth: 2
              }
            }}
          />
        </VictoryChart>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E1E30',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8
  },
  timeframeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 8,
    backgroundColor: '#262640',
    borderRadius: 8,
    marginBottom: 16
  },
  timeframeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginHorizontal: 4
  },
  timeframeText: {
    color: '#9F9FD5',
    fontSize: 14,
    fontWeight: '500'
  },
  timeframeTextActive: {
    color: '#FFFFFF'
  },
  chartContainer: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    overflow: 'hidden'
  }
});

export default PriceChart;