import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { ActivityIndicator, Text, useTheme, Button } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useToast } from '../../components/Common/Toast';
import CoinChart from '../../components/Chart/CoinChart';
import { PricePoint } from '../../components/Chart/CoinChart/types';
import CoinInfo from '../../components/Chart/CoinInfo';
import PriceDisplay from '../../components/CoinDetails/PriceDisplay';
import { Coin, PriceData } from '../../types';
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
  const [priceHistory, setPriceHistory] = useState<PriceData[]>([]);
  const [coin, setCoin] = useState<Coin | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [hoverPoint, setHoverPoint] = useState<PricePoint | null>(null);
  const { showToast } = useToast();
  const { wallet, walletBalance } = usePortfolioStore();
  const theme = useTheme();
  const styles = createStyles(theme);

  const parseValue = (val: string | number | undefined): number => {
    if (val === undefined) return 0;
    return typeof val === 'string' ? parseFloat(val) : val;
  };

  const handleChartHover = useCallback((point: PricePoint | null) => {
    setHoverPoint(point);
  }, []);

  useEffect(() => {
    fetchCoinData(initialCoin, setMetadataLoading, setCoin);
  }, [initialCoin]);

  useEffect(() => {
    if (!coin) return;
    fetchPriceHistory(selectedTimeframe, setLoading, setPriceHistory, coin);
  }, [selectedTimeframe, coin]);

  const displayData = useMemo(() => {
    const lastDataPoint = priceHistory.length > 0 ? priceHistory[priceHistory.length - 1] : null;
    const firstDataPoint = priceHistory.length > 0 ? priceHistory[0] : null;

    const lastValue = parseValue(lastDataPoint?.value);
    const firstValue = parseValue(firstDataPoint?.value);
    const currentPrice = hoverPoint?.y ?? lastValue;

    let periodChange = 0;
    let valueChange = 0;

    if (lastDataPoint && firstDataPoint && firstValue !== 0) {
      periodChange = ((lastValue - firstValue) / firstValue) * 100;
      valueChange = lastValue - firstValue;
    }

    return {
      currentPrice,
      periodChange,
      valueChange,
    };
  }, [priceHistory, hoverPoint, parseValue]);

  const holdingsValue = useMemo(() => {
    if (!walletBalance) return '0.00';

    const lastDataPoint = priceHistory.length > 0 ? priceHistory[priceHistory.length - 1] : null;
    const currentPrice = parseValue(lastDataPoint?.value);
    return (walletBalance.sol_balance * currentPrice).toFixed(2);
  }, [priceHistory, walletBalance, parseValue]);

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
              price={displayData.currentPrice}
              periodChange={displayData.periodChange}
              valueChange={displayData.valueChange}
              period={selectedTimeframe}
              icon_url={coin.icon_url}
              name={coin.name}
            />
          </View>
        )}

        <View style={{ marginHorizontal: 16 }}>
          <CoinChart
            data={priceHistory}
            loading={loading}
            activePoint={hoverPoint}
            onHover={handleChartHover}
          />
        </View>

        <View style={styles.timeframeButtonsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.timeframeButtonsInnerContainer}
          >
            {TIMEFRAMES.map((tf) => {
              const isSelected = selectedTimeframe === tf.value;
              return (
                <TouchableOpacity
                  key={tf.value}
                  onPress={() => setSelectedTimeframe(tf.value)}
                  style={styles.timeframeButton}
                >
                  <Text style={[
                    styles.timeframeButtonText,
                    isSelected && styles.timeframeButtonTextSelected
                  ]}>
                    {tf.label}
                  </Text>
                  {isSelected && <View style={styles.timeframeButtonUnderline} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {coin && priceHistory.length > 0 && walletBalance && (
          <View style={styles.holdingsContainer}>
            <Text style={styles.holdingsTitle}>
              Your Holdings
            </Text>
            <View style={styles.holdingsDetails}>
              <View style={styles.holdingsDetailRow}>
                <Text style={styles.holdingsDetailLabel}>Value</Text>
                <Text style={styles.holdingsDetailValue}>
                  ${holdingsValue}
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
