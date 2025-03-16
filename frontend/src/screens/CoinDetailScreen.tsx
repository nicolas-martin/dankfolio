import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Image, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import PriceChart from '../components/PriceChart';
import { secureStorage } from '../utils/solanaWallet';
import api from '../services/api';
import { Coin, Wallet } from '../types';

// Conditionally import FastImage
let FastImage: any = Image;
try {
        FastImage = require('react-native-fast-image').default;
} catch (error) {
        console.warn('FastImage not available, falling back to regular Image');
}

interface PriceStats {
        high24h: number;
        low24h: number;
        volume24h: number;
}

interface ChartDataItem {
        timestamp: number;
        value: number;
}

interface PriceHistoryItem {
        value: number;
        unixTime: number;
}

interface PriceHistoryResponse {
        data: {
                items: PriceHistoryItem[];
        };
        success: boolean;
}

interface CoinMetadata {
        website: string;
        twitter?: string;
        discord?: string;
        telegram?: string;
        tags?: string[];
}

type CoinDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CoinDetail'>;

interface RouteParams {
        coinId: string;
}

interface HoveredPrice {
        price: number;
        timestamp: number;
        percentChange: number;
}

const CoinDetailScreen: React.FC = () => {
        const navigation = useNavigation<CoinDetailScreenNavigationProp>();
        const route = useRoute();
        const { coinId } = route.params as RouteParams;
        // State for storing wallet data
        const [walletAddress, setWalletAddress] = useState<string | null>(null);

        useEffect(() => {
                const loadWallet = async () => {
                        try {
                                const savedWallet = await secureStorage.getWallet();
                                if (savedWallet && savedWallet.address) {
                                        setWalletAddress(savedWallet.address);
                                }
                        } catch (error) {
                                console.error('Error loading wallet:', error);
                        }
                };
                loadWallet();
        }, []);

        const [coin, setCoin] = useState<Coin | null>(null);
        const [loading, setLoading] = useState(true);
        const [chartData, setChartData] = useState<Array<{ price: number; timestamp: number }>>([]);
        const [timeframe, setTimeframe] = useState('1H');
        const [hoveredPrice, setHoveredPrice] = useState<HoveredPrice | null>(null);

        useEffect(() => {
                const fetchData = async () => {
                        try {
                                const [coinData, priceHistory]: [Coin, PriceHistoryResponse] = await Promise.all([
                                        api.getCoinById(coinId),
                                        api.getPriceHistory(coinId, timeframe)
                                ]);
                                if (coinData && priceHistory) {
                                        setCoin(coinData);
                                        const transformedData = transformPriceHistory(priceHistory);
                                        setChartData(transformedData);
                                }
                        } catch (error) {
                                console.error('Error fetching coin data:', error);
                        } finally {
                                setLoading(false);
                        }
                };

                fetchData();
        }, [coinId, timeframe]);

        // Transform price history data with proper typing
        const transformPriceHistory = (data: PriceHistoryResponse) => {
                if (!data?.data?.items) return [];
                return data.data.items
                        .filter((item: PriceHistoryItem) => item.value !== null && item.unixTime !== null)
                        .map((item: PriceHistoryItem) => ({
                                price: item.value,
                                timestamp: item.unixTime
                        }));
        };

        // Navigate to trade screen
        const handleBuyPress = () => {
                if (coin && walletAddress) {
                        navigation.navigate('Trade', {
                                initialFromCoin: null,
                                initialToCoin: coin,
                                wallet: walletAddress
                        });
                }
        };

        if (loading || !coin) {
                return (
                        <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="#6A5ACD" />
                        </View>
                );
        }

        const handleDiscordPress = async () => {
                if (coin.metadata?.discord) {
                        try {
                                await Linking.openURL(coin.metadata.discord);
                        } catch (error) {
                                console.error('Error opening Discord link:', error);
                        }
                }
        };

        return (
                <View style={styles.container}>
                        <View style={styles.header}>
                                <FastImage
                                        source={{ uri: coin.iconUrl || 'https://example.com/placeholder.png' }}
                                        style={styles.icon}
                                />
                                <View style={styles.headerInfo}>
                                        <Text style={styles.name}>{coin.name}</Text>
                                        <Text style={styles.symbol}>{coin.symbol}</Text>
                                </View>
                                <TouchableOpacity
                                        style={styles.buyButton}
                                        onPress={handleBuyPress}
                                >
                                        <Text style={styles.buyButtonText}>Buy</Text>
                                </TouchableOpacity>
                        </View>

                        <View style={styles.priceContainer}>
                                <Text style={styles.currentPrice}>
                                        ${hoveredPrice ? hoveredPrice.price.toFixed(4) : coin.price.toFixed(4)}
                                </Text>
                                {hoveredPrice && (
                                        <Text style={styles.timestamp}>
                                                {new Date(hoveredPrice.timestamp).toLocaleString()}
                                        </Text>
                                )}
                        </View>

                        <View style={styles.chartContainer}>
                                <PriceChart
                                        data={chartData}
                                        onHover={setHoveredPrice}
                                        timeframe={timeframe}
                                        onTimeframeChange={setTimeframe}
                                />
                        </View>

                        <View style={styles.metadataContainer}>
                                {coin.metadata?.discord && (
                                        <TouchableOpacity onPress={handleDiscordPress} style={styles.metadataLink}>
                                                <Text style={styles.metadataText}>Join Discord</Text>
                                        </TouchableOpacity>
                                )}
                        </View>

                        {coin.tags && coin.tags.length > 0 && (
                                <View style={styles.tagsContainer}>
                                        {coin.tags.map((tag, index) => (
                                                <View key={index} style={styles.tag}>
                                                        <Text style={styles.tagText}>{tag}</Text>
                                                </View>
                                        ))}
                                </View>
                        )}
                </View>
        );
};

const styles = StyleSheet.create({
        container: {
                flex: 1,
                backgroundColor: '#1E1E2E',
                padding: 16,
        },
        loadingContainer: {
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#1E1E2E',
        },
        header: {
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 24,
        },
        icon: {
                width: 40,
                height: 40,
                borderRadius: 20,
        },
        headerInfo: {
                flex: 1,
                marginLeft: 12,
        },
        name: {
                fontSize: 24,
                fontWeight: 'bold',
                color: '#FFFFFF',
        },
        symbol: {
                fontSize: 16,
                color: '#9F9FD5',
        },
        buyButton: {
                backgroundColor: '#6A5ACD',
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 8,
        },
        buyButtonText: {
                color: '#FFFFFF',
                fontWeight: 'bold',
                fontSize: 16,
        },
        priceContainer: {
                alignItems: 'center',
                marginVertical: 16,
        },
        currentPrice: {
                fontSize: 32,
                fontWeight: 'bold',
                color: '#FFFFFF',
        },
        timestamp: {
                fontSize: 14,
                color: '#9F9FD5',
                marginTop: 4,
        },
        chartContainer: {
                marginVertical: 16,
        },
        metadataContainer: {
                flexDirection: 'row',
                justifyContent: 'center',
                marginTop: 16,
        },
        metadataLink: {
                backgroundColor: '#2A2A3E',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 8,
                marginHorizontal: 8,
        },
        metadataText: {
                color: '#9F9FD5',
                fontSize: 14,
        },
        tagsContainer: {
                flexDirection: 'row',
                flexWrap: 'wrap',
                marginTop: 16,
        },
        tag: {
                backgroundColor: '#2A2A3E',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                marginRight: 8,
                marginBottom: 8,
        },
        tagText: {
                color: '#9F9FD5',
                fontSize: 12,
        },
});

export default CoinDetailScreen; 
