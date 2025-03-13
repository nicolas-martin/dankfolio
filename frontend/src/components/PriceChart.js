import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions } from 'react-native';
import {
  VictoryChart,
  VictoryLine,
  VictoryAxis,
  VictoryArea,
  VictoryVoronoiContainer
} from 'victory-native';

const PriceChart = ({ data = [], timeframe = '15m', onTimeframeChange }) => {
  // Define timeframe options
  const timeframes = [
    { label: '15m', value: '15m' },
    { label: '1H', value: '1H' },
    { label: '4H', value: '4H' },
    { label: '1D', value: '1D' },
    { label: '1W', value: '1W' },
  ];

  // Prepare chart data
  const chartData = {
    labels: data.map(item => item.timestamp),
    datasets: [{ data: data.map(item => Number(item.value)) }]
  };

  const prices = chartData.datasets[0].data;
  const isNegativeTrend =
    prices.length > 1 && prices[0] > prices[prices.length - 1];
  const lineColor = isNegativeTrend ? '#FF5252' : '#00C853';
  const fillColor = isNegativeTrend ? '#FF525233' : '#00C85333';

  // Format data for Victory
  const formattedData = chartData.labels.map((timestamp, index) => ({
    x: new Date(Number(timestamp) * 1000),
    y: chartData.datasets[0].data[index]
  }));

  // Format time based on timeframe
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    switch (timeframe) {
      case '15m':
      case '1H':
      case '4H':
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      case '1D':
        return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
      case '1W':
        return date.toLocaleString([], { month: 'short', day: 'numeric' });
      default:
        return date.toLocaleString();
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
            onPress={() => onTimeframeChange(tf.value)}
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

      <View style={[styles.chartContainer, { height: 220 }]}>
        <VictoryChart
          height={220}
          padding={{ top: 20, bottom: 30, left: 50, right: 20 }}
          scale={{ x: "time" }}
          containerComponent={
            <VictoryVoronoiContainer
              labels={({ datum }) => `$${datum.y.toFixed(4)}`}
              labelComponent={
                <View style={styles.tooltip}>
                  <Text style={styles.tooltipText}>${datum => datum.y.toFixed(4)}</Text>
                </View>
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
  },
  tooltip: {
    backgroundColor: '#000000CC',
    padding: 8,
    borderRadius: 6
  },
  tooltipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600'
  }
});

export default PriceChart;
