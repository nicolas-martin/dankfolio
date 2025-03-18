import React, { useEffect } from "react";
import { View, Dimensions, Text } from "react-native";
import { VictoryArea, VictoryChart } from "victory-native";

interface Props {
        data: { x: string | Date; y: number }[];
        loading?: boolean;
}

const CoinChart: React.FC<Props> = ({ data }) => {
        const windowWidth = Dimensions.get('window').width;

        // Convert string dates to Date objects
        const formattedData = data.map(point => ({
                x: point.x instanceof Date ? point.x : new Date(point.x),
                y: point.y
        }));

        // Debug logs for incoming data
        useEffect(() => {
                console.log('CoinChart DATA LENGTH:', formattedData?.length || 0);
                console.log('CoinChart WINDOW WIDTH:', windowWidth);
                console.log('CoinChart FIRST POINT:', formattedData[0]);
        }, [formattedData, windowWidth]);

        // Use a simple domain calculation or just let Victory handle it automatically
        const getMinMaxY = () => {
                if (!formattedData || formattedData.length === 0) {
                        console.log('CoinChart: No data available for domain calculation');
                        return { min: 0, max: 1 };
                }
                const yValues = formattedData.map(d => d.y);
                const min = Math.min(...yValues) * 0.95;
                const max = Math.max(...yValues) * 1.05;
                console.log('CoinChart DOMAIN:', { min, max });
                return { min, max };
        };

        const { min, max } = getMinMaxY();

        // Debug fallback if no data
        if (!formattedData || formattedData.length === 0) {
                console.log('CoinChart RENDERING: Fallback due to no data');
                return (
                        <View style={{
                                width: '100%',
                                height: 250,
                                backgroundColor: '#191B1F',
                                justifyContent: 'center',
                                alignItems: 'center'
                        }}>
                                <Text style={{ color: '#FF69B4' }}>No chart data available</Text>
                        </View>
                );
        }

        console.log('CoinChart RENDERING: With data, length=' + formattedData.length);
        return (
                <View style={{
                        width: '100%',
                        height: 250,
                        backgroundColor: 'transparent'
                }}>
                        <VictoryChart
                                width={windowWidth}
                                height={250}
                                padding={{ top: 10, left: 10, right: 10, bottom: 10 }}
                                domain={{ y: [min, max] }}
                        >
                                <VictoryArea
                                        data={formattedData}
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

