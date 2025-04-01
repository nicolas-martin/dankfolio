import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { ActivityIndicator, Text, useTheme, Button } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
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
import { createStyles } from './coindetail_styles';
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
  const styles = createStyles(theme);

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
        {coin && priceHistory.length >= 2 && (
          <View style={styles.priceDisplayContainer}>
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

        <View style={styles.chartSection}>
          <CoinChart
            data={priceHistory}
            loading={loading}
            activePoint={hoverPoint}
            onHover={handleChartHover}
          />

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
                  <Text style={styles.timeframeButtonText}>
                    {tf.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>

        {wallet && walletBalance && (
          <View style={styles.holdingsContainer}>
            <Text style={styles.holdingsTitle}>
              Your Holdings
            </Text>
            <View style={styles.holdingsDetails}>
              <View style={styles.holdingsDetailRow}>
                <Text style={styles.holdingsDetailLabel}>Value</Text>
                <Text style={styles.holdingsDetailValue}>
                  ${(walletBalance.sol_balance * (priceHistory[priceHistory.length - 1]?.y || 0)).toFixed(2)}
                </Text>
              </View>
              <View style={styles.holdingsDetailRow}>
                <Text style={styles.holdingsDetailLabel}>Quantity</Text>
                <Text style={styles.holdingsDetailValue}>
                  {walletBalance.sol_balance.toFixed(4)} {coin?.symbol}
                </Text>
              </View>
            </View>
          </View>
        )}

        {!metadataLoading && coin ? (
          <View style={styles.coinInfoContainer}>
            <Text style={styles.holdingsTitle}>
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

      {coin && (
        <View style={styles.tradeButtonContainer}>
          <Button
            mode="contained"
            style={styles.tradeButton}
            labelStyle={styles.tradeButtonLabel}
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
