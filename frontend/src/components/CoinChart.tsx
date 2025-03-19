import React, { useState, useEffect } from "react";
import { View, ActivityIndicator, Dimensions, Text, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { VictoryChart, VictoryLine, VictoryAxis } from "victory";
import { CartesianChart, Line } from "victory-native";

interface ChartData {
        x: Date;
        y: number;
}

interface Props {
        data: { x: Date; y: number }[];
        loading?: boolean;
        activePoint?: { x: Date; y: number } | null;
        onHover?: (point: { x: Date; y: number } | null) => void;
}

const CoinChart: React.FC<Props> = ({ data, loading, activePoint, onHover }) => {
        const [domain, setDomain] = useState<{ x: [Date, Date]; y: [number, number] } | undefined>();
        const [previousData, setPreviousData] = useState<{ x: Date; y: number }[]>([]);
        const screenWidth = Dimensions.get('window').width;
        const [localActivePoint, setLocalActivePoint] = useState<{x: Date; y: number} | null>(null);

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

        const handleChartTouch = (screenX: number, screenY: number) => {
                if (!chartData.length) return;
                
                // Calculate the relative position in the chart
                const chartWidth = screenWidth - 32; // Account for padding
                const touchPercent = (screenX - 16) / chartWidth;
                const index = Math.min(
                        Math.max(
                                Math.round(touchPercent * (chartData.length - 1)),
                                0
                        ),
                        chartData.length - 1
                );
                
                const point = chartData[index];
                
                console.log('Touch detected:', point);
                setLocalActivePoint(point);
                
                // Haptic feedback on iOS
                if (Platform.OS === 'ios') {
                        Haptics.selectionAsync();
                }
                
                // Call the parent's onHover function if provided
                if (onHover) {
                        onHover(point);
                }
        };

        if (chartData.length === 0) {
                return (
                        <View style={{
                                height: 250,
                                backgroundColor: '#191B1F',
                                justifyContent: 'center',
                                alignItems: 'center'
                        }}>
                                <ActivityIndicator size="large" color="#FF69B4" />
                        </View>
                );
        }

        // Use the prop value if provided, otherwise use local state
        const displayPoint = activePoint || localActivePoint;

        return (
                <View style={{
                        paddingHorizontal: 8,
                        backgroundColor: '#191B1F',
                        height: 250,
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
                        
                        {/* Simple tooltip label showing the selected price */}
                        {displayPoint && (
                                <View style={{
                                        position: 'absolute',
                                        top: 10,
                                        left: 10,
                                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                                        padding: 8,
                                        borderRadius: 4,
                                        zIndex: 2,
                                }}>
                                        <Text style={{ color: '#fff' }}>
                                                Price: ${displayPoint.y.toFixed(4)}
                                        </Text>
                                        <Text style={{ color: '#fff' }}>
                                                {displayPoint.x.toLocaleString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                })}
                                        </Text>
                                </View>
                        )}
                        
                        <View 
                                style={{ 
                                        flex: 1,
                                        position: 'relative',
                                }} 
                                onTouchStart={(e) => {
                                        const { locationX, locationY } = e.nativeEvent;
                                        handleChartTouch(locationX, locationY);
                                }}
                                onTouchMove={(e) => {
                                        const { locationX, locationY } = e.nativeEvent;
                                        handleChartTouch(locationX, locationY);
                                }}
                                onTouchEnd={() => {
                                        setLocalActivePoint(null);
                                        if (onHover) onHover(null);
                                }}
                        >
                                {Platform.OS === 'web' ? (
                                    <VictoryChart
                                        padding={{ left: 50, right: 50, top: 20, bottom: 40 }}
                                        domainPadding={{ x: [10, 10], y: [20, 20] }}
                                        width={screenWidth - 32}
                                        height={200}
                                        style={{
                                            parent: {
                                                backgroundColor: 'transparent'
                                            }
                                        }}
                                    >
                                        <VictoryAxis
                                            style={{
                                                axis: { stroke: 'transparent' },
                                                tickLabels: { fill: '#666', fontSize: 10 },
                                                grid: { stroke: 'transparent' }
                                            }}
                                            tickFormat={(x) => {
                                                const date = new Date(x);
                                                return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
                                            }}
                                        />
                                        <VictoryAxis
                                            dependentAxis
                                            style={{
                                                axis: { stroke: 'transparent' },
                                                tickLabels: { fill: '#666', fontSize: 10 },
                                                grid: { stroke: 'transparent' }
                                            }}
                                            tickFormat={(y) => `$${y.toFixed(4)}`}
                                        />
                                        <VictoryLine
                                            data={chartData}
                                            x="x"
                                            y="y"
                                            style={{
                                                data: {
                                                    stroke: "#FF69B4",
                                                    strokeWidth: 2
                                                }
                                            }}
                                            animate={{
                                                duration: 500,
                                                onLoad: { duration: 500 }
                                            }}
                                        />
                                    </VictoryChart>
                                ) : (
                                    <CartesianChart
                                        data={chartData}
                                        xKey={"x" as any}
                                        yKeys={["y"]}
                                        domainPadding={{ left: 10, right: 10, top: 20, bottom: 40 }}
                                        axisOptions={{
                                            lineColor: "transparent",
                                            labelColor: "#666",
                                            tickCount: { x: 5, y: 5 },
                                            formatXLabel: (value) => {
                                                const date = new Date(value as any);
                                                return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
                                            },
                                            formatYLabel: (value) => `$${(value as number).toFixed(4)}`
                                        }}
                                    >
                                        {({ points, chartBounds }) => (
                                            <Line
                                                points={points.y}
                                                color="#FF69B4"
                                                strokeWidth={2}
                                                curveType="monotoneX"
                                                animate={{ type: "timing", duration: 500 }}
                                            />
                                        )}
                                    </CartesianChart>
                                )}
                        </View>
                </View>
        );
};

export default CoinChart;
