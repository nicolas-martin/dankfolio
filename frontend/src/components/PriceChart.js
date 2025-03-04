import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

const PriceChart = ({ data, timeframe, onTimeframeChange }) => {
  const chartHtml = useMemo(() => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js"></script>
        <style>
          body { margin: 0; background-color: #262640; }
          #chart { width: 100%; height: 100%; }
        </style>
      </head>
      <body>
        <div id="chart"></div>
        <script>
          const chart = LightweightCharts.createChart(document.getElementById('chart'), {
            layout: {
              background: { color: '#262640' },
              textColor: '#9F9FD5',
            },
            grid: {
              vertLines: { color: '#334158' },
              horzLines: { color: '#334158' },
            },
            timeScale: {
              borderColor: '#485c7b',
              timeVisible: true,
              secondsVisible: false,
            },
            rightPriceScale: {
              borderColor: '#485c7b',
            },
            crosshair: {
              vertLine: {
                color: '#6A5ACD',
                width: 1,
                style: 2,
                labelBackgroundColor: '#6A5ACD',
              },
              horzLine: {
                color: '#6A5ACD',
                width: 1,
                style: 2,
                labelBackgroundColor: '#6A5ACD',
              },
            },
          });

          const lineSeries = chart.addLineSeries({
            color: '#6A5ACD',
            lineWidth: 2,
            crosshairMarkerVisible: true,
            crosshairMarkerRadius: 4,
            crosshairMarkerBorderColor: '#FFFFFF',
            crosshairMarkerBackgroundColor: '#6A5ACD',
            priceLineVisible: false,
          });

          // Handle window resize
          window.addEventListener('resize', () => {
            chart.applyOptions({
              width: window.innerWidth,
              height: window.innerHeight,
            });
          });

          // Function to update chart data
          window.updateChartData = (data) => {
            const chartData = data.map(item => ({
              time: item.timestamp,
              value: item.value
            }));
            lineSeries.setData(chartData);
            chart.timeScale().fitContent();
          };

          // Initial chart size
          chart.applyOptions({
            width: window.innerWidth,
            height: window.innerHeight,
          });
        </script>
      </body>
    </html>
  `, []);

  const webViewRef = useRef(null);

  // Update chart data when it changes
  useEffect(() => {
    if (webViewRef.current && data.length > 0) {
      webViewRef.current.injectJavaScript(`
        window.updateChartData(${JSON.stringify(data)});
        true;
      `);
    }
  }, [data]);

  const timeframes = [
    { label: '15m', value: '15M' },
    { label: '1H', value: '1H' },
    { label: '4H', value: '4H' },
    { label: '1D', value: '1D' },
    { label: '1W', value: '1W' },
  ];

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
        <WebView
          ref={webViewRef}
          source={{ html: chartHtml }}
          style={styles.webview}
          scrollEnabled={false}
          bounces={false}
          onMessage={(event) => {
            console.log('Chart message:', event.nativeEvent.data);
          }}
          originWhitelist={['*']}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#262640',
    borderRadius: 12,
    overflow: 'hidden',
  },
  timeframeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 8,
    backgroundColor: '#1E1E30',
    borderBottomWidth: 1,
    borderBottomColor: '#334158',
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
    flex: 1,
    minHeight: 300,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default PriceChart; 
