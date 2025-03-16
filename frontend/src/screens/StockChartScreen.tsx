
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { secureStorage } from "../utils/solanaWallet";
import { Wallet } from "../types";
import GoogleFinanceChart from "../components/TestPriceChartScreen";
import api from "../services/api";

type Props = NativeStackScreenProps<RootStackParamList, "StockChartScreen">;

interface TimeframeOption {
        label: string;
        value: string;
}

const TIMEFRAMES: TimeframeOption[] = [
        { label: "15m", value: "15m" },
        { label: "1H", value: "1H" },
        { label: "4H", value: "4H" },
        { label: "1D", value: "1D" },
        { label: "1W", value: "1W" },
];

const StockChartScreen: React.FC<Props> = ({ navigation, route }) => {
        const [selectedTimeframe, setSelectedTimeframe] = useState("15m");
        const [priceHistory, setPriceHistory] = useState<{ x: Date; y: number }[]>([]);
        const [wallet, setWallet] = useState<Wallet | null>(null);
        const [loading, setLoading] = useState(false);

        useEffect(() => {
                loadWallet();
                fetchPriceHistory("15m"); // default timeframe on mount
        }, []);

        // Load wallet from secure storage
        const loadWallet = async () => {
                try {
                        const savedWallet = await secureStorage.getWallet();
                        if (savedWallet) {
                                setWallet(savedWallet);
                        }
                } catch (error) {
                        console.error("Error loading wallet:", error);
                }
        };

        // Fetch price history from the API
        const fetchPriceHistory = async (timeframe: string) => {
                try {
                        setLoading(true);
                        const now = Math.floor(Date.now() / 1000);

                        const points = 100;
                        let durationPerPoint;

                        switch (timeframe) {
                                case '1H':
                                        durationPerPoint = 3600; // 1 hour in seconds
                                        break;
                                case '1D':
                                        durationPerPoint = 86400; // 1 day in seconds
                                        break;
                                case '1W':
                                        durationPerPoint = 604800; // 1 week in seconds
                                        break;
                                case '1M':
                                        durationPerPoint = 2592000; // 1 month in seconds
                                        break;
                                default:
                                        durationPerPoint = 3600; // Default to 1 hour
                        }

                        const timeFrom = now - (points * durationPerPoint);
                        const response = await api.getPriceHistory("CniPCE4b3s8gSUPhUiyMjXnytrEqUrMfSsnbBjLCpump", timeFrom);

                        // Check structure based on your actual response shape
                        if (response?.success && response.data?.items) {
                                const mapped = response.data.items
                                        .filter((item: any) => item.value !== null && item.unixTime !== null)
                                        .map((item: any) => ({
                                                x: new Date(item.unixTime * 1000),
                                                y: parseFloat(item.value) // keep full precision
                                        }));
                                setPriceHistory(mapped);
                        } else {
                                setPriceHistory([]);
                        }
                } catch (error) {
                        console.error("Error fetching price history:", error);
                        setPriceHistory([]);
                } finally {
                        setLoading(false);
                }
        };

        // When user taps a timeframe, update selection & refetch
        const handleTimeframeSelect = (timeframe: string) => {
                setSelectedTimeframe(timeframe);
                fetchPriceHistory(timeframe);
        };

        return (
                <View style={{ flex: 1, padding: 16 }}>
                        {/* If you want to show wallet info */}
                        <View style={{ marginBottom: 8 }}>
                                {wallet ? (
                                        <Text style={{ fontSize: 16 }}>
                                                Wallet Address: {wallet.address}
                                        </Text>
                                ) : (
                                        <Text style={{ fontSize: 16, color: "gray" }}>
                                                No wallet loaded
                                        </Text>
                                )}
                        </View>

                        {/* Timeframe buttons */}
                        <View style={styles.timeframeRow}>
                                {TIMEFRAMES.map((tf) => (
                                        <TouchableOpacity
                                                key={tf.value}
                                                style={[
                                                        styles.timeframeButton,
                                                        selectedTimeframe === tf.value && styles.timeframeButtonActive
                                                ]}
                                                onPress={() => handleTimeframeSelect(tf.value)}
                                        >
                                                <Text
                                                        style={[
                                                                styles.timeframeLabel,
                                                                selectedTimeframe === tf.value && styles.timeframeLabelActive
                                                        ]}
                                                >
                                                        {tf.label}
                                                </Text>
                                        </TouchableOpacity>
                                ))}
                        </View>

                        {/* Chart or loading */}
                        {loading ? (
                                <ActivityIndicator size="large" style={{ marginTop: 20 }} />
                        ) : (
                                <GoogleFinanceChart data={priceHistory} />
                        )}
                </View>
        );
};

export default StockChartScreen;

const styles = StyleSheet.create({
        timeframeRow: {
                flexDirection: "row",
                justifyContent: "space-evenly",
                marginVertical: 8
        },
        timeframeButton: {
                backgroundColor: "#f1f1f1",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 4
        },
        timeframeButtonActive: {
                backgroundColor: "#0f9d58"
        },
        timeframeLabel: {
                color: "#333",
                fontWeight: "600"
        },
        timeframeLabelActive: {
                color: "#fff"
        }
});

