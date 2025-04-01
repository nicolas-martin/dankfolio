import React, { useState, useEffect, useCallback } from 'react';
import { Platform, View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Text, useTheme, Divider, Button } from 'react-native-paper';
import { useToast } from '../../components/Common/Toast';
import CoinChart from '../../components/Chart/CoinChart';
import CoinInfo from '../../components/Chart/CoinInfo';
import PriceDisplay from '../../components/CoinDetails/PriceDisplay';
import { Coin } from '../../types';
import { CoinDetailScreenNavigationProp, CoinDetailScreenRouteProp } from './coindetail_types';
import {
  TIMEFRAMES,
  fetchCoinData,
  fetchPriceHistory,
  handleTradeNavigation,
} from './coindetail_scripts';
import { usePortfolioStore } from '../../store/portfolio';

const CoinDetail: React.FC = () => {
  const navigation = useNavigation<CoinDetailScreenNavigationProp>();
  const route = useRoute<CoinDetailScreenRouteProp>();
  const { coin: initialCoin, solCoin: initialSolCoin } = route.params;
  const [selectedTimeframe, setSelectedTimeframe] = useState("15m");
  const [solCoin] = useState<Coin | null>(initialSolCoin || null);
  const [loading, setLoading] = useState(true);
  const [priceHistory, setPriceHistory] = useState<{ x: Date; y: number }[]>([]);
  const [coin, setCoin] = useState<Coin | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [hoverPoint, setHoverPoint] = useState<{ x: Date; y: number } | null>(null);
  const { showToast } = useToast();
  const { wallet, walletBalance } = usePortfolioStore();
  const theme = useTheme();

  const handleChartHover = useCallback((point: { x: Date; y: number } | null) => {
    setHoverPoint(point);
  }, []);

  useEffect(() => {
    fetchCoinData(initialCoin, setMetadataLoading, setCoin);
  }, [initialCoin]);

  useEffect(() => {
    if (!coin) return;
    fetchPriceHistory(selectedTimeframe, setLoading, setPriceHistory, coin);
  }, [selectedTimeframe, coin]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scrollView: {
      flex: 1,
    },
    scrollViewContent: {
      paddingBottom: 80,
    },
    priceDisplayContainer: {
      padding: 16,
      borderRadius: 8,
      margin: 16,
      backgroundColor: theme.colors.surfaceVariant,
    },
    chartSection: {
      marginHorizontal: 16,
      position: 'relative',
      backgroundColor: theme.colors.background,
      height: Platform.select({ web: 400, ios: 300, android: 300, default: 250 }),
      overflow: 'hidden',
    },
    timeframeButtonsContainer: {
      position: 'absolute',
      bottom: 0,
      left: 16,
      right: 16,
      marginTop: 8,
      borderRadius: 4,
      flexDirection: 'row',
      justifyContent: 'space-around',
      backgroundColor: theme.colors.background,
    },
    timeframeButtonsInnerContainer: {
      flexGrow: 1,
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 8,
    },
    timeframeButton: {
      minWidth: 48,
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 4,
    },
    timeframeButtonText: {
      fontWeight: '600',
    },
    holdingsContainer: {
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 8,
      padding: 16,
      marginHorizontal: 32,
    },
    holdingsTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 16,
      color: theme.colors.onSurface,
    },
    holdingsDetails: {
      marginBottom: 32,
    },
    holdingsDetailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    coinInfoContainer: {
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 8,
      padding: 16,
      marginHorizontal: 32,
      marginBottom: 160,
    },
    loadingContainer: {
      alignItems: 'center',
    },
    tradeButtonContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: theme.colors.outline,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: -3,
      },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 5,
    },
  });

  if (loading && !coin) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        bounces={false}
      >
        {/* Header with Price Display */}
        {coin && priceHistory.length >= 2 && (
          <View
            style={styles.priceDisplayContainer}
          >
            <PriceDisplay
              price={hoverPoint?.y || priceHistory[priceHistory.length - 1]?.y || 0}
              periodChange={
                ((priceHistory[priceHistory.length - 1]?.y - priceHistory[0]?.y) /
                  priceHistory[0]?.y) * 100
              }
              valueChange={
                priceHistory[priceHistory.length - 1]?.y - priceHistory[0]?.y
              }
              period={selectedTimeframe}
              icon_url={coin.icon_url}
              name={coin.name}
            />
          </View>
        )}

        {/* Chart Section */}
        <View
          style={styles.chartSection}
        >
          <CoinChart
            data={priceHistory}
            loading={loading}
            activePoint={hoverPoint}
            onHover={handleChartHover}
          />

          {/* Timeframe buttons */}
          <View style={styles.timeframeButtonsContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.timeframeButtonsInnerContainer}
            >
              {TIMEFRAMES.map((tf) => (
                <Pressable
                  key={tf.value}
                  style={styles.timeframeButton}
                  onPress={() => setSelectedTimeframe(tf.value)}
                >
                  <Text
                    style={styles.timeframeButtonText}
                  >
                    {tf.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* Your Holdings Section */}
        {wallet && walletBalance && (
          <View
            style={styles.holdingsContainer}
          >
            <Text style={styles.holdingsTitle}>
              Your Holdings
            </Text>
            <View style={styles.holdingsDetails}>
              <View style={styles.holdingsDetailRow}>
                <Text style={{ fontSize: 16, color: theme.colors.onSurfaceVariant }}>Value</Text>
                <Text style={{ fontSize: 16, color: theme.colors.onSurface, fontWeight: 'bold' }}>
                  ${(walletBalance.sol_balance * (priceHistory[priceHistory.length - 1]?.y || 0)).toFixed(2)}
                </Text>
              </View>
              <View style={styles.holdingsDetailRow}>
                <Text style={{ fontSize: 16, color: theme.colors.onSurfaceVariant }}>Quantity</Text>
                <Text style={{ fontSize: 16, color: theme.colors.onSurface, fontWeight: 'bold' }}>
                  {walletBalance.sol_balance.toFixed(4)} {coin?.symbol}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Coin Information */}
        {!metadataLoading && coin ? (
          <View
            style={styles.coinInfoContainer}
          >
            <Text
              style={styles.holdingsTitle}
            >
              About {coin.name}
            </Text>
            <CoinInfo
              metadata={{
                name: coin.name,
                description: coin.description,
                website: coin.website,
                twitter: coin.twitter,
                telegram: coin.telegram,
                daily_volume: coin.daily_volume,
                decimals: coin.decimals,
                tags: coin.tags || [],
                symbol: coin.symbol
              }}
            />
          </View>
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        )}
      </ScrollView>

      {/* Trade Button */}
      {coin && (
        <View
          style={styles.tradeButtonContainer}
        >
          <Button
            mode="contained"
            style={{ backgroundColor: theme.colors.primary }}
            labelStyle={{ color: theme.colors.onPrimary }}
            onPress={() => handleTradeNavigation(
              coin,
              solCoin,
              showToast,
              navigation.navigate
            )}
          >
            Trade {coin.name}
          </Button>
        </View>
      )}
    </View>
  );
};

export default CoinDetail;
