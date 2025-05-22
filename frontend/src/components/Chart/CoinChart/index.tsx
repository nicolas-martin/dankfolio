import React from "react";
import { CartesianChart, useChartPressState, Area, Line, } from "victory-native";
import { View } from "react-native";
import { format } from "date-fns";
import { useDerivedValue, runOnJS, type SharedValue, cancelAnimation, } from "react-native-reanimated";
import { useTheme, Text } from "react-native-paper";
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { CoinChartProps, PricePoint } from "./types";
import { useFont } from "@shopify/react-native-skia";
import { Circle, Line as SkiaLine, Text as SkiaText } from "@shopify/react-native-skia";
import { createStyles } from "./styles";
import inter from "@assets/fonts/inter-medium.ttf";

const initChartPressState = { x: 0, y: { y: 0 } };

// Active Value Indicator Component
const ActiveValueIndicator = ({ xPosition, yPosition, bottom, top, lineColor, indicatorColor,
}: {
	xPosition: SharedValue<number>;
	yPosition: SharedValue<number>;
	activeValue: SharedValue<number>;
	bottom: number;
	top: number;
	lineColor: string;
	indicatorColor: string;
}) => {
	return (
		<View testID="active-value-indicator">
			<SkiaLine p1={{ x: xPosition.value, y: bottom }} p2={{ x: xPosition.value, y: top + 30 }} color={lineColor} strokeWidth={1} />
			<Circle cx={xPosition} cy={yPosition} r={6} color={indicatorColor} />
			<Circle cx={xPosition} cy={yPosition} r={4} color="hsla(0, 0, 100%, 0.25)"
			/>
		</View>
	);
};

export default function CoinChart({
	data,
	loading,
	onHover,
}: CoinChartProps) {
	const theme = useTheme();
	const styles = createStyles(theme);
	const isMounted = React.useRef(true);
	const animations = React.useRef<SharedValue<any>[]>([]);
	const fontSize = 12;
	const font = useFont(inter, fontSize);

	useFocusEffect(
		React.useCallback(() => {
			return () => {
				animations.current.forEach(anim => {
					cancelAnimation(anim);
				});
			};
		}, [])
	);

	React.useEffect(() => {
		return () => {
			isMounted.current = false;
			animations.current.forEach(anim => {
				cancelAnimation(anim);
			});
		};
	}, []);

	const { state: chartPress, isActive: isPressActive } =
		useChartPressState(initChartPressState);

	// Minimal useDerivedValue for onHover updates
	useDerivedValue(() => {
		if (!onHover) return;
		if (!isPressActive) {
			runOnJS(onHover)(null);
			return;
		}
		const xVal = chartPress.x.value.value;
		const yVal = chartPress.y.y.value.value;
		if (typeof xVal === 'number' && typeof yVal === 'number') {
			runOnJS(onHover)({
				timestamp: xVal,
				price: yVal,
				value: yVal,
				x: xVal,
				y: yVal
			});
		}
	}, [isPressActive, chartPress, onHover]);

	React.useEffect(() => {
		let isSubscribed = true;
		if (isPressActive && isSubscribed) {
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
		}
		return () => {
			isSubscribed = false;
		};
	}, [isPressActive]);

	const chartData: PricePoint[] = React.useMemo(() => data.map(point => {
		const timestamp = new Date(point.timestamp).getTime();
		const value = typeof point.value === 'string' ? parseFloat(point.value) : point.value;
		return {
			timestamp,
			price: value,
			value,
			x: timestamp,
			y: value
		};
	}), [data]);

	if (loading || !data.length) {
		return (
			<View style={styles.loadingContainer}>
				<Text testID="loading-text" accessibilityLabel="loading chart">Loading Chart...</Text>
			</View>
		);
	}

	// Get the current press x/y value
	const activeX = chartPress.x.value.value;
	const activeY = chartPress.y.y.value.value;

	return (
		<View
			style={styles.chartContainer}
			accessibilityLabel="coin price chart"
			testID="coin-chart-container"
		>
			<CartesianChart
				data={chartData}
				xKey="x"
				yKeys={["y"]}
				domainPadding={{ top: 25 }}
				padding={0}
				chartPressState={[chartPress]}
				axisOptions={{
					font: font,
					tickCount: 0,
					labelOffset: { x: 0, y: 0 },
					labelPosition: { x: "outset", y: "inset" },
					axisSide: { x: "bottom", y: "left" },
					formatXLabel: (value) => format(new Date(value), "HH:mm"),
					formatYLabel: (value) => "",
					lineColor: {
						grid: { x: theme.colors.outlineVariant, y: theme.colors.outlineVariant },
						frame: theme.colors.outlineVariant
					},
					labelColor: theme.colors.onSurfaceVariant,
				}}
				renderOutside={({ chartBounds }) => {
					if (!isPressActive || typeof activeX !== 'number' || !font) return null;
					const label = format(new Date(activeX), "EEE MMM d 'at' h:mm a");
					// measure label width, center it around rawX, clamp to borders
					const rawX = chartPress.x.position.value;
					const textWidth = font.measureText(label).width;
					const half = textWidth / 2;
					const xPos = Math.min(
						Math.max(rawX - half, chartBounds.left),
						chartBounds.right - textWidth
					);
					return (
						<>
							<ActiveValueIndicator
								xPosition={chartPress.x.position}
								yPosition={chartPress.y.y.position}
								bottom={chartBounds.bottom}
								top={chartBounds.top}
								activeValue={chartPress.y.y.value}
								lineColor={theme.colors.outlineVariant}
								indicatorColor={theme.colors.primary}
							/>
							<SkiaText
								x={xPos}
								y={chartBounds.top + 20}
								text={label}
								font={font}
								color={theme.colors.onSurfaceVariant}
							/>
						</>
					);
				}}
			>
				{({ chartBounds, points }) => (
					<>
						<Area
							points={points.y}
							y0={chartBounds.bottom}
							color={theme.colors.primary}
							opacity={0.3}
						/>
						<Line
							points={points.y}
							color={theme.colors.primary}
							strokeWidth={2}
						/>
					</>
				)}
			</CartesianChart>
		</View>
	);
}
