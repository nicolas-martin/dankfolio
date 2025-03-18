import React, { useState, useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { VictoryChart, VictoryAxis, VictoryArea, VictoryTheme } from "victory-native";
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

interface ChartData {
        x: Date;
        y: number;
}

interface Props {
        data: { x: Date; y: number }[];
        loading?: boolean;
}

const CoinChart: React.FC<Props> = ({ data, loading }) => {
        const [domain, setDomain] = useState<{ x: [Date, Date]; y: [number, number] } | undefined>();
        const [previousData, setPreviousData] = useState<{ x: Date; y: number }[]>([]);

        useEffect(() => {
                if (data.length > 0) {
                        setPreviousData(data);
                        const xValues = data.map(d => d.x);
                        const yValues = data.map(d => d.y);
                        setDomain({
                                x: [xValues[0], xValues[xValues.length - 1]],
                                y: [Math.min(...yValues), Math.max(...yValues)]
                        });
                }
        }, [data]);

        const chartData = loading && data.length === 0 ? previousData : data;

        // Calculate y-axis domain with some padding
        const yValues = data.map(d => d.y);
        const minY = Math.min(...yValues);
        const maxY = Math.max(...yValues);
        const yPadding = (maxY - minY) * 0.1; // 10% padding

        return (
                <View style={{
                        paddingHorizontal: 8,
                        backgroundColor: '#191B1F',
                        height: 350,
                }}>
                        {loading && (
                                <View style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        backgroundColor: 'rgba(25, 27, 31, 0.7)',
                                        zIndex: 1,
                                }}>
                                        <ActivityIndicator size="large" color="#FF69B4" />
                                </View>
                        )}
                        <VictoryChart
                                padding={{ top: 10, bottom: 40, left: 50, right: 20 }}
                                scale={{ x: "time", y: "linear" }}
                                domain={domain}
                                width={350}
                                height={350}
                                theme={VictoryTheme.material}
                        >
                                {/* X-axis */}
                                <VictoryAxis
                                        tickFormat={(t: Date) => `${t.getMonth() + 1}/${t.getDate()}`}
                                        style={{
                                                axis: { stroke: "transparent" },
                                                tickLabels: { fill: "#666", fontSize: 12 },
                                                grid: { stroke: "transparent" }
                                        }}
                                />
                                {/* Y-axis */}
                                <VictoryAxis
                                        dependentAxis
                                        tickFormat={(val: number) => `$${val.toFixed(2)}`}
                                        style={{
                                                axis: { stroke: "transparent" },
                                                tickLabels: { fill: "#666", fontSize: 12 },
                                                grid: { stroke: "transparent" }
                                        }}
                                />

                                {/* The area */}
                                <VictoryArea
                                        data={chartData}
                                        interpolation="basis"
                                        style={{
                                                data: {
                                                        fill: "#FF69B4",
                                                        fillOpacity: 0.1,
                                                        stroke: "#FF69B4",
                                                        strokeWidth: 2
                                                }
                                        }}
                                />
                        </VictoryChart>
                </View>
        );
};

export default CoinChart;
