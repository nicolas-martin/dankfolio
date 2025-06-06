import React, { useMemo } from 'react'; // Added useMemo
import { View, StyleSheet } from 'react-native';
import {
  Canvas,
  Path,
  Skia,
  Line,
  DashPathEffect,
  LinearGradient,
  vec,
} from '@shopify/react-native-skia';
import { useTheme } from 'react-native-paper';

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

  const theme = useTheme();

  // Memoize all derived data and Skia objects
  const {
    lineSegments,
    areaSegments,
    baselinePaint,
    baselineYPoint, // Renamed baselineY to avoid conflict in return object
  } = useMemo(() => {
    const startPrice = data[0].value;
    let maxDeviation = 0;
    for (const point of data) {
      const deviation = Math.abs(point.value - startPrice);
      if (deviation > maxDeviation) {
        maxDeviation = deviation;
      }
    }
    if (maxDeviation === 0) {
      maxDeviation = 0.001;
    }

    const yPadding = height * 0.1;
    const chartHeight = height - 2 * yPadding;
    const currentBaselineY = height / 2;

    const getX = (index: number) => (index / (data.length - 1)) * width;
    const getY = (value: number) => {
      const valueRelativeToDeviation = value - (startPrice - maxDeviation);
      let normalizedY = valueRelativeToDeviation / (2 * maxDeviation);
      if (2 * maxDeviation === 0) {
        normalizedY = 0.5;
      }
      return yPadding + chartHeight - normalizedY * chartHeight;
    };

    const currentBaselinePaint = Skia.Paint();
    currentBaselinePaint.setStrokeWidth(1);
    const baseColorVal = Skia.Color(theme.colors.onSurfaceVariant);
    currentBaselinePaint.setColor(
      Skia.Color(
        Skia.ColorRed(baseColorVal),
        Skia.ColorGreen(baseColorVal),
        Skia.ColorBlue(baseColorVal),
        0.5
      )
    );
    currentBaselinePaint.setStyle(Skia.PaintStyle.Stroke);
    currentBaselinePaint.setPathEffect(DashPathEffect.Make([4, 4], 0));

    const greenOpaque = Skia.Color('rgba(0, 255, 0, 0.3)');
    const greenTransparent = Skia.Color('rgba(0, 255, 0, 0)');
    const redOpaque = Skia.Color('rgba(255, 0, 0, 0.3)');
    const redTransparent = Skia.Color('rgba(255, 0, 0, 0)');

    const localLineSegments: Array<{ path: ReturnType<typeof Skia.Path.Make>; color: string }> = [];
    const localAreaSegments: Array<{
      path: ReturnType<typeof Skia.Path.Make>;
      gradientColors: [ReturnType<typeof Skia.Color>, ReturnType<typeof Skia.Color>];
      gradientStart: ReturnType<typeof vec>;
      gradientEnd: ReturnType<typeof vec>;
    }> = [];

    for (let i = 0; i < data.length - 1; i++) {
      const p1 = data[i];
      const p2 = data[i + 1];

      const x1 = getX(i);
      const y1 = getY(p1.value);
      const x2 = getX(i + 1);
      const y2 = getY(p2.value);

      const p1IsAboveOrOnBaseline = p1.value >= startPrice;
      const p2IsAboveOrOnBaseline = p2.value >= startPrice;

      let currentLineColor = p1IsAboveOrOnBaseline ? 'green' : 'red';
      let currentGradientColors = p1IsAboveOrOnBaseline
        ? [greenOpaque, greenTransparent]
        : [redOpaque, redTransparent];

      const addSegmentAndArea = (
        _x1: number, _y1: number,
        _x2: number, _y2: number,
        _lineColor: string,
        _gradientColors: [ReturnType<typeof Skia.Color>, ReturnType<typeof Skia.Color>]
      ) => {
        const linePath = Skia.Path.Make();
        linePath.moveTo(_x1, _y1);
        linePath.lineTo(_x2, _y2);
        localLineSegments.push({ path: linePath, color: _lineColor });

        if (Math.abs(_y1 - currentBaselineY) > 0.5 || Math.abs(_y2 - currentBaselineY) > 0.5) {
          const areaPath = Skia.Path.Make();
          areaPath.moveTo(_x1, _y1);
          areaPath.lineTo(_x2, _y2);
          areaPath.lineTo(_x2, currentBaselineY);
          areaPath.lineTo(_x1, currentBaselineY);
          areaPath.close();

          const isAbove = (_y1 <= currentBaselineY && _y2 <= currentBaselineY) ||
                          (_y1 <= currentBaselineY && _y2 > currentBaselineY && _y1 < _y2) ||
                          (_y2 <= currentBaselineY && _y1 > currentBaselineY && _y2 < _y1);

          localAreaSegments.push({
            path: areaPath,
            gradientColors: _gradientColors,
            gradientStart: vec((_x1 + _x2) / 2, isAbove ? Math.min(_y1, _y2) : Math.max(_y1, _y2)),
            gradientEnd: vec((_x1 + _x2) / 2, currentBaselineY),
          });
        }
      };

      if (p1IsAboveOrOnBaseline !== p2IsAboveOrOnBaseline) {
        const valueRange = p2.value - p1.value;
        let ratio = 0.5;
        if (valueRange !== 0) {
          ratio = (startPrice - p1.value) / valueRange;
        }
        const intersectX = x1 + ratio * (x2 - x1);

        addSegmentAndArea(x1, y1, intersectX, currentBaselineY, currentLineColor, currentGradientColors);

        currentLineColor = p2IsAboveOrOnBaseline ? 'green' : 'red';
        currentGradientColors = p2IsAboveOrOnBaseline
          ? [greenOpaque, greenTransparent]
          : [redOpaque, redTransparent];
        addSegmentAndArea(intersectX, currentBaselineY, x2, y2, currentLineColor, currentGradientColors);
      } else {
        addSegmentAndArea(x1, y1, x2, y2, currentLineColor, currentGradientColors);
      }
    }
    return { lineSegments: localLineSegments, areaSegments: localAreaSegments, baselinePaint: currentBaselinePaint, baselineYPoint: currentBaselineY };
  }, [data, width, height, theme]);

  return (
    <View style={[styles.container, { width, height }]}>
      <Canvas style={{ flex: 1 }}>
        {/* Render Area Fills First */}
        {areaSegments.map((segment, index) => (
          <Path key={`area-${index}`} path={segment.path} style="fill">
            <LinearGradient
              start={segment.gradientStart}
              end={segment.gradientEnd}
              colors={segment.gradientColors}
            />
          </Path>
        ))}
        {/* Render Line Segments */}
        {lineSegments.map((segment, index) => (
          <Path
            key={`line-${index}`}
            path={segment.path}
            color={segment.color}
            style="stroke"
            strokeWidth={2}
          />
        ))}
        {/* Render Baseline Last */}
        <Line
          p1={Skia.Point(0, baselineYPoint)}
          p2={Skia.Point(width, baselineYPoint)}
          paint={baselinePaint}
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
