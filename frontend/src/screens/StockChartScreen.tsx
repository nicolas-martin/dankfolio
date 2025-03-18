import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

interface Props {
    coinId: string;
}

const StockChartScreen: React.FC<Props> = ({ coinId }) => {
    const [data, setData] = useState({
        labels: [],
        datasets: [
            {
                data: [0]
            }
        ]
    });

    useEffect(() => {
        // TODO: Implement price history fetching
        // This is a placeholder for now
    }, [coinId]);

    return (
        <View style={styles.container}>
            <LineChart
                data={data}
                width={Dimensions.get('window').width - 16}
                height={220}
                chartConfig={{
                    backgroundColor: '#1E1E2E',
                    backgroundGradientFrom: '#1E1E2E',
                    backgroundGradientTo: '#1E1E2E',
                    decimalPlaces: 2,
                    color: (opacity = 1) => `rgba(159, 159, 213, ${opacity})`,
                    style: {
                        borderRadius: 16
                    }
                }}
                bezier
                style={styles.chart}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 8,
        backgroundColor: '#1E1E2E',
    },
    chart: {
        marginVertical: 8,
        borderRadius: 16
    }
});

export default StockChartScreen; 