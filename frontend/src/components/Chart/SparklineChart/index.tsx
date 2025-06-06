import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';

interface SparklineChartProps {
  data: Array<{ unixTime: number; value: number }>;
  width: number;
  height: number;
  isLoading?: boolean;
}

import { Text } from 'react-native';

const SparklineChart: React.FC<SparklineChartProps> = ({
  data,
  width,
  height,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <View style={[styles.container, styles.center, { width, height }]}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!data || data.length < 2) {
    return (
      <View style={[styles.container, styles.center, { width, height }]}>
        <Text>No data</Text>
      </View>
    );
  }

  const minPrice = Math.min(...data.map(p => p.value));
  const maxPrice = Math.max(...data.map(p => p.value));

  const firstPrice = data[0].value;
  const lastPrice = data[data.length - 1].value;
  const chartColor = lastPrice >= firstPrice ? 'green' : 'red';

  const path = Skia.Path.Make();
  data.forEach((point, index) => {
    const x = (index / (data.length - 1)) * width;
    let y = height / 2; // Default to middle if maxPrice equals minPrice
    if (maxPrice !== minPrice) {
      y = height - ((point.value - minPrice) / (maxPrice - minPrice)) * height;
    }
    if (index === 0) {
      path.moveTo(x, y);
    } else {
      path.lineTo(x, y);
    }
  });

  return (
    <View style={[styles.container, { width, height }]}>
      <Canvas style={{ flex: 1 }}>
        <Path
          path={path}
          color={chartColor}
          style="stroke"
          strokeWidth={2}
        />
      </Canvas>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Basic styling for the chart container
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  }
});

export default SparklineChart;
