import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, TouchableOpacity } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

/**
 * PriceChart component for displaying crypto price history
 * 
 * @param {Object} props
 * @param {Array} props.data - Price history data points
 * @param {string} props.color - Primary color for the chart
 * @param {boolean} props.loading - Loading state
 * @param {Function} props.onTimeframeChange - Function to call when timeframe is changed
 */
const PriceChart = ({ data = [], color = '#6A5ACD', loading = false, onTimeframeChange }) => {
  const [timeframe, setTimeframe] = useState('1D'); // 1D, 1W, 1M, 1Y
  
  // Screen width for responsive chart
  const screenWidth = Dimensions.get('window').width - 32; // Account for margins
  
  // If no data or empty array, show placeholder
  if (!data || data.length === 0) {
    const mockData = {
      labels: ["", "", "", "", "", ""],
      datasets: [
        {
          data: [50, 45, 53, 51, 54, 48],
          color: () => color,
          strokeWidth: 2
        }
      ]
    };
    
    return (
      <View style={styles.container}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Price Chart</Text>
          <TimeframeSelector 
            selected={timeframe} 
            onSelect={(tf) => {
              setTimeframe(tf);
              onTimeframeChange && onTimeframeChange(tf);
            }} 
          />
        </View>
        
        <View style={styles.placeholderContainer}>
          <LineChart
            data={mockData}
            width={screenWidth}
            height={220}
            chartConfig={{
              backgroundColor: 'transparent',
              backgroundGradientFrom: '#262640',
              backgroundGradientTo: '#262640',
              decimalPlaces: 2,
              color: (opacity = 1) => `rgba(106, 90, 205, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              style: {
                borderRadius: 16
              },
              propsForDots: {
                r: "0",
              }
            }}
            bezier
            style={styles.chart}
            withHorizontalLines={false}
            withVerticalLines={false}
            withDots={false}
            withShadow={false}
            withInnerLines={false}
          />
          <View style={styles.noDataOverlay}>
            <Text style={styles.noDataText}>No data available</Text>
          </View>
        </View>
      </View>
    );
  }
  
  // Format data for the chart
  const chartData = {
    labels: data.map(point => point.label || ""),
    datasets: [
      {
        data: data.map(point => point.value),
        color: (opacity = 1) => `rgba(${color.replace('rgb(', '').replace(')', '')}, ${opacity})`,
        strokeWidth: 2
      }
    ]
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>Price Chart</Text>
        <TimeframeSelector 
          selected={timeframe} 
          onSelect={(tf) => {
            setTimeframe(tf);
            onTimeframeChange && onTimeframeChange(tf);
          }} 
        />
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={color} />
          <Text style={styles.loadingText}>Loading chart data...</Text>
        </View>
      ) : (
        <LineChart
          data={chartData}
          width={screenWidth}
          height={220}
          chartConfig={{
            backgroundColor: 'transparent',
            backgroundGradientFrom: '#262640',
            backgroundGradientTo: '#262640',
            decimalPlaces: 2,
            color: (opacity = 1) => `rgba(${color.replace('#', '').match(/.{2}/g).map(hex => parseInt(hex, 16)).join(', ')}, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            style: {
              borderRadius: 16
            },
            propsForDots: {
              r: "4",
              strokeWidth: "2",
              stroke: color
            }
          }}
          bezier
          style={styles.chart}
          withHorizontalLines={true}
          withVerticalLines={false}
          withInnerLines={false}
        />
      )}
    </View>
  );
};

// Timeframe selector component
const TimeframeSelector = ({ selected, onSelect }) => {
  const timeframes = ['1D', '1W', '1M', '1Y'];
  
  return (
    <View style={styles.timeframeSelector}>
      {timeframes.map((tf) => (
        <TouchableOpacity
          key={tf}
          style={[
            styles.timeframeButton,
            selected === tf && styles.selectedTimeframe
          ]}
          onPress={() => onSelect(tf)}
        >
          <Text 
            style={[
              styles.timeframeText,
              selected === tf && styles.selectedTimeframeText
            ]}
          >
            {tf}
          </Text>
        </TouchableOpacity>
      ))}
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
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  chart: {
    borderRadius: 12,
    paddingRight: 0,
  },
  loadingContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9F9FD5',
    marginTop: 8,
  },
  timeframeSelector: {
    flexDirection: 'row',
    backgroundColor: '#1A1A2E',
    borderRadius: 8,
    padding: 2,
  },
  timeframeButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  selectedTimeframe: {
    backgroundColor: '#6A5ACD',
  },
  timeframeText: {
    color: '#9F9FD5',
    fontSize: 12,
    fontWeight: '500',
  },
  selectedTimeframeText: {
    color: '#FFFFFF',
  },
  placeholderContainer: {
    position: 'relative',
  },
  noDataOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(38, 38, 64, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  noDataText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
});

export default PriceChart; 