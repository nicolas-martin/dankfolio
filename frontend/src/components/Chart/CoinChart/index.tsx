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
} from "react-native-reanimated";
import { useTheme, MD3Theme, Text } from "react-native-paper";
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { CoinChartProps, PricePoint } from "./types";
import { useFont } from "@shopify/react-native-skia";
import inter from "@assets/fonts/inter-medium.ttf";

const initChartPressState = { x: 0, y: { y: 0 } };

export default function CoinChart({
	data,
	loading,
	onHover,
}: CoinChartProps) {
	const theme = useTheme();
	const isMounted = React.useRef(true);
	const animations = React.useRef<SharedValue<any>[]>([]);
	const fontSize = 12;
	const font = useFont(inter, fontSize); // Use imported font object

	// Use useFocusEffect for better navigation lifecycle handling
	useFocusEffect(
		React.useCallback(() => {
			return () => {
				// Cleanup animations when screen loses focus
				animations.current.forEach(anim => {
					cancelAnimation(anim);
				});
			};
		}, [])
	);

	React.useEffect(() => {
		return () => {
			isMounted.current = false;
			// Cleanup all animations on unmount
			animations.current.forEach(anim => {
				cancelAnimation(anim);
			});
		};
	}, []);

	const { state: chartPress, isActive: isPressActive } =
		useChartPressState(initChartPressState);

	// Memoize the hover callback with isMounted check
	const memoizedOnHover = React.useCallback((point: PricePoint | null) => {
		if (isMounted.current) {
			onHover?.(point);
		}
	}, [onHover]);

	// Track chart press state with cleanup
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

	// Handle hover updates with cleanup
	const hoverEffect = useDerivedValue(() => {
		'worklet';
		const currentValue = pressValue.value;

		if (!isPressActive || !currentValue) {
			runOnJS(memoizedOnHover)(null);
			return;
		}

		// Construct the full PricePoint object
		const point: PricePoint = {
			timestamp: currentValue.timestamp,
			price: currentValue.value,
			value: currentValue.value,
			x: currentValue.timestamp,
			y: currentValue.value
		};
		runOnJS(memoizedOnHover)(point);
	}, [pressValue, isPressActive]);

	// Store animation references
	React.useEffect(() => {
		animations.current = [pressValue, hoverEffect];
	}, [pressValue, hoverEffect]);

	// --- UseEffect for Haptic Feedback with cleanup ---
	React.useEffect(() => {
		let isSubscribed = true;

		if (isPressActive && isSubscribed) {
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
		}

		return () => {
			isSubscribed = false;
		};
	}, [isPressActive]);

	// Calculate chartData (safe even if data is empty)
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
				<Text>Loading Chart...</Text>
			</View>
		);
	}

	return (
		<View style={{ height: 250 }}>
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
