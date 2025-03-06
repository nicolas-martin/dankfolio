import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions } from 'react-native';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts';

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

    const [dragArea, setDragArea] = useState({ start: '', end: '' });
    const [priceChange, setPriceChange] = useState(null);

    // Calculate price change between two points
    const calculatePriceChange = (start, end) => {
      if (!start || !end) {
        return null;
      }

      // Convert labels to indices
      const startIndex = data.labels.indexOf(Number(start));
      const endIndex = data.labels.indexOf(Number(end));

      if (startIndex === -1 || endIndex === -1) {
        return null;
      }

      // Get the exact values using indices
      const startValue = data.datasets[0].data[startIndex];
      const endValue = data.datasets[0].data[endIndex];

      if (typeof startValue !== 'number' || typeof endValue !== 'number') {
        return null;
      }

      const change = ((endValue - startValue) / startValue) * 100;
      return change.toFixed(2);
    };

    // Custom tooltip component
    const CustomTooltip = ({ active, payload }) => {
      if (active && payload && payload.length) {

        // If we're dragging, show the comparison
        if (dragArea.start && dragArea.end) {
          const startTime = new Date(Number(dragArea.start) * 1000).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
          const endTime = new Date(Number(dragArea.end) * 1000).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });

          // Get exact values using indices
          const startIndex = data.labels.indexOf(Number(dragArea.start));
          const endIndex = data.labels.indexOf(Number(dragArea.end));
          const startValue = data.datasets[0].data[startIndex];
          const endValue = data.datasets[0].data[endIndex];
          const isPositive = endValue > startValue;

          return (
            <View style={[
              styles.tooltip,
              {
                backgroundColor: '#000000',
                padding: 8,
                borderRadius: 6,
                borderWidth: 0,
              }
            ]}>
              <Text style={[styles.tooltipText, { color: '#9F9FD5', fontSize: 12, marginBottom: 4 }]}>
                {startTime} → {endTime}
              </Text>
              <Text style={[
                styles.tooltipText,
                {
                  color: isPositive ? '#00C853' : '#FF5252',
                  fontSize: 12,
                  fontWeight: 'bold'
                }
              ]}>
                ${startValue} → ${endValue} ({priceChange}%)
              </Text>
            </View>
          );
        }

        // Regular tooltip when not dragging
        const timestamp = new Date(payload[0].payload.timestamp * 1000);
        const time = timestamp.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });

        return (
          <View style={[
            styles.tooltip,
            {
              backgroundColor: '#000000',
              padding: 8,
              borderRadius: 6,
              borderWidth: 0,
            }
          ]}>
            <Text style={[styles.tooltipText, { color: '#FFFFFF', marginBottom: 4 }]}>
              ${payload[0].value}
            </Text>
            <Text style={[styles.tooltipText, { color: '#9F9FD5', fontSize: 10 }]}>
              {time}
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
          data={data.datasets[0].data.map((value, index) => {
            const timestamp = data.labels[index] || Date.now() / 1000;
            return {
              value,
              timestamp
            };
          })}
          margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
          onMouseDown={(e) => {
            if (e && e.activeLabel) {
              setDragArea({ start: e.activeLabel, end: '' });
              setPriceChange(null);
            }
          }}
          onMouseMove={(e) => {
            if (e && e.activeLabel && dragArea.start) {
              setDragArea(prev => ({ ...prev, end: e.activeLabel }));
              const change = calculatePriceChange(dragArea.start, e.activeLabel);
              setPriceChange(change);
            }
          }}
          onMouseUp={() => {
            if (dragArea.start && dragArea.end) {
              const change = calculatePriceChange(dragArea.start, dragArea.end);
              setPriceChange(change);
            }
            setDragArea({ start: '', end: '' });
          }}
        >
          <defs>
            <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={lineColor} stopOpacity={0.1} />
              <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
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
              strokeWidth: 1,
              strokeDasharray: '5 5',
              strokeOpacity: 0.5
            }}
            isAnimationActive={false}
            animationDuration={0}
            position={{ x: 'auto', y: 'auto' }}
            wrapperStyle={{ outline: 'none' }}
            allowEscapeViewBox={{ x: false, y: false }}
          />
          {dragArea.start && dragArea.end && (
            <ReferenceArea
              x1={dragArea.start}
              x2={dragArea.end}
              strokeOpacity={0.3}
              fill={priceChange >= 0 ? '#00C85333' : '#FF525233'}
            />
          )}
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
    labels: data.map(item => item.timestamp),
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
          onPointClick={() => { }}
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
    backgroundColor: '#000000',
    padding: 8,
    borderRadius: 6,
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
