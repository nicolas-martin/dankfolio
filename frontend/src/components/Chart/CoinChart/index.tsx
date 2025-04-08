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
} from "react-native-reanimated";
import { useTheme, MD3Theme, Text } from "react-native-paper";
import * as Haptics from 'expo-haptics';
import { CoinChartProps, PricePoint } from "./types";

const initChartPressState = { x: 0, y: { y: 0 } };

export default function CoinChart({
	data,
	loading,
	onHover,
}: CoinChartProps) {

	const theme = useTheme();

	const { state: chartPress, isActive: isPressActive } =
		useChartPressState(initChartPressState);

	// Memoize the hover callback
	const memoizedOnHover = React.useCallback((point: PricePoint | null) => {
		onHover?.(point);
	}, [onHover]);

	// Track chart press state
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

	// Handle hover updates (Removed faulty haptic logic from here)
	useDerivedValue(() => {
		'worklet';
		const currentValue = pressValue.value;

		if (!isPressActive || !currentValue) {
			runOnJS(memoizedOnHover)(null);
		} else {
			// Construct the full PricePoint object
			const point: PricePoint = {
				timestamp: currentValue.timestamp,
				price: currentValue.value,
				value: currentValue.value,
				x: currentValue.timestamp,
				y: currentValue.value
			};
			runOnJS(memoizedOnHover)(point);
		}
	}, [pressValue, isPressActive]);

	// --- UseEffect for Haptic Feedback ---
	React.useEffect(() => {
		if (isPressActive) {
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		}
	}, [isPressActive]);

	// Calculate chartData (safe even if data is empty)
	const chartData: PricePoint[] = data.map(point => {
		const timestamp = new Date(point.timestamp).getTime();
		const value = typeof point.value === 'string' ? parseFloat(point.value) : point.value;
		return {
			timestamp,
			price: value,
			value,
			x: timestamp,
			y: value
		};
	});

	// --- Conditional Return (Remove font check) ---
	if (loading || !data.length) {
		console.log("[CoinChart] Skipping render (loading or no data)");
		return (
			<View style={{ height: 250, justifyContent: 'center', alignItems: 'center' }}>
				<Text>Loading Chart...</Text>
			</View>
		);
	}
	// --- End of Conditional Return ---

	return (
		<View style={{ height: 250 }}>
			<CartesianChart
				data={chartData}
				xKey="x"
				yKeys={["y"]}
				padding={0}
				axisOptions={{
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
			>
				{({ chartBounds, points }) => {
					return (
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
					);
				}}
			</CartesianChart>
		</View>
	);
}
