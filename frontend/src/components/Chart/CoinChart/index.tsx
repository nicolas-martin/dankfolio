import React from "react";
import {
	CartesianChart,
	useChartPressState,
	Area,
	Line,
} from "victory-native";
import { View } from "react-native";
import { format } from "date-fns";
import {
	useDerivedValue,
	runOnJS,
	type SharedValue,
	cancelAnimation,
	useAnimatedStyle,
} from "react-native-reanimated";
import { useTheme, MD3Theme, Text } from "react-native-paper";
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { CoinChartProps, PricePoint } from "./types";
import { useFont } from "@shopify/react-native-skia";
import { Circle, Group, Line as SkiaLine } from "@shopify/react-native-skia";
import inter from "@assets/fonts/inter-medium.ttf";

const initChartPressState = { x: 0, y: { y: 0 } };

// Active Value Indicator Component
const ActiveValueIndicator = ({
	xPosition,
	yPosition,
	bottom,
	top,
	activeValue,
	lineColor,
	indicatorColor,
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
		<>
			<SkiaLine
				p1={{ x: xPosition.value, y: bottom }}
				p2={{ x: xPosition.value, y: top }}
				color={lineColor}
				strokeWidth={1}
			/>
			<Circle
				cx={xPosition}
				cy={yPosition}
				r={10}
				color={indicatorColor}
			/>
			<Circle
				cx={xPosition}
				cy={yPosition}
				r={8}
				color="hsla(0, 0, 100%, 0.25)"
			/>
		</>
	);
};

export default function CoinChart({
	data,
	loading,
	onHover,
}: CoinChartProps) {
	const theme = useTheme();
	const isMounted = React.useRef(true);
	const animations = React.useRef<SharedValue<any>[]>([]);
	const fontSize = 12;
	const font = useFont(inter, fontSize);

	// Use useFocusEffect for better navigation lifecycle handling
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

	const memoizedOnHover = React.useCallback((point: PricePoint | null) => {
		if (isMounted.current) {
			onHover?.(point);
		}
	}, [onHover]);

	const pressValue = useDerivedValue(() => {
		'worklet';
		if (!chartPress.x.value || !chartPress.y.y?.value || !isPressActive) {
			return null;
		}
		const xVal = chartPress.x.value.value;
		const yVal = chartPress.y.y.value.value;
		if (typeof xVal !== 'number' || typeof yVal !== 'number') {
			return null;
		}
		return {
			timestamp: xVal,
			value: yVal,
		};
	}, [isPressActive, chartPress]);

	const hoverEffect = useDerivedValue(() => {
		'worklet';
		const currentValue = pressValue.value;

		if (!isPressActive || !currentValue) {
			runOnJS(memoizedOnHover)(null);
			return;
		}

		const point: PricePoint = {
			timestamp: currentValue.timestamp,
			price: currentValue.value,
			value: currentValue.value,
			x: currentValue.timestamp,
			y: currentValue.value
		};
		runOnJS(memoizedOnHover)(point);
	}, [pressValue, isPressActive]);

	React.useEffect(() => {
		animations.current = [pressValue, hoverEffect];
	}, [pressValue, hoverEffect]);

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
			<View style={{ height: 250, justifyContent: 'center', alignItems: 'center' }}>
				<Text testID="loading-text" accessibilityLabel="loading chart">Loading Chart...</Text>
			</View>
		);
	}

	return (
		<View
			style={{ height: 250 }}
			accessibilityLabel="coin price chart"
			testID="coin-chart-container"
		>
			<CartesianChart
				data={chartData}
				xKey="x"
				yKeys={["y"]}
				padding={0}
				chartPressState={[chartPress]}
				axisOptions={{
					font: font,
					tickCount: 5,
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
				renderOutside={({ chartBounds }) => (
					<>
						{isPressActive && pressValue.value && (
							<ActiveValueIndicator
								xPosition={chartPress.x.position}
								yPosition={chartPress.y.y.position}
								bottom={chartBounds.bottom}
								top={chartBounds.top}
								activeValue={chartPress.y.y.value}
								lineColor={theme.colors.outlineVariant}
								indicatorColor={theme.colors.primary}
							/>
						)}
					</>
				)}
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
