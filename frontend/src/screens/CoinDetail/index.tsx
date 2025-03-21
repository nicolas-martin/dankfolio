import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { styles } from './styles';
import { CoinDetailScreenProps } from './types';
import BackButton from '../../components/common/ui/BackButton';
import CoinChart from '../../components/common/chart/CoinChart';
import { theme } from '../../utils/theme';

const timeframes = ['1H', '24H', '1W', '1M', '1Y'];

const CoinDetailScreen: React.FC<CoinDetailScreenProps> = ({ navigation, route }) => {
    const { coin } = route.params;
    const [selectedTimeframe, setSelectedTimeframe] = useState('24H');
    const [chartData, setChartData] = useState<{ x: Date; y: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [activePoint, setActivePoint] = useState<{ x: Date; y: number } | null>(null);

    useEffect(() => {
        loadChartData();
    }, [selectedTimeframe]);

    const loadChartData = async () => {
        try {
            setLoading(true);
            // TODO: Implement chart data fetching
            const mockData = Array.from({ length: 24 }, (_, i) => ({
                x: new Date(Date.now() - (23 - i) * 3600000),
                y: Math.random() * 100 + 100
            }));
            setChartData(mockData);
        } catch (error) {
            console.error('Error loading chart data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBuyPress = () => {
        navigation.navigate('Trade', { coin, isBuy: true });
    };

    if (loading && chartData.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    const priceChange = activePoint
        ? ((activePoint.y - chartData[0].y) / chartData[0].y) * 100
        : ((chartData[chartData.length - 1].y - chartData[0].y) / chartData[0].y) * 100;

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <BackButton />
                    <View style={styles.coinInfo}>
                        <Text style={styles.coinName}>{coin.name}</Text>
                        <Text style={styles.coinSymbol}>{coin.symbol}</Text>
                    </View>
                </View>

                <View style={styles.timeframeRow}>
                    {timeframes.map((timeframe) => (
                        <TouchableOpacity
                            key={timeframe}
                            style={[
                                styles.timeframeButton,
                                selectedTimeframe === timeframe && styles.timeframeButtonActive,
                            ]}
                            onPress={() => setSelectedTimeframe(timeframe)}
                        >
                            <Text
                                style={[
                                    styles.timeframeText,
                                    selectedTimeframe === timeframe && styles.timeframeTextActive,
                                ]}
                            >
                                {timeframe}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.priceSection}>
                    <Text style={styles.currentPrice}>
                        ${(activePoint?.y || chartData[chartData.length - 1].y).toFixed(2)}
                    </Text>
                    <Text
                        style={[
                            styles.priceChange,
                            priceChange >= 0 ? styles.positive : styles.negative,
                        ]}
                    >
                        {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                    </Text>
                </View>

                <CoinChart
                    data={chartData}
                    loading={loading}
                    activePoint={activePoint}
                    onHover={setActivePoint}
                />

                <View style={styles.bottomButtonContainer}>
                    <TouchableOpacity
                        style={styles.bottomBuyButton}
                        onPress={handleBuyPress}
                    >
                        <Text style={styles.bottomBuyButtonText}>
                            Buy {coin.symbol}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
};

export default CoinDetailScreen; 