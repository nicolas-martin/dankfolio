import React, { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import {
  Box,
  Text,
  ScrollView,
  Spinner,
  VStack,
  HStack,
  Button,
  ButtonText,
  Pressable,
} from '@gluestack-ui/themed';
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

  useEffect(() => {
    fetchCoinData(initialCoin, setMetadataLoading, setCoin);
  }, [initialCoin]);

  useEffect(() => {
    if (!coin) return;
    fetchPriceHistory(selectedTimeframe, setLoading, setPriceHistory, coin);
  }, [selectedTimeframe, coin]);

  const handleChartHover = (point: { x: Date; y: number } | null) => {
    setHoverPoint(point);
  };

  if (loading && !coin) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center" bg="$background">
        <Spinner size="large" color="$primary" />
      </Box>
    );
  }

  return (
    <Box flex={1} bg="$background">
      <ScrollView 
        flex={1}
        contentContainerStyle={{ paddingBottom: 80 }}
        bounces={false}
      >
        {/* Header with Price Display */}
        {coin && priceHistory.length >= 2 && (
          <Box
            p="$4"
            bg="$backgroundDark"
            rounded="$lg"
            m="$4"
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
          </Box>
        )}

        {/* Chart Section */}
        <Box
          height={Platform.select({
            web: 400,
            ios: 300,
            android: 300,
            default: 250
          })}
          my="$4"
          bg="$background"
          overflow="visible"
          position="relative"
          mb={Platform.OS !== 'web' ? '$15' : '$4'}
        >
          <CoinChart
            data={priceHistory}
            loading={loading}
            activePoint={hoverPoint}
            onHover={handleChartHover}
          />

          {/* Timeframe buttons */}
          <Box
            position={Platform.OS !== 'web' ? 'absolute' : 'relative'}
            bottom={Platform.OS !== 'web' ? '$2' : undefined}
            left={Platform.OS !== 'web' ? '$4' : undefined}
            right={Platform.OS !== 'web' ? '$4' : undefined}
            mt={Platform.OS === 'web' ? '$8' : undefined}
            bg="$background"
            rounded="$md"
            p="$2"
            shadowColor={Platform.OS === 'ios' ? '$backgroundLight800' : undefined}
            shadowOffset={Platform.OS === 'ios' ? { width: 0, height: 2 } : undefined}
            shadowOpacity={Platform.OS === 'ios' ? 0.25 : undefined}
            shadowRadius={Platform.OS === 'ios' ? 3.84 : undefined}
            elevation={Platform.OS === 'android' ? 5 : undefined}
            zIndex={1000}
          >
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                flexGrow: 1,
                justifyContent: 'center',
                gap: 8,
                paddingHorizontal: 8
              }}
            >
              {TIMEFRAMES.map((tf) => (
                <Pressable
                  key={tf.value}
                  px="$4"
                  py="$2"
                  rounded="$sm"
                  minWidth={48}
                  alignItems="center"
                  bg={selectedTimeframe === tf.value ? '$primary' : '$background'}
                  onPress={() => setSelectedTimeframe(tf.value)}
                >
                  <Text
                    color={selectedTimeframe === tf.value ? '$textLight' : '$textSecondary'}
                    fontSize="$sm"
                    fontWeight="$600"
                  >
                    {tf.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Box>
        </Box>

        {/* Your Holdings Section */}
        {wallet && walletBalance && (
          <Box
            bg="$backgroundDark"
            rounded="$lg"
            p="$4"
            mx="$5"
          >
            <Text
              fontSize="$2xl"
              fontWeight="$bold"
              color="$text"
              mb="$4"
            >
              Your Holdings
            </Text>
            <VStack space="sm" mb="$5">
              <HStack justifyContent="space-between">
                <Text fontSize="$base" color="$textSecondary">Value</Text>
                <Text fontSize="$base" color="$text" fontWeight="$bold">
                  ${(walletBalance.sol_balance * (priceHistory[priceHistory.length - 1]?.y || 0)).toFixed(2)}
                </Text>
              </HStack>
              <HStack justifyContent="space-between">
                <Text fontSize="$base" color="$textSecondary">Quantity</Text>
                <Text fontSize="$base" color="$text" fontWeight="$bold">
                  {walletBalance.sol_balance.toFixed(4)} {coin?.symbol}
                </Text>
              </HStack>
            </VStack>
          </Box>
        )}

        {/* Coin Information */}
        {!metadataLoading && coin ? (
          <Box
            bg="$backgroundDark"
            rounded="$lg"
            p="$4"
            mx="$5"
            mb="$20"
          >
            <Text
              fontSize="$xl"
              fontWeight="$bold"
              color="$text"
              mb="$4"
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
          </Box>
        ) : (
          <Box alignItems="center">
            <Spinner my="$5" color="$primary" />
          </Box>
        )}
      </ScrollView>

      {/* Trade Button */}
      {coin && (
        <Box
          position="absolute"
          bottom={0}
          left={0}
          right={0}
          p="$4"
          bg="$background"
          borderTopWidth={1}
          borderTopColor="$borderLight"
          shadowColor="$backgroundDark"
          shadowOffset={{ width: 0, height: -3 }}
          shadowOpacity={0.3}
          shadowRadius={4}
          elevation={5}
        >
          <Button
            size="lg"
            variant="solid"
            bg="$primary"
            onPress={() => handleTradeNavigation(
              coin,
              solCoin,
              showToast,
              navigation.navigate
            )}
            rounded="$lg"
            py="$3"
            sx={{
              ":hover": {
                bg: "$secondary"
              },
              ":active": {
                bg: "$secondary"
              }
            }}
          >
            <ButtonText
              color="$textLight"
              fontWeight="$bold"
              fontSize="$lg"
            >
              Trade {coin.name}
            </ButtonText>
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default CoinDetail;
