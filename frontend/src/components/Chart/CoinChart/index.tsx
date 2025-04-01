import React from "react";
import {
  CartesianChart,
  useAreaPath,
  useChartPressState,
  useLinePath,
} from "victory-native";
import {
  Circle,
  Group,
  Line as SkiaLine,
  LinearGradient,
  Path,
  Skia,
  Text as SkiaText,
  useFont,
  vec,
} from "@shopify/react-native-skia";
import { View } from "react-native";
import { format } from "date-fns";
import {
  SharedValue,
  useDerivedValue,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

interface CoinChartProps {
  data: { x: Date; y: number }[];
  loading?: boolean;
  activePoint?: { x: Date; y: number } | null;
  onHover?: (point: { x: Date; y: number } | null) => void;
}

const initChartPressState = { x: 0, y: { y: 0 } };

export default function CoinChart({
  data,
  loading,
  onHover,
}: CoinChartProps) {
  const { state: chartPress, isActive: isPressActive } = 
    useChartPressState(initChartPressState);

  // Memoize the hover handler
  const handleHover = React.useCallback(() => {
    if (!onHover) return;
    
    if (isPressActive && chartPress.x.value && chartPress.y.y) {
      const timestamp = chartPress.x.value.value;
      const value = chartPress.y.y.value;
      
      if (timestamp && value) {
        onHover({
          x: new Date(timestamp),
          y: Number(value),
        });
      }
    } else {
      onHover(null);
    }
  }, [isPressActive, chartPress, onHover]);

  // Only run haptic feedback on press state change
  React.useEffect(() => {
    if (isPressActive) {
      Haptics.selectionAsync().catch(() => null);
    }
  }, [isPressActive]);

  // Handle hover updates separately
  React.useEffect(() => {
    handleHover();
  }, [isPressActive, handleHover]);

  if (loading || !data.length) {
    return null;
  }

  // Transform data for victory-native
  const chartData = data.map(point => ({
    x: point.x.getTime(),
    y: point.y
  }));

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
        renderOutside={({ chartBounds }) => (
          <>
            {isPressActive && (
              <PriceIndicator
                xPosition={chartPress.x.position}
                yPosition={chartPress.y.y.position}
                bottom={chartBounds.bottom}
                top={chartBounds.top}
                activeValue={chartPress.y.y.value}
              />
            )}
          </>
        )}
      >
        {({ chartBounds, points }) => (
          <PriceArea
            points={points.y}
            {...chartBounds}
          />
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
}: {
  points: any;
  left: number;
  right: number;
  top: number;
  bottom: number;
}) => {
  const { path: areaPath } = useAreaPath(points, bottom);
  const { path: linePath } = useLinePath(points);

  return (
    <Group>
      <Path path={areaPath} style="fill">
        <LinearGradient
          start={vec(0, 0)}
          end={vec(top, bottom)}
          colors={["#4ECDC4", "rgba(78, 205, 196, 0.2)"]}
        />
      </Path>
      <Path
        path={linePath}
        style="stroke"
        strokeWidth={2}
        color="#4ECDC4"
      />
    </Group>
  );
};

const PriceIndicator = ({
  xPosition,
  yPosition,
  bottom,
  top,
  activeValue,
}: {
  xPosition: SharedValue<number>;
  yPosition: SharedValue<number>;
  bottom: number;
  top: number;
  activeValue: SharedValue<number>;
}) => {
  const FONT_SIZE = 16;
  const start = useDerivedValue(() => vec(xPosition.value, bottom));
  const end = useDerivedValue(() => vec(xPosition.value, top));
  
  const displayValue = useDerivedValue(() => 
    `$${Number(activeValue.value).toFixed(2)}`
  );

  return (
    <>
      <SkiaLine
        p1={start}
        p2={end}
        color="rgba(255, 255, 255, 0.2)"
        strokeWidth={1}
      />
      <Circle
        cx={xPosition}
        cy={yPosition}
        r={6}
        color="#4ECDC4"
      />
      <Circle
        cx={xPosition}
        cy={yPosition}
        r={4}
        color="rgba(255, 255, 255, 0.25)"
      />
    </>
  );
};
