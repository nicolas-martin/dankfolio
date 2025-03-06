import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions, Image } from 'react-native';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts';
import { formatPrice, formatPercentage } from '../utils/numberFormat';

const ChartAdapter = {
  LineChart: ({ data, height, ...props }) => {
    const prices = data.datasets[0].data;
    const isNegativeTrend = prices.length > 1 && prices[0] > prices[prices.length - 1];
    const lineColor = isNegativeTrend ? '#FF5252' : '#00C853';

    const [dragArea, setDragArea] = useState({ start: '', end: '' });
    const [priceChange, setPriceChange] = useState(null);

    const getDragData = (start, end) => {
      const startIndex = data.labels.indexOf(Number(start));
      const endIndex = data.labels.indexOf(Number(end));
      if (startIndex === -1 || endIndex === -1) return null;
      const startValue = data.datasets[0].data[startIndex];
      const endValue = data.datasets[0].data[endIndex];
      if (typeof startValue !== 'number' || typeof endValue !== 'number') return null;
      const change = ((endValue - startValue) / startValue) * 100;
      return { startValue, endValue, change: change.toFixed(2) };
    };

    const handleMouseDown = (e) => {
      if (e && e.activeLabel) {
        setDragArea({ start: e.activeLabel, end: '' });
        setPriceChange(null);
      }
    };

    const handleMouseMove = (e) => {
      if (e && e.activeLabel && dragArea.start) {
        const newEnd = e.activeLabel;
        const dragData = getDragData(dragArea.start, newEnd);
        setDragArea({ start: dragArea.start, end: newEnd });
        setPriceChange(dragData ? dragData.change : null);
      }
    };

    const handleMouseUp = () => {
      if (dragArea.start && dragArea.end) {
        const dragData = getDragData(dragArea.start, dragArea.end);
        setPriceChange(dragData ? dragData.change : null);
      }
      setDragArea({ start: '', end: '' });
    };

    const tooltipStyle = {
      backgroundColor: '#000000',
      padding: 8,
      borderRadius: 6,
      borderWidth: 0,
    };

    const CustomTooltip = ({ active, payload }) => {
      if (active && payload && payload.length) {
        if (dragArea.start && dragArea.end) {
          const dragData = getDragData(dragArea.start, dragArea.end);
          if (!dragData) return null;
          const { startValue, endValue, change } = dragData;
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
          return (
            <View style={tooltipStyle}>
              <Text style={[styles.tooltipText, { color: '#9F9FD5', fontSize: 12, marginBottom: 4 }]}>
                {startTime} → {endTime}
              </Text>
              <Text style={[styles.tooltipText, { color: endValue > startValue ? '#00C853' : '#FF5252', fontSize: 12, fontWeight: 'bold' }]}>
                ${startValue} → ${endValue} ({change}%)
              </Text>
            </View>
          );
        }
        const timestamp = new Date(payload[0].payload.timestamp * 1000);
        const time = timestamp.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        return (
          <View style={tooltipStyle}>
            <Text style={[styles.tooltipText, { color: '#FFFFFF', marginBottom: 4 }]}>
              {formatPrice(payload[0].value)}
            </Text>
            <Text style={[styles.tooltipText, { color: '#9F9FD5', fontSize: 10 }]}>{time}</Text>
          </View>
        );
      }
      return null;
    };

    const CustomDot = ({ cx, cy }) => (
      <circle cx={cx} cy={cy} r={3} stroke={lineColor} strokeWidth={2} fill="#1E1E30" />
    );

    const chartData = data.labels.map((timestamp, index) => ({
      timestamp: timestamp || Math.floor(Date.now() / 1000),
      value: data.datasets[0].data[index]
    }));

    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <defs>
            <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={lineColor} stopOpacity={0.1} />
              <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="timestamp" hide />
          <YAxis hide domain={['auto', 'auto']} />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ strokeWidth: 1, strokeDasharray: '5 5', strokeOpacity: 0.5 }}
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

const PriceChart = ({ 
  data = [], 
  timeframe = '15m', 
  onTimeframeChange,
  tokenLogo,
  mintAddress,
}) => {
  const timeframes = [
    { label: '15m', value: '15m' },
    { label: '1H', value: '1H' },
    { label: '4H', value: '4H' },
    { label: '1D', value: '1D' },
    { label: '1W', value: '1W' },
  ];

  const chartData = {
    labels: data.map(item => item.timestamp),
    datasets: [{ data: data.map(item => Number(item.value)) }]
  };

  // Calculate current price and price change
  const currentPrice = data.length > 0 ? data[data.length - 1].value : 0;
  const startPrice = data.length > 0 ? data[0].value : 0;
  const priceChangePercent = startPrice !== 0 
    ? ((currentPrice - startPrice) / startPrice) * 100 
    : 0;
  const isPositiveChange = priceChangePercent >= 0;

  return (
    <View style={styles.container}>
      {/* Header section with token info */}
      <View style={styles.headerSection}>
        <View style={styles.headerContainer}>
          <View style={styles.leftHeader}>
            {tokenLogo && (
              <Image 
                source={{ uri: tokenLogo }} 
                style={styles.tokenLogo} 
                resizeMode="contain"
              />
            )}
            {mintAddress && (
              <View style={styles.tokenInfo}>
                <Text style={styles.mintAddress} numberOfLines={1} ellipsizeMode="middle">
                  {mintAddress}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.rightHeader}>
            <Text style={styles.currentPrice}>
              {formatPrice(currentPrice)}
            </Text>
            <Text style={[
              styles.priceChange,
              { color: isPositiveChange ? '#00C853' : '#FF5252' }
            ]}>
              {formatPercentage(priceChangePercent)}
            </Text>
          </View>
        </View>
      </View>

      {/* Chart section with timeframe selector */}
      <View style={styles.chartSection}>
        {/* Timeframe selector */}
        <View style={styles.timeframeContainer}>
          {timeframes.map(tf => (
            <TouchableOpacity
              key={tf.value}
              style={[
                styles.timeframeButton,
                timeframe === tf.value && {
                  backgroundColor:
                    chartData.datasets[0].data.length > 1 &&
                      chartData.datasets[0].data[0] > chartData.datasets[0].data[chartData.datasets[0].data.length - 1]
                      ? '#FF5252'
                      : '#00C853'
                },
              ]}
              onPress={() => onTimeframeChange(tf.value)}
            >
              <Text style={[styles.timeframeText, timeframe === tf.value && styles.timeframeTextActive]}>
                {tf.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Chart */}
        <View style={[styles.chartContainer, { height: 250 }]}>
          <ChartAdapter.LineChart data={chartData} height={250} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E1E30',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  headerSection: {
    marginBottom: 12,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  leftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tokenLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
    backgroundColor: '#262640',
  },
  tokenInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  mintAddress: {
    color: '#9F9FD5',
    fontSize: 12,
    maxWidth: 200,
    fontFamily: 'monospace',
  },
  rightHeader: {
    alignItems: 'flex-end',
  },
  currentPrice: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  priceChange: {
    fontSize: 14,
    fontWeight: '500',
  },
  chartSection: {
    backgroundColor: '#262640',
    borderRadius: 8,
    padding: 12,
    paddingBottom: 16,
  },
  timeframeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  timeframeButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 4,
    marginHorizontal: 4,
    minWidth: 40,
    alignItems: 'center',
  },
  timeframeText: {
    color: '#9F9FD5',
    fontSize: 14,
    fontWeight: '500',
  },
  timeframeTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  chartContainer: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    overflow: 'hidden',
  },
  tooltipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  }
});

export default PriceChart;

