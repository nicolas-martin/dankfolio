import React, { useState, useEffect } from "react";
import { View, ActivityIndicator, Platform, Dimensions } from "react-native";
import {
        VictoryChart,
        VictoryAxis,
        VictoryArea,
        VictoryGroup,
        VictoryTheme,
        VictoryCursorContainer,
        VictoryLabel,
        LineSegment
} from "victory-native";
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
        const windowWidth = Dimensions.get('window').width;

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
        const yPadding = (maxY - minY) * 0.1;

        return (
                <View style={{
                        flex: 1,
                        width: '100%',
                        height: Platform.OS === 'ios' ? 300 : Platform.OS === 'web' ? 400 : undefined,
                        backgroundColor: '#1A1A2E',
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingVertical: Platform.OS === 'web' ? 20 : 0,
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
                          containerComponent={
                                <VictoryCursorContainer
                                  cursorLabel={({ datum }) => {
                                          const price = `$${datum.y.toFixed(2)}`;
                                          return `${price}`;
                                  }}
                                />
                              }
                                padding={{ top: 30, bottom: 50, left: 60, right: 30 }}
                                scale={{ x: "time", y: "linear" }}
                                domain={domain}
                                width={Platform.OS === 'ios' ? windowWidth - 40 : Platform.OS === 'web' ? 600 : 350}
                                height={Platform.OS === 'ios' ? 280 : Platform.OS === 'web' ? 350 : 350}
                                theme={{
                                        ...VictoryTheme.material,
                                        axis: {
                                                style: {
                                                        grid: { stroke: "transparent" },
                                                        axis: { stroke: "#666", strokeWidth: 1 },
                                                        tickLabels: { fill: "#666", fontSize: 12 },
                                                }
                                        }
                                }}
                        >
                                {/* X-axis */}
                                <VictoryAxis
                                        tickFormat={(t: Date) => `${t.getMonth() + 1}/${t.getDate()}`}
                                        style={{
                                                axis: { stroke: "#666", strokeWidth: 1 },
                                                tickLabels: { fill: "#666", fontSize: 12 },
                                                grid: { stroke: "transparent" }
                                        }}
                                />
                                {/* Y-axis */}
                                <VictoryAxis
                                        dependentAxis
                                        tickFormat={(val: number) => `$${val.toFixed(2)}`}
                                        style={{
                                                axis: { stroke: "#666", strokeWidth: 1 },
                                                tickLabels: { fill: "#666", fontSize: 12 },
                                                grid: { stroke: "transparent" }
                                        }}
                                />

                                {/* The area chart */}
                                <VictoryGroup
                                        data={chartData}
                                >
                                        <VictoryArea
                                                style={{
                                                        data: {
                                                                fill: "#FF69B4",
                                                                fillOpacity: 0.1,
                                                                stroke: "#FF69B4",
                                                                strokeWidth: 2
                                                        }
                                                }}
                                                animate={{
                                                        duration: 500,
                                                        onLoad: { duration: 500 }
                                                }}
                                        />
                                </VictoryGroup>
                        </VictoryChart>
                </View>
        );
};

export default CoinChart;

