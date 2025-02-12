import React, { useEffect, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Text 
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useCoinDetail } from '../hooks/useCoinDetail';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { CoinStats } from '../components/CoinStats';
import { TradeButton } from '../components/TradeButton';
import { formatCurrency, formatPercentage } from '../utils/formatters';

export const CoinDetailScreen = ({ route, navigation }) => {
  const { coinId, symbol } = route.params;
  const { coinData, chartData, loading, error } = useCoinDetail(coinId);

  const handleTrade = (type: 'buy' | 'sell') => {
    navigation.navigate('Trade', {
      coinId,
      symbol,
      type,
      currentPrice: coinData?.price
    });
  };

  if (loading) return <LoadingSpinner />;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.chartContainer}>
        <LineChart
          data={chartData}
          width={350}
          height={220}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 2,
            color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
            style: {
              borderRadius: 16,
            },
          }}
          bezier
          style={styles.chart}
        />
      </View>

      <CoinStats
        price={formatCurrency(coinData?.price)}
        marketCap={formatCurrency(coinData?.marketCap)}
        volume={formatCurrency(coinData?.volume)}
        priceChange={formatPercentage(coinData?.priceChangePercentage)}
      />

      <View style={styles.contractInfo}>
        <Text style={styles.label}>Contract Address:</Text>
        <Text style={styles.value}>{coinData?.contractAddress}</Text>
      </View>

      <View style={styles.tradeButtons}>
        <TradeButton
          type="buy"
          onPress={() => handleTrade('buy')}
          style={styles.buyButton}
        />
        <TradeButton
          type="sell"
          onPress={() => handleTrade('sell')}
          style={styles.sellButton}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  chartContainer: {
    padding: 16,
    alignItems: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  contractInfo: {
    padding: 16,
    backgroundColor: '#f8fafc',
    marginHorizontal: 16,
    borderRadius: 8,
  },
  label: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  value: {
    fontSize: 12,
    color: '#0f172a',
    fontFamily: 'monospace',
  },
  tradeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    marginTop: 16,
  },
  buyButton: {
    backgroundColor: '#22c55e',
  },
  sellButton: {
    backgroundColor: '#ef4444',
  },
}); 