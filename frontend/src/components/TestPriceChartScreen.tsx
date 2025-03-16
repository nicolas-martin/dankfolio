
// GoogleFinanceChart.tsx
import React from "react";
import { View, Platform } from "react-native";
import {
        VictoryChart,
        VictoryAxis,
        VictoryArea,
        VictoryGroup,
        createContainer
} from "victory-native";
import * as Haptics from "expo-haptics";

interface ChartPoint {
        x: Date;
        y: number;
}

interface Props {
        data: ChartPoint[];
}

const CursorVoronoiContainer = createContainer("cursor", "voronoi");

const GoogleFinanceChart: React.FC<Props> = ({ data }) => {
        const domain = data.length > 1 ? [data[0].x, data[data.length - 1].x] : undefined;

        return (
                <View>
                        <VictoryChart
                                disableAccessibility
                                scale={{ x: "time", y: "linear" }}
                                domain={domain ? { x: domain } : undefined}
                                containerComponent={
                                        <CursorVoronoiContainer
                                                cursorDimension="x"
                                                cursorLineStyle={{
                                                        stroke: "#999",
                                                        strokeDasharray: "3,3",
                                                        strokeWidth: 1
                                                }}
                                                voronoiDimension="x"
                                                // Show full precision in tooltip
                                                labels={({ datum }) => {
                                                        const dateStr = datum.x.toLocaleDateString();
                                                        // Use full numeric representation
                                                        return `USD $${datum.y}\n${dateStr}`;
                                                }}
                                                // Haptic feedback on iOS/Android only
                                                onActivated={(points) => {
                                                        if (points?.length && (Platform.OS === "ios" || Platform.OS === "android")) {
                                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                        }
                                                }}
                                        />
                                }
                        >
                                <VictoryAxis
                                        tickFormat={(d: Date) => `${d.getMonth() + 1}/${d.getDate()}`}
                                        style={{
                                                axis: { stroke: "#ccc" },
                                                tickLabels: { fill: "#444", fontSize: 12 }
                                        }}
                                />
                                <VictoryAxis
                                        dependentAxis
                                        tickFormat={(val: number) => `$${val}`}
                                        style={{
                                                axis: { stroke: "#ccc" },
                                                tickLabels: { fill: "#444", fontSize: 12 }
                                        }}
                                />

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

