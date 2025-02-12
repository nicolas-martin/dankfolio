import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Text,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useAuth } from '../contexts/AuthContext';
import { portfolioService } from '../services/portfolioService';
import { PortfolioStats } from '../components/PortfolioStats';
import { AssetList } from '../components/AssetList';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { formatCurrency } from '../utils/formatters';

export const PortfolioScreen = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [portfolioData, setPortfolioData] = useState(null);
  const [chartData, setChartData] = useState(null);

  const loadPortfolioData = async () => {
    try {
      setLoading(true);
      const [portfolio, history] = await Promise.all([
        portfolioService.getPortfolio(user.id),
        portfolioService.getPortfolioHistory(user.id),
      ]);
      setPortfolioData(portfolio);
      setChartData(formatChartData(history));
    } catch (error) {
      console.error('Failed to load portfolio:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPortfolioData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadPortfolioData();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.totalValue}>
          {formatCurrency(portfolioData?.totalValue)}
        </Text>
        <Text style={styles.changePercent}>
          {portfolioData?.changePercent}% Today
        </Text>
      </View>

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

      <PortfolioStats data={portfolioData} />
      
      <View style={styles.assetsContainer}>
        <Text style={styles.assetsTitle}>Your Assets</Text>
        <AssetList assets={portfolioData?.assets} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    alignItems: 'center',
  },
  totalValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  changePercent: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 4,
  },
  chartContainer: {
    padding: 16,
    alignItems: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  assetsContainer: {
    padding: 16,
  },
  assetsTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
}); 