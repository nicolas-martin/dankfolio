import React from "react";
import {
  CartesianChart,
  useAreaPath,
  useLinePath,
  useChartPressState,
} from "victory-native";
import {
  Circle,
  Group,
  Line,
  LinearGradient,
  Path,
  Skia,
  useFont,
  vec,
} from "@shopify/react-native-skia";
import { View } from "react-native";
import { format } from "date-fns";
import {
  useDerivedValue,
  runOnJS,
} from "react-native-reanimated";

interface CoinChartProps {
  data: { x: Date; y: number }[];
  loading?: boolean;
  activePoint?: { x: Date; y: number } | null;
  onHover?: (point: { x: Date; y: number } | null) => void;
  lineColor?: string;
  gradientColor?: string;
}

const initChartPressState = { x: 0, y: { y: 0 } };

export default function CoinChart({
  data,
  loading,
  onHover,
  lineColor = "#4ECDC4",
  gradientColor = "rgba(78, 205, 196, 0.2)"
}: CoinChartProps) {
  // console.log("[CoinChart] Initializing with data length:", data.length);

  const { state: chartPress, isActive: isPressActive } =
    useChartPressState(initChartPressState);

  // Debug log press state changes
  // React.useEffect(() => {
  //   console.log("[CoinChart] Press state:", { isPressActive });
  // }, [isPressActive]);

  // Memoize the hover callback
  const memoizedOnHover = React.useCallback((point: { x: Date; y: number } | null) => {
    // Removed problematic log
    // if (point) {
    //   console.log("[CoinChart] Hover update:", 
    //     { timestamp: point.x.toISOString(), value: point.y });
    // }
    onHover?.(point);
  }, [onHover]);

  // Track chart press state
  const pressValue = useDerivedValue(() => {
    'worklet';

    // Ensure the necessary shared values exist
    if (!chartPress.x.value || !chartPress.y.y?.value) { 
      return null;
    }

    // Access the primitive value using .value
    const xVal = chartPress.x.value.value;
    const yVal = chartPress.y.y.value.value; // Access the primitive value here

    if (typeof xVal !== 'number' || typeof yVal !== 'number') {
      return null;
    }

    return {
      timestamp: xVal,
      value: yVal,
    };
  }, [isPressActive, chartPress]); // Dependencies seem correct

  // Handle hover updates
  useDerivedValue(() => {
    'worklet';
    
    const currentValue = pressValue.value;
    
    // If press stops (isPressActive is directly the boolean) or value is null, signal hover end
    if (!isPressActive || !currentValue) { 
      runOnJS(memoizedOnHover)(null);
      return;
    }

    // Pass the valid point data via onHover
    runOnJS(memoizedOnHover)({
      x: new Date(currentValue.timestamp),
      y: currentValue.value
    });
  }, [pressValue, isPressActive]); // Dependencies seem correct

  if (loading || !data.length) {
    return null;
  }

  const chartData = data.map(point => {
    const transformed = {
      x: point.x.getTime(),
      y: point.y
    };
    // console.log("[CoinChart] Transforming data point:", transformed);
    return transformed;
  });

  return (
    <View style={{ height: 200 }}>
      <CartesianChart
        data={chartData}
        xKey="x"
        yKeys={["y"]}
        chartPressState={[chartPress]}
        axisOptions={{
          tickCount: 5,
          labelOffset: { x: 12, y: 8 },
          labelPosition: { x: "outset", y: "inset" },
          axisSide: { x: "bottom", y: "left" },
          formatXLabel: (timestamp: number) => 
            format(new Date(timestamp), "HH:mm"),
          formatYLabel: (v: number) => `$${v.toFixed(2)}`,
          lineColor: "rgba(255, 255, 255, 0.1)",
          labelColor: "rgba(255, 255, 255, 0.5)",
        }}
      >
        {({ chartBounds, points }) => (
          <>
            <PriceArea
              points={points.y}
              left={chartBounds.left}
              right={chartBounds.right}
              top={chartBounds.top}
              bottom={chartBounds.bottom}
              lineColor={lineColor}
              gradientColor={gradientColor}
            />
            {isPressActive && (
              <Group>
                <Line
                  p1={vec(chartPress.x.position.value, chartBounds.top)}
                  p2={vec(chartPress.x.position.value, chartBounds.bottom)}
                  color="rgba(255, 255, 255, 0.3)"
                  strokeWidth={1}
                />
                <Circle
                  cx={chartPress.x.position.value}
                  cy={chartPress.y.y.position.value}
                  r={8}
                  color={lineColor}
                />
                <Circle
                  cx={chartPress.x.position.value}
                  cy={chartPress.y.y.position.value}
                  r={5}
                  color="white"
                />
              </Group>
            )}
          </>
        )}
      </CartesianChart>
    </View>
  );
}

const PriceArea = ({
  points,
  left,
  right,
  top,
  bottom,
  lineColor,
  gradientColor,
}: {
  points: any;
  left: number;
  right: number;
  top: number;
  bottom: number;
  lineColor: string;
  gradientColor: string;
}) => {
  const { path: areaPath } = useAreaPath(points, bottom);
  const { path: linePath } = useLinePath(points);

  return (
    <Group>
      <Path path={areaPath} style="fill">
        <LinearGradient
          start={vec(0, 0)}
          end={vec(top, bottom)}
          colors={[lineColor, gradientColor]}
        />
      </Path>
      <Path
        path={linePath}
        style="stroke"
        strokeWidth={2}
        color={lineColor}
      />
    </Group>
  );
};
