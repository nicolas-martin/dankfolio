// GoogleFinanceChart.tsx
import React from "react";
import { View } from "react-native";
import {
        VictoryChart,
        VictoryAxis,
        VictoryArea,
        VictoryGroup,
        createContainer
} from "victory-native";
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

interface ChartData {
        x: Date;
        y: number;
}

interface Props {
        data: ChartData[];
}

// Combine cursor + voronoi for a crosshair & tooltips
const CursorVoronoiContainer = createContainer("cursor", "voronoi");

const GoogleFinanceChart: React.FC<Props> = ({ data }) => {
        console.log('Chart received data:', {
                dataLength: data?.length || 0,
                firstItem: data?.[0],
                lastItem: data?.[data?.length - 1],
                isDateInstance: data?.[0]?.x instanceof Date,
                sampleDates: data?.slice(0, 3)?.map(d => ({
                        date: d.x?.toString(),
                        value: d.y
                }))
        });

        // Calculate y-axis domain with some padding
        const yValues = data.map(d => d.y);
        const minY = Math.min(...yValues);
        const maxY = Math.max(...yValues);
        const yPadding = (maxY - minY) * 0.1; // 10% padding

        // Domain (x-axis range and y-axis range)
        const domain = data.length > 0 
                ? {
                        x: [data[0].x, data[data.length - 1].x],
                        y: [minY - yPadding, maxY + yPadding]
                }
                : undefined;

        console.log('Chart domain:', domain);

        return (
                <View>
                        <VictoryChart
                                padding={{ top: 10, bottom: 40, left: 50, right: 20 }}
                                scale={{ x: "time", y: "linear" }}
                                domain={domain}
                                width={350}
                                height={300}
                                containerComponent={
                                        <CursorVoronoiContainer
                                                cursorDimension="x"
                                                voronoiDimension="x"
                                                cursorComponent={
                                                        <line
                                                                style={{
                                                                        stroke: "#999",
                                                                        strokeDasharray: "3,3",
                                                                        strokeWidth: 1
                                                                }}
                                                        />
                                                }
                                                // Show full precision in tooltip
                                                labels={({ datum }) => {
                                                        const dateStr = datum.x.toLocaleDateString();
                                                        return `USD $${datum.y.toFixed(8)}\n${dateStr}`;
                                                }}
                                                // Haptics only on native
                                                onActivated={(points) => {
                                                        if (points?.length && (Platform.OS === "ios" || Platform.OS === "android")) {
                                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                        }
                                                }}
                                        />
                                }
                        >
                                {/* X-axis */}
                                <VictoryAxis
                                        tickFormat={(t: Date) => `${t.getMonth() + 1}/${t.getDate()}`}
                                        style={{
                                                axis: { stroke: "#ccc" },
                                                tickLabels: { fill: "#444", fontSize: 12 }
                                        }}
                                />
                                {/* Y-axis */}
                                <VictoryAxis
                                        dependentAxis
                                        tickFormat={(val: number) => `$${val.toFixed(4)}`}
                                        style={{
                                                axis: { stroke: "#ccc" },
                                                tickLabels: { fill: "#444", fontSize: 12 }
                                        }}
                                />

                                {/* The green area + line */}
                                <VictoryGroup data={data}>
                                        <VictoryArea
                                                style={{
                                                        data: {
                                                                fill: "#0f9d58",
                                                                fillOpacity: 0.1,
                                                                stroke: "#0f9d58",
                                                                strokeWidth: 2
                                                        }
                                                }}
                                        />
                                </VictoryGroup>
                        </VictoryChart>
                </View>
        );
};

export default GoogleFinanceChart;

